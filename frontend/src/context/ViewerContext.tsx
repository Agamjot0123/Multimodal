"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { Citation, CourseSource } from "@/types/contract";

/** What the viewer pane should currently show. `nonce` forces re-seek on repeat clicks. */
export interface ViewerTarget {
  source: CourseSource;
  page_number: number | null;
  start_time: number | null;
  end_time: number | null;
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
        nonce: Date.now(),
      });
      return true;
    },
    [sources],
  );

  const openSource = useCallback((source: CourseSource) => {
    setTarget({ source, page_number: null, start_time: null, end_time: null, nonce: Date.now() });
  }, []);

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
