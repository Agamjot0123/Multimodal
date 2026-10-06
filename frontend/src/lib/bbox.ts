import type { BBox } from "@/types/contract";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/** Drop malformed boxes, clamp to the page and fix inverted corners. */
export function cleanBoxes(raw: unknown): BBox[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((b) => {
    const { x0, y0, x1, y1 } = (b ?? {}) as Partial<BBox>;
    if (![x0, y0, x1, y1].every((n) => typeof n === "number" && Number.isFinite(n))) return [];
    const box = {
      x0: clamp01(Math.min(x0!, x1!)),
      y0: clamp01(Math.min(y0!, y1!)),
      x1: clamp01(Math.max(x0!, x1!)),
      y1: clamp01(Math.max(y0!, y1!)),
    };
    return box.x1 > box.x0 && box.y1 > box.y0 ? [box] : [];
  });
}

/** URL form: "x0,y0,x1,y1;x0,y0,x1,y1" (4 decimals ≈ 0.1px on a 1000px page). */
export function formatBoxes(boxes: BBox[]): string {
  return boxes.map((b) => [b.x0, b.y0, b.x1, b.y1].map((n) => +n.toFixed(4)).join(",")).join(";");
}

export function parseBoxes(raw: string | null): BBox[] {
  if (!raw) return [];
  return cleanBoxes(
    raw.split(";").map((part) => {
      const [x0, y0, x1, y1] = part.split(",").map(Number);
      return { x0, y0, x1, y1 };
    }),
  );
}
