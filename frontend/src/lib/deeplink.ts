import { formatTimestamp, parseTimestamp } from "@/lib/time";
import { formatBoxes, parseBoxes } from "@/lib/bbox";
import type { BBox } from "@/types/contract";

/**
 * Shareable viewer state in the URL:
 *   ?src=lecture_03_backprop.mp4&t=02:15&end=02:52
 *   ?src=deep_learning_textbook.pdf&page=45&hl=0.12,0.31,0.88,0.42
 * `t`/`end` accept "mm:ss", "h:mm:ss" or plain seconds; `hl` holds highlight boxes (see lib/bbox).
 */
export interface DeepLink {
  file_name: string;
  page_number: number | null;
  start_time: number | null; // seconds
  end_time: number | null; // seconds
  bboxes: BBox[];
}

export function parseDeepLink(search: string): DeepLink | null {
  const q = new URLSearchParams(search);
  const file_name = q.get("src");
  if (!file_name) return null;
  const page = Number(q.get("page"));
  return {
    file_name,
    page_number: Number.isInteger(page) && page > 0 ? page : null,
    start_time: parseTime(q.get("t")),
    end_time: parseTime(q.get("end")),
    bboxes: parseBoxes(q.get("hl")),
  };
}

export function buildDeepLink(link: DeepLink, base = ""): string {
  const q = new URLSearchParams({ src: link.file_name });
  if (link.page_number !== null) q.set("page", String(link.page_number));
  if (link.start_time !== null) q.set("t", formatTimestamp(link.start_time));
  if (link.end_time !== null) q.set("end", formatTimestamp(link.end_time));
  if (link.bboxes.length) q.set("hl", formatBoxes(link.bboxes));
  return `${base}?${q.toString().replace(/%3A/gi, ":").replace(/%2C/gi, ",").replace(/%3B/gi, ";")}`; // keep "t=02:15" / "hl=…" readable
}

function parseTime(raw: string | null): number | null {
  if (!raw) return null;
  if (/^\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return parseTimestamp(raw);
}
