"use client";

import { useEffect, useState } from "react";
import { SourcesPanel } from "@/components/sources/SourcesPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { ViewerPanel } from "@/components/viewer/ViewerPanel";
import { useViewer } from "@/context/ViewerContext";

type Pane = "sources" | "chat" | "viewer";

/**
 * 3-pane layout: Sources | Chat | Viewer.
 * ≥lg: all three side by side. <lg: one pane at a time with a tab bar;
 * clicking a citation auto-switches to the Viewer.
 */
export function AppShell() {
  const [pane, setPane] = useState<Pane>("chat");
  const { target } = useViewer();

  useEffect(() => {
    if (target) setPane("viewer");
  }, [target]);

  const show = (p: Pane) => (pane === p ? "flex" : "hidden");

  return (
    <div className="flex h-dvh flex-col bg-slate-950 text-slate-100">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-800 px-4">
        <div className="flex items-center gap-2">
          <span className="grid size-7 place-items-center rounded-md bg-indigo-500 text-sm font-bold">S</span>
          <span className="font-semibold tracking-tight">StudyMate</span>
          <span className="hidden text-xs text-slate-500 sm:inline">CS101 · Backpropagation</span>
        </div>
        <span className="text-xs text-slate-500">Demo student</span>
      </header>

      <main className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className={`${show("sources")} min-h-0 flex-col border-slate-800 lg:flex lg:border-r`}>
          <SourcesPanel />
        </section>
        <section className={`${show("chat")} min-h-0 flex-col border-slate-800 lg:flex lg:border-r`}>
          <ChatPanel />
        </section>
        <section className={`${show("viewer")} min-h-0 flex-col lg:flex`}>
          <ViewerPanel />
        </section>
      </main>

      <nav className="grid shrink-0 grid-cols-3 border-t border-slate-800 lg:hidden">
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
