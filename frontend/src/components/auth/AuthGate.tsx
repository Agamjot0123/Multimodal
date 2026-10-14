"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AUTH_URL, fetchMe, logout, type AuthUser } from "@/lib/auth";

const AuthContext = createContext<{ user: AuthUser | null; signOut: () => void }>({ user: null, signOut: () => {} });
export const useAuth = () => useContext(AuthContext);

/** Blocks the app until a valid session exists; redirects to /login otherwise. */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!AUTH_URL) return;
    fetchMe()
      .then((u) => (u ? (setUser(u), setReady(true)) : router.replace("/login")))
      .catch(() => router.replace("/login"));
  }, [router]);

  const signOut = () => {
    logout().finally(() => router.replace("/login"));
  };

  if (!AUTH_URL)
    return (
      <div className="grid h-dvh place-items-center bg-slate-950 p-6 text-center text-sm text-rose-400">
        NEXT_PUBLIC_AUTH_URL is not configured, so sign-in is unavailable.
      </div>
    );
  if (!ready) return <div className="grid h-dvh place-items-center bg-slate-950 text-sm text-slate-500">Loading…</div>;
  return <AuthContext.Provider value={{ user, signOut }}>{children}</AuthContext.Provider>;
}
