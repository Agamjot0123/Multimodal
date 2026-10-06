"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { BBox, Citation, CourseSource } from "@/types/contract";
import { buildDeepLink, parseDeepLink } from "@/lib/deeplink";

/** What the viewer pane should currently show. `nonce` forces re-seek on repeat clicks. */
export interface ViewerTarget {
  source: CourseSource;
  page_number: number | null;
  start_time: number | null;
  end_time: number | null;
  bboxes: BBox[]; // highlight regions on page_number
  nonce: number;
}

interface ViewerState {
  sources: CourseSource[];
  target: ViewerTarget | null;
  openCitation: (c: Citation) => boolean; // false if unresolvable
  openSource: (s: CourseSource) => void;
}

const Ctx = createContext<ViewerState | null>(null);

export function ViewerProvider({
  sources,
  children,
}: {
  sources: CourseSource[];
  children: React.ReactNode;
}) {
  const [target, setTarget] = useState<ViewerTarget | null>(null);

  const openCitation = useCallback(
    (c: Citation) => {
      const source = resolveSource(c, sources);
      if (!source) return false;
      setTarget({
        source,
        page_number: c.page_number,
        start_time: c.start_time,
        end_time: c.end_time,
        bboxes: c.bboxes,
        nonce: Date.now(),
      });
      return true;
    },
    [sources],
  );

  const openSource = useCallback((source: CourseSource) => {
    setTarget({ source, page_number: null, start_time: null, end_time: null, bboxes: [], nonce: Date.now() });
  }, []);

  // Deep link in: open ?src=…&t=… on first load.
  useEffect(() => {
    const link = parseDeepLink(window.location.search);
    const source = link && sources.find((s) => s.file_name === link.file_name);
    if (!link || !source) return;
    setTarget({ ...link, source, nonce: Date.now() });
  }, [sources]);

  // Deep link out: mirror the open target in the URL (replace, so Back still leaves the app).
  useEffect(() => {
    if (!target) return;
    const { source, page_number, start_time, end_time, bboxes } = target;
    const url = buildDeepLink(
      { file_name: source.file_name, page_number, start_time, end_time, bboxes },
      window.location.pathname,
    );
    window.history.replaceState(null, "", url);
  }, [target]);

  const value = useMemo(
    () => ({ sources, target, openCitation, openSource }),
    [sources, target, openCitation, openSource],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useViewer() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useViewer must be used inside <ViewerProvider>");
  return v;
}

/**
 * Map a citation to a course file.
 * Exact file_name wins (backend-validated citations); otherwise use hints:
 * a timestamp → video, "slide" → slides, else → pdf/textbook.
 */
export function resolveSource(c: Citation, sources: CourseSource[]): CourseSource | null {
  const exact = sources.find((s) => s.file_name === c.file_name);
  if (exact) return exact;

  const hint = c.file_name.toLowerCase();
  const byHint = sources.find(
    (s) => hint && (s.file_name.toLowerCase().includes(hint) || s.title.toLowerCase().includes(hint)),
  );
  if (byHint) return byHint;

  if (c.start_time !== null) return sources.find((s) => s.kind === "video") ?? null;
  if (/slide/.test(hint)) return sources.find((s) => s.kind === "slides") ?? null;
  return sources.find((s) => s.kind === "pdf") ?? sources.find((s) => s.kind === "slides") ?? null;
}
