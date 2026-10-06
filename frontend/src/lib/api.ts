import type { ApiCitation, ChatRequest, ChatResponse, Citation } from "@/types/contract";
import { parseTimestamp } from "@/lib/time";
import { cleanBoxes } from "@/lib/bbox";

/** POST /api/chat → { answer, citations }. Throws with the backend's `detail` on failure. */
export async function postChat(url: string, body: ChatRequest, signal?: AbortSignal): Promise<ChatResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const detail = await res.json().then((j) => j?.detail, () => null);
    throw new Error(typeof detail === "string" ? detail : `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Same label the backend puts in the prompt (Backend/llm.py format_context_for_prompt),
 * e.g. "deep_learning_textbook.pdf | Page: 45" — so inline "[...]" echoes match exactly.
 */
export function backendLabel(c: ApiCitation): string {
  const parts: string[] = [];
  if (c.page_number !== null) parts.push(`Page: ${c.page_number}`);
  if (c.start_time !== null) parts.push(`Timestamp: ${c.start_time}-${c.end_time ?? ""}`);
  return parts.length ? `${c.file_name} | ${parts.join(", ")}` : c.file_name;
}

/** Backend citation → UI citation (mm:ss strings → seconds). */
export function toCitation(c: ApiCitation): Citation {
  return {
    id: c.chunk_id,
    label: backendLabel(c),
    file_name: c.file_name,
    page_number: c.page_number,
    start_time: c.start_time !== null ? parseTimestamp(c.start_time) : null,
    end_time: c.end_time !== null ? parseTimestamp(c.end_time) : null,
    bboxes: cleanBoxes(c.bboxes),
  };
}

const base = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "");
const provider = process.env.NEXT_PUBLIC_LLM_PROVIDER; // "groq" | "gemini"; backend defaults to groq

/** Backend chat URL; falls back to the built-in mock route. */
export const CHAT_URL = base
  ? `${base}/api/chat${provider ? `?provider=${encodeURIComponent(provider)}` : ""}`
  : "/api/mock-chat";
