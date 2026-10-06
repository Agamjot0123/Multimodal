"use client";

import { useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import type { BBox } from "@/types/contract";

// pdf.js parses/renders off the main thread; bundle the worker that matches react-pdf's pdfjs-dist.
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

interface Props {
  src: string;
  /** Cited page (1-based); the viewer jumps here on every citation click. */
  page: number | null;
  /** Normalized regions on `page` to highlight. */
  bboxes: BBox[];
  /** Bump to re-jump/re-pulse even when page/bboxes are unchanged (repeat citation clicks). */
  nonce: number;
}

const ZOOMS = [0.5, 0.75, 1, 1.25, 1.5, 2, 3];

/**
 * Single-page react-pdf canvas viewer for slides/textbooks.
 * Highlights are absolutely positioned in % of the page box, so they track the canvas at any zoom.
 */
export function PdfViewer({ src, page, bboxes, nonce }: Props) {
  const fitRef = useRef<HTMLDivElement>(null);
  const firstMarkRef = useRef<HTMLDivElement>(null);
  const [fitWidth, setFitWidth] = useState(0);
  const [zoomIdx, setZoomIdx] = useState(ZOOMS.indexOf(1));
  const [numPages, setNumPages] = useState(0);
  const [current, setCurrent] = useState(page ?? 1);
  const [renderedPage, setRenderedPage] = useState<number | null>(null);

  // New citation → go to its page.
  useEffect(() => setCurrent(page ?? 1), [src, page, nonce]);

  // Fit-to-width: track the container so the canvas re-renders crisply on resize.
  useEffect(() => {
    const el = fitRef.current!;
    const ro = new ResizeObserver(([e]) => setFitWidth(Math.floor(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const last = numPages || Infinity;
  const go = (n: number) => setCurrent(Math.min(Math.max(1, n), last));
  const showMarks = page !== null && current === page && bboxes.length > 0;

  // Once the cited page has painted, bring the first highlight into view.
  useEffect(() => {
    if (showMarks && renderedPage === page) firstMarkRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [renderedPage, nonce]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowLeft" || e.key === "PageUp") go(current - 1);
    else if (e.key === "ArrowRight" || e.key === "PageDown") go(current + 1);
    else return;
    e.preventDefault();
  }

  const btn = "rounded-md px-2 py-1 text-xs ring-1 ring-slate-700 hover:bg-slate-800 disabled:opacity-40 disabled:hover:bg-transparent";
  const zoom = ZOOMS[zoomIdx];

  return (
    <div className="space-y-3 outline-none" tabIndex={0} onKeyDown={onKeyDown} aria-label="Document viewer">
      {/* Negative offsets cancel ViewerPanel's p-4 so the bar pins flush to the pane top. */}
      <div className="sticky -top-4 z-10 -mx-4 -mt-4 flex flex-wrap items-center gap-2 bg-slate-950/90 px-4 pt-4 pb-2 backdrop-blur">
        <button className={btn} onClick={() => go(current - 1)} disabled={current <= 1} aria-label="Previous page">
          ‹
        </button>
        <span className="text-xs tabular-nums text-slate-400">
          <input
            key={current}
            defaultValue={current}
            onBlur={(e) => go(Number(e.target.value) || current)}
            onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
            className="w-10 rounded bg-slate-900 px-1 py-0.5 text-center text-slate-200 ring-1 ring-slate-700"
            aria-label="Page number"
          />{" "}
          / {numPages || "…"}
        </span>
        <button className={btn} onClick={() => go(current + 1)} disabled={current >= last} aria-label="Next page">
          ›
        </button>

        <span className="mx-1 h-4 w-px bg-slate-800" />
        <button className={btn} onClick={() => setZoomIdx((i) => Math.max(0, i - 1))} disabled={zoomIdx === 0} aria-label="Zoom out">
          −
        </button>
        <button className={`${btn} w-14 tabular-nums`} onClick={() => setZoomIdx(ZOOMS.indexOf(1))} title="Fit width">
          {Math.round(zoom * 100)}%
        </button>
        <button
          className={btn}
          onClick={() => setZoomIdx((i) => Math.min(ZOOMS.length - 1, i + 1))}
          disabled={zoomIdx === ZOOMS.length - 1}
          aria-label="Zoom in"
        >
          +
        </button>

        {page !== null && current !== page && (
          <button className={`${btn} ml-auto text-yellow-300 ring-yellow-500/40`} onClick={() => go(page)}>
            ↩ Back to cited page {page}
          </button>
        )}
      </div>

      <div ref={fitRef} className="overflow-x-auto">
        <Document
          file={src}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<PageSkeleton />}
          error={<p className="p-6 text-center text-sm text-red-400">Couldn’t load {src.split("/").pop()}.</p>}
        >
          {fitWidth > 0 && (
            <Page
              pageNumber={Math.min(current, last)}
              width={fitWidth * zoom}
              renderAnnotationLayer={false}
              onRenderSuccess={() => setRenderedPage(current)}
              loading={<PageSkeleton />}
              className="mx-auto w-fit overflow-hidden rounded-md shadow-lg shadow-black/40"
            >
              {showMarks && (
                // Keyed by nonce so the pulse replays on repeat clicks.
                <div key={nonce} className="pointer-events-none absolute inset-0 z-[3]" aria-hidden>
                  {bboxes.map((b, i) => (
                    <div
                      key={i}
                      ref={i === 0 ? firstMarkRef : undefined}
                      className="sm-highlight"
                      style={{
                        left: `${b.x0 * 100}%`,
                        top: `${b.y0 * 100}%`,
                        width: `${(b.x1 - b.x0) * 100}%`,
                        height: `${(b.y1 - b.y0) * 100}%`,
                      }}
                    />
                  ))}
                </div>
              )}
            </Page>
          )}
        </Document>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return <div className="mx-auto aspect-[3/4] w-full max-w-2xl animate-pulse rounded-md bg-slate-900" />;
}
