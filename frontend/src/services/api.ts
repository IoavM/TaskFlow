import { AuthResponse, Task, TaskCreateInput, AIParsedPlan, User } from '../types';

const BASE_URL = '/api/v1';

function getAuthHeader(): HeadersInit {
  const token = localStorage.getItem('taskflow_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const api = {
  // Authentication
  async register(email: string, phone: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, phone, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error en el registro' }));
      throw new Error(err.detail || 'Error en el registro');
    }
    const data: AuthResponse = await res.json();
    localStorage.setItem('taskflow_token', data.access_token);
    localStorage.setItem('taskflow_user', JSON.stringify(data.user));
    return data;
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Correo o contraseña incorrectos' }));
      throw new Error(err.detail || 'Correo o contraseña incorrectos');
    }
    const data: AuthResponse = await res.json();
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
    const res = await fetch(`${BASE_URL}/tasks`, {
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al cargar las tareas');
    return res.json();
  },

  async createTask(task: TaskCreateInput): Promise<Task> {
    const res = await fetch(`${BASE_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al crear la tarea' }));
      throw new Error(err.detail || 'Error al crear la tarea');
    }
    return res.json();
  },

  async updateTask(taskId: number, task: Partial<TaskCreateInput>): Promise<Task> {
    const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify(task),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al actualizar la tarea' }));
      throw new Error(err.detail || 'Error al actualizar la tarea');
    }
    return res.json();
  },

  async toggleBlockStatus(blockId: number, completed: boolean): Promise<void> {
    const res = await fetch(`${BASE_URL}/tasks/blocks/${blockId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ completed }),
    });
    if (!res.ok) throw new Error('Error al actualizar el bloque de trabajo');
  },

  async deleteTask(taskId: number): Promise<void> {
    const res = await fetch(`${BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { ...getAuthHeader() },
    });
    if (!res.ok) throw new Error('Error al eliminar la tarea');
  },

  // Groq AI Assistant
  async parseTaskWithAI(prompt: string): Promise<AIParsedPlan> {
    const res = await fetch(`${BASE_URL}/ai/parse-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) throw new Error('Error al procesar la sugerencia con Groq IA');
    return res.json();
  },

  async createTaskDirectlyWithAI(prompt: string): Promise<Task> {
    const res = await fetch(`${BASE_URL}/tasks/ai-create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeader(),
      },
      body: JSON.stringify({ prompt }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Error al crear la tarea con IA' }));
      throw new Error(err.detail || 'Error al crear la tarea con IA');
    }
    return res.json();
  },
};
