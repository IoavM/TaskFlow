import { AuthResponse, Task, TaskCreateInput, AIParsedPlan, User, UserPreferences } from '../types';

// ─── Custom Error ──────────────────────────────────────────────────
export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number = 500, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

// ─── Base URL ──────────────────────────────────────────────────────
const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && String(envUrl).trim() !== '') {
    return `${String(envUrl).trim().replace(/\/$/, '')}/api/v1`;
  }
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://127.0.0.1:8000/api/v1';
  }
  return '/api/v1';
};

const BASE_URL = getBaseUrl();

// ─── Idempotency Key Generator ─────────────────────────────────────
function generateIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
}

// ─── Retry / Cold-Start Configuration ──────────────────────────────
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  timeoutMs: number;
}

const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 8,
  baseDelayMs: 1500,
  maxDelayMs: 8000,
  timeoutMs: 50000,
};

const AUTH_RETRY: RetryConfig = {
  maxRetries: 10,
  baseDelayMs: 1500,
  maxDelayMs: 6000,
  timeoutMs: 60000,
};

const COLD_START_STATUSES = new Set([502, 503, 504]);

function isRetryable(error: any, status?: number): boolean {
  if (status !== undefined && COLD_START_STATUSES.has(status)) return true;
  if (error instanceof TypeError && /failed to fetch|network/i.test(error.message)) return true;
  if (status === 0) return true;
  return false;
}

// ─── Server Warmup Events ──────────────────────────────────────────
let _warmupActive = false;

function dispatchWarmupStart(): void {
  if (!_warmupActive) {
    _warmupActive = true;
    window.dispatchEvent(new CustomEvent('taskflow:server_waking', { detail: { active: true } }));
  }
}

function dispatchWarmupEnd(): void {
  if (_warmupActive) {
    _warmupActive = false;
    window.dispatchEvent(new CustomEvent('taskflow:server_waking', { detail: { active: false } }));
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core Resilient Request ────────────────────────────────────────
interface RequestOptions extends RequestInit {
  _retry?: Partial<RetryConfig>;
  _idempotent?: boolean;
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  const token = localStorage.getItem('taskflow_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Idempotency key for mutation safety
  const isMutation = options.method && options.method !== 'GET';
  const useIdempotency = options._idempotent !== false && isMutation;
  const idempotencyKey = useIdempotency ? generateIdempotencyKey() : null;
  if (idempotencyKey) {
    headers.set('X-Idempotency-Key', idempotencyKey);
  }

  // Build clean fetch options (strip custom fields)
  const { _retry: retryOverride, _idempotent: _, ...fetchOptions } = options;
  const retryConfig: RetryConfig = { ...DEFAULT_RETRY, ...retryOverride };
  const startTime = Date.now();
  let attempt = 0;
  let lastError: any = null;

  while (attempt <= retryConfig.maxRetries) {
    const elapsed = Date.now() - startTime;
    if (attempt > 0 && elapsed >= retryConfig.timeoutMs) {
      break;
    }

    try {
      const res = await fetch(url, { ...fetchOptions, headers });

      // Cold-start gateway error — retry
      if (COLD_START_STATUSES.has(res.status)) {
        if (attempt === 0) dispatchWarmupStart();
        attempt++;
        const backoff = Math.min(retryConfig.baseDelayMs * Math.pow(1.5, attempt - 1), retryConfig.maxDelayMs);
        await delay(backoff);
        continue;
      }

      // Server is alive
      dispatchWarmupEnd();

      if (!res.ok) {
        return handleHttpError(res);
      }

      if (res.status === 204) return {} as T;
      try {
        return await res.json();
      } catch {
        return {} as T;
      }
    } catch (err: any) {
      lastError = err;

      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        dispatchWarmupEnd();
        throw new ApiError('No tienes conexión a internet. Por favor verifica tu red.', 0);
      }

      if (isRetryable(err)) {
        if (attempt === 0) dispatchWarmupStart();
        attempt++;
        const backoff = Math.min(retryConfig.baseDelayMs * Math.pow(1.5, attempt - 1), retryConfig.maxDelayMs);
        await delay(backoff);
        continue;
      }

      dispatchWarmupEnd();
      throw new ApiError(
        'No se pudo conectar con el servidor de TaskFlow. Verifica tu conexión o intenta más tarde.',
        0
      );
    }
  }

  // Exhausted retries
  dispatchWarmupEnd();
  throw new ApiError(
    'El servidor de TaskFlow no respondió después de varios intentos. Por favor intenta de nuevo en unos minutos.',
    0,
    { lastError: lastError?.message }
  );
}

// ─── HTTP Error Translator ─────────────────────────────────────────
async function handleHttpError(res: Response): Promise<never> {
  let errorDetail = '';
  let errorData: any = null;

  try {
    errorData = await res.json();
    if (typeof errorData?.detail === 'string') {
      errorDetail = errorData.detail;
    } else if (Array.isArray(errorData?.detail)) {
      errorDetail = errorData.detail.map((e: any) => e.msg || JSON.stringify(e)).join(', ');
    } else if (errorData?.message) {
      errorDetail = errorData.message;
    }
  } catch {
    // Non-JSON response body
  }

  if (res.status === 401) {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('taskflow:session_expired'));
    }
    throw new ApiError(
      errorDetail || 'Tu sesión ha expirado o no estás autorizado. Por favor inicia sesión nuevamente.',
      401, errorData
    );
  }

  if (res.status === 403) {
    throw new ApiError(errorDetail || 'No tienes permisos para realizar esta acción.', 403, errorData);
  }

  if (res.status === 404) {
    throw new ApiError(errorDetail || 'El recurso solicitado no fue encontrado.', 404, errorData);
  }

  if (res.status === 409) {
    throw new ApiError(errorDetail || 'Ya existe un registro con esos datos.', 409, errorData);
  }

  if (res.status === 422) {
    throw new ApiError(errorDetail || 'Los datos enviados no tienen un formato válido.', 422, errorData);
  }

  if (res.status >= 500) {
    throw new ApiError(
      errorDetail || 'Error en el servidor. Por favor intenta de nuevo en unos momentos.',
      res.status, errorData
    );
  }

  throw new ApiError(errorDetail || `Error en la solicitud (${res.status})`, res.status, errorData);
}

// ─── Preemptive Server Warmup Ping ─────────────────────────────────
let _warmupPingSent = false;

export function preemptiveWarmup(): void {
  if (_warmupPingSent) return;
  _warmupPingSent = true;

  const healthUrl = BASE_URL.replace('/api/v1', '/health');
  fetch(healthUrl, { method: 'GET', mode: 'cors' }).catch(() => {
    // Silently ignore — the real retry logic will handle failures
  });
}

// ─── Public API ────────────────────────────────────────────────────
export const api = {
  // Authentication (uses longer retry budget for cold-start on login)
  async register(email: string, phone: string, password: string, first_name?: string, last_name?: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, phone, password, first_name, last_name }),
      _retry: AUTH_RETRY,
    });
    localStorage.setItem('taskflow_token', data.access_token);
    localStorage.setItem('taskflow_user', JSON.stringify(data.user));
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      _retry: AUTH_RETRY,
    });
    localStorage.setItem('taskflow_token', data.access_token);
    localStorage.setItem('taskflow_user', JSON.stringify(data.user));
    return data;
  },

  async loginWithGoogle(credential: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/google', {
      method: 'POST',
      body: JSON.stringify({ credential }),
      _retry: AUTH_RETRY,
    });
    localStorage.setItem('taskflow_token', data.access_token);
    localStorage.setItem('taskflow_user', JSON.stringify(data.user));
    return data;
  },

  logout(): void {
    localStorage.removeItem('taskflow_token');
    localStorage.removeItem('taskflow_user');
  },

  getCurrentStoredUser(): User | null {
    const raw = localStorage.getItem('taskflow_user');
    return raw ? JSON.parse(raw) : null;
  },

  // Tasks
  async getTasks(): Promise<Task[]> {
    return request<Task[]>('/tasks');
  },

  async createTask(task: TaskCreateInput): Promise<Task> {
    return request<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async updateTask(taskId: number, task: Partial<TaskCreateInput>): Promise<Task> {
    return request<Task>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(task),
    });
  },

  async toggleBlockStatus(blockId: number, completed: boolean, color?: string): Promise<void> {
    return request<void>(`/tasks/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed, ...(color ? { color } : {}) }),
    });
  },

  async updateWorkBlockColor(blockId: number, color: string): Promise<void> {
    return request<void>(`/tasks/blocks/${blockId}`, {
      method: 'PATCH',
      body: JSON.stringify({ color }),
    });
  },

  async deleteTask(taskId: number): Promise<void> {
    return request<void>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },

  // AI Assistant
  async parseTaskWithAI(prompt: string): Promise<AIParsedPlan> {
    return request<AIParsedPlan>('/ai/parse-task', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  async createTaskDirectlyWithAI(prompt: string): Promise<Task | Task[]> {
    return request<Task | Task[]>('/tasks/ai-create', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },

  // User Preferences (Spotify & Cloud Sync)
  async getUserPreferences(): Promise<UserPreferences> {
    return request<UserPreferences>('/user/preferences');
  },

  async updateUserPreferences(data: UserPreferences): Promise<UserPreferences> {
    return request<UserPreferences>('/user/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  },
};
