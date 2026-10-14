"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_URL, fetchMe, logout, type AuthUser } from "@/lib/auth";

const AuthContext = createContext<{ user: AuthUser | null; signOut: () => void }>({ user: null, signOut: () => {} });
export const useAuth = () => useContext(AuthContext);

/** Redirects to /login when the Express session is missing. No-op when NEXT_PUBLIC_AUTH_URL is unset. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(!AUTH_URL);

  useEffect(() => {
    if (!AUTH_URL) return;
    fetchMe()
      .then((u) => (u ? (setUser(u), setReady(true)) : router.replace("/login")))
      .catch(() => router.replace("/login"));
  }, [router]);

  const signOut = () => {
    logout().finally(() => router.replace("/login"));
  };

  if (!ready) return <div className="grid h-dvh place-items-center bg-slate-950 text-sm text-slate-500">Loading…</div>;
  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>;
}
