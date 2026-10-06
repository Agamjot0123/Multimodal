"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useViewer, type ViewerTarget } from "@/context/ViewerContext";
import { formatTimestamp } from "@/lib/time";
import { buildDeepLink } from "@/lib/deeplink";
import type { VideoPlayerHandle } from "@/components/viewer/VideoPlayer";

// Video.js touches `window` at import time, so load it client-side only.
const VideoPlayer = dynamic(() => import("@/components/viewer/VideoPlayer").then((m) => m.VideoPlayer), {
  ssr: false,
  loading: () => <div className="aspect-video w-full animate-pulse rounded-lg bg-slate-900" />,
});

// pdf.js needs browser APIs (canvas, workers), so the same applies.
const PdfViewer = dynamic(() => import("@/components/viewer/PdfViewer").then((m) => m.PdfViewer), {
  ssr: false,
  loading: () => <div className="mx-auto aspect-[3/4] w-full max-w-2xl animate-pulse rounded-md bg-slate-900" />,
});

/** Right pane. Switches between video and document views based on the active target. */
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
        {source.kind === "video" ? (
          <VideoView target={target} />
        ) : (
          <PdfViewer src={source.url} page={target.page_number} bboxes={target.bboxes} nonce={target.nonce} />
        )}
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

/** Video.js player + controls for replaying the cited clip and sharing a timestamped link. */
function VideoView({ target }: { target: ViewerTarget }) {
  const player = useRef<VideoPlayerHandle>(null);
  const [copied, setCopied] = useState(false);
  const { start_time, end_time } = target;

  async function copyLink() {
    const t = Math.floor(player.current?.getCurrentTime() ?? start_time ?? 0);
    const url = buildDeepLink(
      { file_name: target.source.file_name, page_number: null, start_time: t, end_time: null, bboxes: [] },
      window.location.origin + window.location.pathname,
    );
    await navigator.clipboard.writeText(url).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const btn = "rounded-md px-2.5 py-1 text-xs ring-1 ring-slate-700 hover:bg-slate-800";
  return (
    <div className="space-y-3">
      <VideoPlayer ref={player} src={target.source.url} start={start_time} end={end_time} nonce={target.nonce} />
      <div className="flex flex-wrap gap-2">
        {start_time != null && (
          <button className={btn} onClick={() => player.current?.playSegment(start_time, end_time)}>
            ↺ Replay cited clip
          </button>
        )}
        <button className={btn} onClick={copyLink}>
          {copied ? "✓ Link copied" : "🔗 Copy link at current time"}
        </button>
      </div>
    </div>
  );
}
