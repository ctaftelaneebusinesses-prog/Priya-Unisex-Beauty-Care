import type { AuthUser } from "@/types";
import { apiFetch, getAuthToken, setAuthToken, setUnauthorizedHandler } from "./storage";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const SESSION_USER_KEY = "priya-salon:session-user";

export const authService = {
  async login(email: string, password: string): Promise<AuthUser> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json();
    if (!response.ok) {
      throw new Error(body?.error ?? "Invalid email or password.");
    }
    setAuthToken(body.token);
    localStorage.setItem(SESSION_USER_KEY, JSON.stringify(body.user));
    return body.user as AuthUser;
  },

  logout(): void {
    setAuthToken(null);
    localStorage.removeItem(SESSION_USER_KEY);
  },

  getSession(): AuthUser | null {
    if (!getAuthToken()) return null;
    try {
      const raw = localStorage.getItem(SESSION_USER_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },
};

// If any API call comes back 401 (expired/invalid token), drop the local
// session so the UI falls back to the login screen on next render.
setUnauthorizedHandler(() => {
  authService.logout();
  if (!window.location.pathname.startsWith("/login")) {
    window.location.href = "/login";
  }
});

/**
 * Owner-only login/account management. Adding an Employee record does NOT by
 * itself create a way for that person to sign in — these functions are what
 * actually grant, reset, or revoke access to the app.
 */
export const userAccountService = {
  listUsers: () => apiFetch<AuthUser[]>("/auth/users"),

  createLogin: (input: { name: string; email: string; password: string; employeeId: string }) =>
    apiFetch<AuthUser>("/auth/users", { method: "POST", body: JSON.stringify(input) }),

  resetPassword: (userId: string, password: string) =>
    apiFetch<{ ok: true }>(`/auth/users/${userId}/password`, { method: "PATCH", body: JSON.stringify({ password }) }),

  revokeLogin: (userId: string) => apiFetch<void>(`/auth/users/${userId}`, { method: "DELETE" }),
};
