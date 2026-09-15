import type { AuthUser } from "@/types";
import { getAuthToken, setAuthToken, setUnauthorizedHandler } from "./storage";

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
