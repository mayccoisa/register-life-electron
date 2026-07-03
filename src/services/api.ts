/** URL base da API externa do Register Life */
export const API_BASE_URL = 'https://ctiapcnaouliddfomnzu.supabase.co/functions/v1/external-api';

const API_KEY_STORAGE = 'register-life-api-key';
export const API_KEY_LAST_UPDATED = 'register-life-api-key-last-updated';

/**
 * Chave API para teste - cole aqui a chave para uso inicial.
 * Outros usuários devem configurar em Configurações.
 */
export const TEST_API_KEY = '';

export function getApiKey(): string {
  return localStorage.getItem(API_KEY_STORAGE) || TEST_API_KEY || '';
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
  if (key) {
    localStorage.setItem(API_KEY_LAST_UPDATED, new Date().toISOString());
  } else {
    localStorage.removeItem(API_KEY_LAST_UPDATED);
  }
}

export function getApiKeyLastUpdated(): string | null {
  return localStorage.getItem(API_KEY_LAST_UPDATED);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

// =============================================================
// SESSÃO (JWT) — autenticação por email/senha via /auth/login.
// A API Key continua aceita como fallback legado, mas não é mais
// necessária: o login guarda token + refresh_token e renova sozinho.
// =============================================================

const TOKEN_STORAGE = 'register-life-token';
const REFRESH_TOKEN_STORAGE = 'register-life-refresh-token';
const TOKEN_EXPIRES_AT_STORAGE = 'register-life-token-expires-at';

interface SessionData {
  token: string;
  refresh_token: string;
  expires_at?: string;
}

export function setSession(session: SessionData): void {
  localStorage.setItem(TOKEN_STORAGE, session.token);
  localStorage.setItem(REFRESH_TOKEN_STORAGE, session.refresh_token);
  if (session.expires_at) {
    localStorage.setItem(TOKEN_EXPIRES_AT_STORAGE, session.expires_at);
  } else {
    localStorage.removeItem(TOKEN_EXPIRES_AT_STORAGE);
  }
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_STORAGE);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE);
  localStorage.removeItem(TOKEN_EXPIRES_AT_STORAGE);
}

export function hasSession(): boolean {
  return !!localStorage.getItem(REFRESH_TOKEN_STORAGE) || !!localStorage.getItem(TOKEN_STORAGE);
}

// Single-flight: refresh tokens do Supabase são de uso único, então duas
// renovações concorrentes invalidariam a sessão.
let refreshInFlight: Promise<string | null> | null = null;

async function refreshSession(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_STORAGE);
      if (!refreshToken) return null;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.token) {
          clearSession();
          return null;
        }
        setSession({
          token: data.token,
          refresh_token: data.refresh_token,
          expires_at: data.expires_at,
        });
        return data.token as string;
      } catch {
        // Falha de rede: mantém a sessão para tentar de novo depois.
        return null;
      }
    })().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/** Token válido, renovando com 60s de folga antes de expirar. */
async function getAccessToken(): Promise<string | null> {
  const token = localStorage.getItem(TOKEN_STORAGE);
  if (!token) return hasSession() ? refreshSession() : null;
  const expiresAt = localStorage.getItem(TOKEN_EXPIRES_AT_STORAGE);
  if (expiresAt) {
    const msLeft = new Date(expiresAt).getTime() - Date.now();
    if (Number.isFinite(msLeft) && msLeft < 60_000) {
      return (await refreshSession()) ?? token;
    }
  }
  return token;
}

async function buildAuthHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  if (token) return { Authorization: `Bearer ${token}` };
  const apiKey = getApiKey();
  if (apiKey) return { 'X-API-Key': apiKey };
  throw new Error('Sessão expirada. Faça login novamente.');
}

export interface User {
  id: string;
  name: string;
  email: string;
  token: string;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed';
  created_at?: string;
  createdAt?: string;
  updated_at?: string;
  updatedAt?: string;
}

export interface Pomodoro {
  id: string;
  task_id?: string;
  duration: number;
  completed_at?: string;
  status?: string;
  created_at?: string;
  createdAt?: string;
}

const STATUS_MAP: Record<string, Task['status']> = {
  pending: 'pending',
  todo: 'pending',
  to_do: 'pending',
  'to do': 'pending',
  'in-progress': 'in-progress',
  in_progress: 'in-progress',
  'em andamento': 'in-progress',
  completed: 'completed',
  done: 'completed',
  concluida: 'completed',
  concluído: 'completed',
};

function normalizeStatus(value: unknown): Task['status'] {
  if (!value) return 'pending';
  const key = String(value).toLowerCase().trim();
  return STATUS_MAP[key] ?? 'pending';
}

function normalizeTask(raw: Record<string, unknown>): Task {
  return {
    id: String(raw.id ?? raw.task_id ?? ''),
    title: String(raw.title ?? raw.name ?? ''),
    description: raw.description ? String(raw.description) : undefined,
    status: normalizeStatus(raw.status),
    created_at: raw.created_at ? String(raw.created_at) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : raw.created_at ? String(raw.created_at) : undefined,
    updated_at: raw.updated_at ? String(raw.updated_at) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : raw.updated_at ? String(raw.updated_at) : undefined,
  };
}

function normalizePomodoro(raw: Record<string, unknown>): Pomodoro {
  return {
    id: String(raw.id ?? ''),
    task_id: raw.task_id ? String(raw.task_id) : undefined,
    duration: Number(raw.duration ?? 25),
    completed_at: raw.completed_at ? String(raw.completed_at) : undefined,
    status: raw.status ? String(raw.status) : undefined,
    created_at: raw.created_at ? String(raw.created_at) : undefined,
    createdAt: raw.createdAt ? String(raw.createdAt) : raw.created_at ? String(raw.created_at) : undefined,
  };
}

function extractArray(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.data)) return obj.data;
    if (Array.isArray(obj.tasks)) return obj.tasks;
    if (Array.isArray(obj.items)) return obj.items;
    if (Array.isArray(obj.records)) return obj.records;
    if (obj.data && typeof obj.data === 'object' && Array.isArray((obj.data as Record<string, unknown>).tasks)) {
      return (obj.data as Record<string, unknown>).tasks as unknown[];
    }
    if (obj.id) return [obj];
  }
  return [];
}

function extractData<T>(response: unknown, normalizer: (r: Record<string, unknown>) => T): T[] {
  const arr = extractArray(response);
  return arr
    .filter((r): r is Record<string, unknown> => r !== null && typeof r === 'object')
    .map((r) => normalizer(r));
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit & { normalizer?: (r: Record<string, unknown>) => T } = {}
): Promise<T | T[]> {
  const { normalizer, ...fetchOptions } = options;
  const url = `${API_BASE_URL}${endpoint}`;

  const doFetch = async () =>
    fetch(url, {
      ...fetchOptions,
      headers: {
        'Content-Type': 'application/json',
        ...(await buildAuthHeaders()),
        ...fetchOptions.headers,
      },
    });

  let res = await doFetch();

  // Token rejeitado (expirado/revogado): renova e tenta uma única vez.
  if (res.status === 401 && hasSession()) {
    const renewed = await refreshSession();
    if (renewed) res = await doFetch();
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Erro ${res.status}: ${res.statusText}`);
  }

  let data: unknown;
  try {
    const text = await res.text();
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error('Resposta da API inválida');
  }

  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.success === false && obj.error) {
      throw new Error(String(obj.error));
    }
  }

  if (normalizer) return extractData(data, normalizer) as T | T[];
  return data as T | T[];
}

export const api = {
  /** Login real na API (email/senha → JWT + refresh_token persistidos). */
  login: async (email: string, password: string): Promise<User> => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.token) {
      throw new Error(data?.error ? String(data.error) : 'Email ou senha inválidos');
    }
    setSession({
      token: data.token,
      refresh_token: data.refresh_token,
      expires_at: data.expires_at,
    });
    const userEmail: string = data.user?.email ?? email;
    return {
      id: data.user?.id ? String(data.user.id) : '',
      name: userEmail.split('@')[0],
      email: userEmail,
      token: data.token,
    };
  },

  /** Encerra a sessão na API (best effort) e limpa os tokens locais. */
  logout: async (): Promise<void> => {
    const token = localStorage.getItem(TOKEN_STORAGE);
    if (token) {
      fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    clearSession();
  },

  // Tasks
  getTasks: async (): Promise<Task[]> => {
    const result = await fetchApi<Task>('/tasks', { normalizer: normalizeTask });
    const arr = Array.isArray(result) ? result : result ? [result] : [];
    return arr.filter((t) => t.id && t.title);
  },

  getTask: async (id: string): Promise<Task | null> => {
    const tasks = await api.getTasks();
    return tasks.find((t) => t.id === id) ?? null;
  },

  createTask: async (task: Omit<Task, 'id'>): Promise<Task> => {
    const body = {
      title: task.title,
      description: task.description ?? '',
      status: task.status ?? 'pending',
    };
    const result = await fetchApi<Task>('/tasks', {
      method: 'POST',
      body: JSON.stringify(body),
      normalizer: normalizeTask,
    });
    const arr = Array.isArray(result) ? result : [result];
    if (arr.length === 0) throw new Error('Resposta inválida ao criar tarefa');
    return arr[0];
  },

  updateTask: async (id: string, updates: Partial<Task>): Promise<Task> => {
    const body = {
      title: updates.title,
      description: updates.description,
      status: updates.status,
    };
    const result = await fetchApi<Task>(`/tasks/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      normalizer: normalizeTask,
    });
    const arr = Array.isArray(result) ? result : [result];
    if (arr.length === 0) throw new Error('Resposta inválida ao atualizar tarefa');
    return arr[0];
  },

  deleteTask: async (id: string): Promise<void> => {
    await fetchApi(`/tasks/${id}`, { method: 'DELETE' });
  },

  // Pomodoros
  getPomodoros: async (): Promise<Pomodoro[]> => {
    const result = await fetchApi<Pomodoro>('/pomodoros', { normalizer: normalizePomodoro });
    return Array.isArray(result) ? result : [result];
  },

  getPomodoro: async (id: string): Promise<Pomodoro | null> => {
    const list = await api.getPomodoros();
    return list.find((p) => p.id === id) ?? null;
  },

  createPomodoro: async (pomodoro: Omit<Pomodoro, 'id'>): Promise<Pomodoro> => {
    const body = {
      task_id: pomodoro.task_id ?? null,
      duration: pomodoro.duration ?? 25,
      completed_at: pomodoro.completed_at ?? null,
      status: pomodoro.status ?? 'completed',
    };
    const result = await fetchApi<Pomodoro>('/pomodoros', {
      method: 'POST',
      body: JSON.stringify(body),
      normalizer: normalizePomodoro,
    });
    const arr = Array.isArray(result) ? result : [result];
    if (arr.length === 0) throw new Error('Resposta inválida ao criar pomodoro');
    return arr[0];
  },

  updatePomodoro: async (id: string, updates: Partial<Pomodoro>): Promise<Pomodoro> => {
    const body = {
      task_id: updates.task_id,
      duration: updates.duration,
      completed_at: updates.completed_at,
      status: updates.status,
    };
    const result = await fetchApi<Pomodoro>(`/pomodoros/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      normalizer: normalizePomodoro,
    });
    const arr = Array.isArray(result) ? result : [result];
    if (arr.length === 0) throw new Error('Resposta inválida ao atualizar pomodoro');
    return arr[0];
  },

  deletePomodoro: async (id: string): Promise<void> => {
    await fetchApi(`/pomodoros/${id}`, { method: 'DELETE' });
  },
};
