"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { setToken } from "@/lib/auth";

/** Landing page after Google sign-in: the auth server puts the token in the URL fragment. */
export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const token = new URLSearchParams(window.location.hash.slice(1)).get("token");
    if (token) {
      setToken(token);
      window.history.replaceState(null, "", window.location.pathname); // drop the token from the address bar
      router.replace("/");
    } else {
      router.replace("/login?error=1");
    }
  }, [router]);

  return <div className="grid h-dvh place-items-center bg-slate-950 text-sm text-slate-500">Signing you in…</div>;
}
