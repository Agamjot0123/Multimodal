"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import type { ViewerTarget } from "@/context/ViewerContext";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

/** react-pdf canvas viewer: jumps to the cited page and overlays highlight boxes (normalized coords). */
export function PdfViewer({ target }: { target: ViewerTarget }) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(target.page_number ?? 1);
  const [width, setWidth] = useState(520);
  const [failed, setFailed] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Jump to the cited page on each citation click / source switch.
  useEffect(() => {
    setPage(target.page_number ?? 1);
    setFailed(false);
  }, [target.nonce, target.page_number, target.source.url]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setWidth(Math.max(240, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const clamp = (n: number) => Math.min(Math.max(1, n), numPages || n);
  const showHighlights = page === target.page_number;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <button onClick={() => setPage((p) => clamp(p - 1))} disabled={page <= 1} className="rounded bg-slate-800 px-2 py-1 disabled:opacity-40">‹</button>
          <span className="tabular-nums">{page} / {numPages || "–"}</span>
          <button onClick={() => setPage((p) => clamp(p + 1))} disabled={!!numPages && page >= numPages} className="rounded bg-slate-800 px-2 py-1 disabled:opacity-40">›</button>
        </div>
        {target.highlights.length > 0 && showHighlights && <span className="text-amber-300">● cited passage highlighted</span>}
      </div>

      <div ref={wrapRef} className="w-full">
        {failed ? (
          <div className="grid aspect-[3/4] place-items-center rounded-lg border border-dashed border-slate-700 p-6 text-center text-sm text-slate-400">
            <div>
              <p className="text-slate-200">Couldn’t load {target.source.file_name}</p>
              <p className="mt-1 text-xs">Add the file under <code>public/media/</code>.</p>
            </div>
          </div>
        ) : (
          <Document
            file={target.source.url}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            onLoadError={() => setFailed(true)}
            loading={<p className="p-6 text-sm text-slate-500">Loading document…</p>}
          >
            <div className="relative overflow-hidden rounded-lg bg-white shadow">
              <Page pageNumber={page} width={width} />
              {showHighlights &&
                target.highlights.map((h, i) => (
                  <div
                    key={`${target.nonce}-${i}`}
                    className="pointer-events-none absolute animate-pulse rounded-sm bg-yellow-300/40 ring-2 ring-yellow-400/70"
                    style={{ left: `${h.x * 100}%`, top: `${h.y * 100}%`, width: `${h.w * 100}%`, height: `${h.h * 100}%` }}
                  />
                ))}
            </div>
          </Document>
        )}
      </div>
    </div>
  );
}
