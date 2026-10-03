"use client";

import { useEffect, useRef } from "react";
import { useViewer, type ViewerTarget } from "@/context/ViewerContext";
import { formatTimestamp } from "@/lib/time";

/**
 * Right pane. Switches between video and document views based on the active target.
 * Day 3: swap <BasicVideo> for the Video.js component (same props).
 * Day 5: swap <PdfPlaceholder> for the react-pdf viewer with highlight overlays.
 */
export function ViewerPanel() {
  const { target } = useViewer();

  if (!target) {
    return (
      <div className="grid flex-1 place-items-center p-8 text-center text-sm text-slate-500">
        <div>
          <p className="text-base text-slate-300">No source open</p>
          <p className="mt-1">Click a citation in the chat or pick a file on the left.</p>
        </div>
      </div>
    );
  }

  const { source } = target;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-slate-800 px-4 text-sm">
        <span className="truncate font-medium">{source.title}</span>
        <TargetBadge target={target} />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        {source.kind === "video" ? <BasicVideo target={target} /> : <PdfPlaceholder target={target} />}
      </div>
    </div>
  );
}

function TargetBadge({ target }: { target: ViewerTarget }) {
  const parts: string[] = [];
  if (target.page_number != null) parts.push(`${target.source.kind === "pdf" ? "Pg" : "Slide"} ${target.page_number}`);
  if (target.start_time != null)
    parts.push(formatTimestamp(target.start_time) + (target.end_time != null ? `–${formatTimestamp(target.end_time)}` : ""));
  if (!parts.length) return null;
  return <span className="shrink-0 rounded bg-indigo-500/15 px-2 py-0.5 text-xs text-indigo-300">{parts.join(" · ")}</span>;
}

/** Minimal HTML5 player with seek-on-citation. Re-seeks when `nonce` changes. */
function BasicVideo({ target }: { target: ViewerTarget }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || target.start_time == null) return;
    const seek = () => {
      v.currentTime = target.start_time!;
      v.play().catch(() => {}); // autoplay may be blocked; seeking still works
    };
    if (v.readyState >= 1) seek();
    else v.addEventListener("loadedmetadata", seek, { once: true });
    return () => v.removeEventListener("loadedmetadata", seek);
  }, [target.nonce, target.start_time]);

  return (
    <video
      ref={ref}
      src={target.source.url}
      controls
      preload="metadata"
      className="aspect-video w-full rounded-lg bg-black"
    />
  );
}

function PdfPlaceholder({ target }: { target: ViewerTarget }) {
  return (
    <div className="mx-auto grid aspect-[3/4] max-w-md place-items-center rounded-lg border border-dashed border-slate-700 text-center text-sm text-slate-400">
      <div>
        <p className="text-4xl font-bold text-slate-200">{target.page_number ?? 1}</p>
        <p className="mt-1">{target.source.file_name}</p>
        <p className="mt-4 text-xs text-slate-500">react-pdf viewer + highlights land on Day 5</p>
      </div>
    </div>
  );
}
