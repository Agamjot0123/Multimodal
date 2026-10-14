"use client";

import dynamic from "next/dynamic";
import { useViewer, type ViewerTarget } from "@/context/ViewerContext";
import { formatTimestamp } from "@/lib/time";

// Both libs touch browser APIs, so load them client-side only.
const VideoPlayer = dynamic(() => import("./VideoPlayer").then((m) => m.VideoPlayer), { ssr: false });
const PdfViewer = dynamic(() => import("./PdfViewer").then((m) => m.PdfViewer), { ssr: false });

/** Right pane. Video.js for video sources, react-pdf (with highlight overlays) for slides/PDFs. */
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
          <VideoPlayer target={target} />
        ) : source.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={source.url} alt={source.title} className="mx-auto max-h-full max-w-full rounded-lg" />
        ) : (
          <PdfViewer target={target} />
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
