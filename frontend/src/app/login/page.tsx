"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { AUTH_URL } from "@/lib/auth";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.5 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
      <path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function Source({ kind, label }: { kind: "video" | "slides" | "book"; label: string }) {
  const icon = { video: "▶", slides: "▤", book: "❡" }[kind];
  return (
    <span className="mx-0.5 inline-flex items-center gap-1 rounded-md border border-amber-200/25 bg-amber-200/10 px-1.5 py-0.5 align-baseline text-[0.8em] font-medium text-amber-100">
      <span aria-hidden className="text-[0.85em] opacity-70">{icon}</span>
      {label}
    </span>
  );
}

/** A sample of what the tutor produces: an answer where every claim carries its source. */
function SampleAnswer() {
  return (
    <figure className="w-full max-w-md rotate-[1.5deg] rounded-2xl border border-slate-700/70 bg-slate-900/80 p-5 shadow-2xl shadow-black/50 backdrop-blur">
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-sm bg-indigo-500 px-3.5 py-2 text-sm text-white">
        Why do gradients vanish in deep networks?
      </div>
      <div className="font-reading mt-4 text-[1.05rem] leading-relaxed text-slate-200">
        Backpropagation multiplies one derivative per layer, so small values shrink exponentially with depth
        <Source kind="video" label="Lecture 7 · 12:34" />. Sigmoid is the worst case because its slope never
        exceeds 0.25 <Source kind="slides" label="Slide 14" />. ReLU keeps the slope at 1 for positive inputs,
        which is why it became the default <Source kind="book" label="Ch. 6 · p. 192" />.
      </div>
      <figcaption className="mt-4 border-t border-slate-800 pt-3 text-xs text-slate-500">
        Select a source to jump to that moment in the video, slide or page.
      </figcaption>
    </figure>
  );
}

function SignIn() {
  const failed = useSearchParams().get("error");
  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 place-items-center rounded-lg bg-indigo-500 text-base font-bold text-white">S</span>
        <span className="text-lg font-semibold tracking-tight">StudyMate</span>
      </div>

      <h1 className={"mt-10 text-5xl font-bold leading-[1.02] tracking-tighter text-slate-50 sm:text-6xl"}>
        Answers that show their sources.
      </h1>
      <p className="mt-5 max-w-xs text-base leading-relaxed text-slate-400">
        Ask about your course and get an answer linked to the exact lecture timestamp, slide or textbook page.
      </p>

      {failed && (
        <p role="alert" className="mt-6 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          We couldn&apos;t sign you in with Google. Try again.
        </p>
      )}

      {AUTH_URL ? (
        <a
          href={`${AUTH_URL}/auth/google`}
          className="group mt-8 flex items-center justify-center gap-3 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-slate-900 shadow-lg shadow-black/30 transition hover:bg-amber-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
        >
          <GoogleMark />
          Continue with Google
        </a>
      ) : (
        <p className="mt-8 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          Google sign-in is off. Set NEXT_PUBLIC_AUTH_URL to turn it on.
        </p>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="relative grid min-h-dvh overflow-hidden bg-slate-950 text-slate-100 lg:grid-cols-2">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, #334155 1px, transparent 0)",
          backgroundSize: "28px 28px",
          maskImage: "radial-gradient(ellipse at 70% 40%, black, transparent 70%)",
        }}
      />
      <section className="relative flex items-center justify-center px-6 py-16 lg:px-16">
        <Suspense>
          <SignIn />
        </Suspense>
      </section>
      <section className="relative flex items-center justify-center px-6 pb-16 lg:border-l lg:border-slate-800/80 lg:bg-slate-900/30 lg:pb-0">
        <SampleAnswer />
      </section>
    </main>
  );
}
