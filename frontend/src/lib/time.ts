/** "02:15" | "1:02:15" → seconds. Returns null if not a timestamp. */
export function parseTimestamp(raw: string): number | null {
  const m = raw.trim().match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const [, h, min, s] = m;
  return Number(h ?? 0) * 3600 + Number(min) * 60 + Number(s);
}

/** seconds → "02:15" (or "1:02:15" past an hour). */
export function formatTimestamp(total: number): string {
  const t = Math.max(0, Math.floor(total));
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
