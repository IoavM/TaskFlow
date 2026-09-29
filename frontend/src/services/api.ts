import { AuthResponse, Task, TaskCreateInput, AIParsedPlan, User } from '../types';

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

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = new Headers(options.headers || {});

  const token = localStorage.getItem('taskflow_token');
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let res: Response;
  try {
    res = await fetch(url, { ...options, headers });
  } catch (err: any) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ApiError('No tienes conexión a internet. Por favor verifica tu red.', 0);
    }
    throw new ApiError(
      'No se pudo conectar con el servidor de TaskFlow. Verifica tu conexión o intenta más tarde.',
      0
    );
  }

  if (!res.ok) {
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
        401,
        errorData
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
        res.status,
        errorData
      );
    }

    throw new ApiError(errorDetail || `Error en la solicitud (${res.status})`, res.status, errorData);
  }

  if (res.status === 204) {
    return {} as T;
  }

  try {
    return await res.json();
  } catch {
    return {} as T;
  }
}

export const api = {
  // Authentication
  async register(email: string, phone: string, password: string, first_name?: string, last_name?: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, phone, password, first_name, last_name }),
    });
    localStorage.setItem('taskflow_token', data.access_token);
    localStorage.setItem('taskflow_user', JSON.stringify(data.user));
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const data = await request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
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

  async createTaskDirectlyWithAI(prompt: string): Promise<Task> {
    return request<Task>('/tasks/ai-create', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    });
  },
};
