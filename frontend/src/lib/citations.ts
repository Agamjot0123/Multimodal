import type { Citation } from "@/types/contract";
import { parseTimestamp } from "@/lib/time";

export type Segment =
  | { kind: "text"; text: string }
  | { kind: "citation"; label: string; citation: Citation | null };

const BRACKET = /\[([^\[\]]{1,80})\]/g;

/**
 * Split an answer into text + citation segments.
 * Resolution order for each "[...]":
 *   1. exact label match against citations streamed by the backend (trusted)
 *   2. heuristic parse of the label (fallback, so chips still work in mocks)
 *   3. not citation-like → left as plain text
 */
export function segmentAnswer(text: string, known: Citation[]): Segment[] {
  const byLabel = new Map(known.map((c) => [normalize(c.label), c]));
  const out: Segment[] = [];
  let last = 0;

  for (const m of text.matchAll(BRACKET)) {
    const label = m[1];
    const resolved = byLabel.get(normalize(label)) ?? heuristicParse(label);
    if (!resolved && !looksLikeCitation(label)) continue;

    if (m.index! > last) out.push({ kind: "text", text: text.slice(last, m.index) });
    out.push({ kind: "citation", label, citation: resolved });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

const normalize = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

function looksLikeCitation(label: string) {
  return /\b(slide|pg|page|p\.|timestamp)\b|\d{1,2}:\d{2}/i.test(label);
}

/**
 * Best-effort parse for labels like "Slide 4, 02:15", "Textbook Pg 45",
 * "lecture2.mp4, 12:30-13:05", or the backend prompt format
 * "lecture2.mp4 | Page: 4, Timestamp: 12:30-13:05". file_name stays as the hint text;
 * ViewerContext resolves it against the course source list.
 */
export function heuristicParse(label: string): Citation | null {
  const parts = label
    .split(/[,|]/)
    .map((p) => p.trim().replace(/^(?:timestamp|time)\s*:\s*/i, "").replace(/\s*[-–]\s*$/, ""))
    .filter(Boolean);
  let page: number | null = null;
  let start: number | null = null;
  let end: number | null = null;
  const nameHints: string[] = [];

  for (const p of parts) {
    const pg = p.match(/\b(?:slide|pg|page|p\.)\s*:?\s*(\d+)/i);
    const range = p.match(/^(\d{1,2}(?::\d{2}){1,2})\s*[-–]\s*(\d{1,2}(?::\d{2}){1,2})$/);
    const ts = parseTimestamp(p);

    if (range) {
      start = parseTimestamp(range[1]);
      end = parseTimestamp(range[2]);
    } else if (ts !== null) {
      start = ts;
    } else if (pg) {
      page = Number(pg[1]);
      const rest = p.replace(pg[0], "").trim();
      if (rest) nameHints.push(rest); // e.g. "Textbook"
      if (/slide/i.test(p)) nameHints.push("slide");
    } else {
      nameHints.push(p);
    }
  }

  if (page === null && start === null) return null;
  return {
    id: `h:${label}`,
    label,
    file_name: nameHints.join(" ") || "",
    page_number: page,
    start_time: start,
    end_time: end,
    bboxes: [],
  };
}
