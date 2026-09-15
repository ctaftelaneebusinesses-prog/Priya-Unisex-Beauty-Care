/**
 * Thin REST client for the Priya Salon backend (see /server).
 *
 * This is a drop-in replacement for the earlier localStorage-backed version —
 * every function keeps the exact same name and signature, so no page,
 * component, or feature service built on top of `store` needed to change.
 */

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "priya-salon:token";

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void): void {
  onUnauthorized = handler;
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string | null): void {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (response.status === 401) {
    setAuthToken(null);
    onUnauthorized?.();
    throw new Error("Session expired. Please sign in again.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? JSON.parse(text) : undefined;

  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed with status ${response.status}`);
  }

  return body as T;
}

export const store = {
  async getAll<T>(collection: string): Promise<T[]> {
    return apiFetch<T[]>(`/collections/${collection}`);
  },

  async getById<T extends { id: string }>(collection: string, id: string): Promise<T | undefined> {
    try {
      return await apiFetch<T>(`/collections/${collection}/${id}`);
    } catch {
      return undefined;
    }
  },

  async create<T extends { id: string }>(collection: string, item: T): Promise<T> {
    return apiFetch<T>(`/collections/${collection}`, {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  async update<T extends { id: string }>(collection: string, id: string, patch: Partial<T>): Promise<T> {
    return apiFetch<T>(`/collections/${collection}/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  },

  async remove(collection: string, id: string): Promise<void> {
    await apiFetch<void>(`/collections/${collection}/${id}`, { method: "DELETE" });
  },

  async replaceAll<T>(collection: string, items: T[]): Promise<void> {
    await apiFetch<void>(`/collections/${collection}`, {
      method: "PUT",
      body: JSON.stringify(items),
    });
  },
};

export interface SingletonStore<T> {
  get(): Promise<T>;
  set(value: T): Promise<T>;
}

export function createSingletonStore<T>(name: string, defaultValue: T): SingletonStore<T> {
  return {
    async get() {
      const value = await apiFetch<T | null>(`/singletons/${name}`);
      return value ?? defaultValue;
    },
    async set(value: T) {
      return apiFetch<T>(`/singletons/${name}`, { method: "PUT", body: JSON.stringify(value) });
    },
  };
}
