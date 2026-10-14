export const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

const TOKEN_KEY = "studymate.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {}
}

/** `Authorization` header for backend calls; empty when signed out. */
export function authHeaders(): Record<string, string> {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export async function fetchMe(): Promise<AuthUser | null> {
  if (!getToken()) return null;
  const res = await fetch(`${AUTH_URL}/auth/me`, { headers: authHeaders() });
  if (res.status === 401) clearToken(); // expired or invalid
  return res.ok ? res.json() : null;
}

/** Tokens are stateless, so signing out just forgets the token. */
export async function logout(): Promise<void> {
  clearToken();
}
