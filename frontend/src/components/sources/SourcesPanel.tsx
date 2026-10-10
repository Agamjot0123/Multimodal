"use client";

import { useViewer } from "@/context/ViewerContext";
import { formatTimestamp } from "@/lib/time";
import { MasteryMini } from "@/components/mastery/MasteryMini";
import type { SourceKind } from "@/types/contract";

const ICON: Record<SourceKind, string> = { video: "▶", slides: "▤", pdf: "❐" };

export function SourcesPanel() {
  const { sources, target, openSource } = useViewer();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <h2 className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Course materials
      </h2>
      <ul className="space-y-1 overflow-y-auto px-2">
        {sources.map((s) => {
          const active = target?.source.file_name === s.file_name;
          return (
            <li key={s.file_name}>
              <button
                onClick={() => openSource(s)}
                className={`flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left transition ${
                  active ? "bg-indigo-500/15 ring-1 ring-indigo-500/40" : "hover:bg-slate-800/60"
                }`}
              >
                <span className="mt-0.5 text-slate-400">{ICON[s.kind]}</span>
                <span className="min-w-0">
                  <span className="block truncate text-sm">{s.title}</span>
                  <span className="text-xs text-slate-500">
                    {s.kind === "video" && s.duration ? formatTimestamp(s.duration) : `${s.pages ?? "?"} pages`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto border-t border-slate-800 p-4">
        <MasteryMini />
      </div>
    </div>
  );
}
