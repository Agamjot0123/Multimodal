"use client";

import { useEffect, useState } from "react";
import { SourcesPanel } from "@/components/sources/SourcesPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { QuizPanel } from "@/components/quiz/QuizPanel";
import { ViewerPanel } from "@/components/viewer/ViewerPanel";
import { HomeView } from "@/components/home/HomeView";
import { useAuth } from "@/components/auth/AuthGate";
import { useViewer } from "@/context/ViewerContext";

type Pane = "sources" | "chat" | "viewer";
type View = "home" | "workspace";

/**
 * 3-pane layout: Sources | Chat | Viewer.
 * ≥lg: all three side by side. <lg: one pane at a time with a tab bar;
 * clicking a citation auto-switches to the Viewer.
 */
export function AppShell() {
  const [view, setView] = useState<View>("home");
  const [pane, setPane] = useState<Pane>("chat");
  const [mode, setMode] = useState<"chat" | "quiz">("chat");
  const { target } = useViewer();
  const { user, signOut } = useAuth();

  useEffect(() => {
    if (target) {
      setPane("viewer");
      setView("workspace");
    }
  }, [target]);

  const start = (m: "chat" | "quiz") => {
    setMode(m);
    setView("workspace");
  };

  const show = (p: Pane) => (pane === p ? "flex" : "hidden");

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="" className="size-7 rounded-md" />
          <span className="font-[family-name:var(--font-wordmark)] text-lg font-bold tracking-tight">AnchorLearn</span>
        </div>
        <nav aria-label="View" className="flex gap-1 rounded-full border border-slate-800 bg-slate-900/70 p-0.5 text-xs">
          {(["home", "workspace"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              aria-current={view === v ? "page" : undefined}
              className={`rounded-full px-3.5 py-1 capitalize transition ${view === v ? "bg-indigo-500 text-white" : "text-slate-400 hover:text-white"}`}
            >
              {v}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-xs text-slate-500">
          <span>{user?.name}</span>
          {user && (
            <button onClick={signOut} className="rounded px-2 py-1 text-slate-400 hover:bg-slate-800 hover:text-white">
              Sign out
            </button>
          )}
        </div>
      </header>

      {view === "home" && <HomeView onStart={start} />}

      <main className={`${view === "home" ? "hidden" : "grid"} min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1.15fr)]`}>
        <section className={`${show("sources")} min-h-0 flex-col border-slate-800 lg:flex lg:border-r`}>
          <SourcesPanel />
        </section>
        <section className={`${show("chat")} min-h-0 flex-col border-slate-800 lg:flex lg:border-r`}>
          <div className="flex h-10 shrink-0 gap-1 border-b border-slate-800 px-3 pt-1.5 text-sm">
            {(["chat", "quiz"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`rounded-t-md px-3 capitalize ${mode === m ? "bg-slate-800 text-white" : "text-slate-400"}`}>
                {m}
              </button>
            ))}
          </div>
          {/* Keep ChatPanel mounted so history and in-flight streams survive tab switches. */}
          <div className={`${mode === "chat" ? "flex" : "hidden"} min-h-0 flex-1 flex-col`}>
            <ChatPanel />
          </div>
          {mode === "quiz" && <QuizPanel />}
        </section>
        <section className={`${show("viewer")} min-h-0 flex-col lg:flex`}>
          <ViewerPanel />
        </section>
      </main>

      <nav className={`${view === "home" ? "hidden" : "grid"} shrink-0 grid-cols-3 border-t border-slate-800 lg:hidden`}>
        {(["sources", "chat", "viewer"] as Pane[]).map((p) => (
          <button
            key={p}
            onClick={() => setPane(p)}
            className={`py-3 text-sm capitalize ${pane === p ? "text-indigo-400" : "text-slate-400"}`}
          >
            {p}
          </button>
        ))}
      </nav>
    </div>
  );
}
