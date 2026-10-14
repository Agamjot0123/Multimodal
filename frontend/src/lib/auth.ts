export const AUTH_URL = process.env.NEXT_PUBLIC_AUTH_URL ?? "";

export interface AuthUser {
  id: string;
  name: string;
  email?: string;
  picture?: string;
}

export async function fetchMe(): Promise<AuthUser | null> {
  const res = await fetch(`${AUTH_URL}/auth/me`, { credentials: "include" });
  return res.ok ? res.json() : null;
}

export async function logout(): Promise<void> {
  await fetch(`${AUTH_URL}/auth/logout`, { method: "POST", credentials: "include" });
}
