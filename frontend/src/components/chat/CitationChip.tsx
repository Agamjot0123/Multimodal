"use client";

import { useViewer } from "@/context/ViewerContext";
import type { Citation } from "@/types/contract";

/** Inline clickable citation. Unresolved citations render muted (guardrail visibility). */
export function CitationChip({ label, citation }: { label: string; citation: Citation | null }) {
  const { openCitation } = useViewer();
  const isVideo = citation?.start_time != null;

  if (!citation) {
    return (
      <span title="Could not resolve this source" className="mx-0.5 rounded bg-slate-800 px-1.5 py-0.5 text-xs text-slate-500 line-through">
        {label.replace(/^Source:\s*/i, "")}
      </span>
    );
  }

  return (
    <button
      onClick={() => openCitation(citation)}
      title={`Open ${citation.file_name || "source"}`}
      className="mx-0.5 inline-flex items-center gap-1 rounded-md bg-indigo-500/15 px-1.5 py-0.5 align-baseline text-xs font-medium text-indigo-300 ring-1 ring-indigo-500/30 transition hover:bg-indigo-500/30"
    >
      <span aria-hidden>{isVideo ? "▶" : "❐"}</span>
      {label.replace(/^Source:\s*/i, "")}
    </button>
  );
}
