import type { BackendChunk, ChatStreamEvent, Citation, Community, CommunityResource, QuizQuestion } from "@/types/contract";
import { parseTimestamp } from "@/lib/time";
import { authHeaders } from "@/lib/auth";

const BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").replace(/\/$/, "");
export const CHAT_URL = `${BASE}/api/chat/stream`;
export const QUIZ_URL = `${BASE}/api/quiz`;

/**
 * Backend SSE frames: `data: {"token": "..."}\n\n` … `data: [DONE]\n\n`.
 * Citations arrive inline as `[Source: file, Pg 4]` / `[Source: file, 02:15]`
 * and are resolved client-side (see lib/citations.ts).
 */
export async function* streamChat(
  question: string,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(CHAT_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream", ...authHeaders() },
    body: JSON.stringify({ query: question }), // backend retrieves permission-scoped context itself
    signal,
  });
  if (!res.ok || !res.body) {
    yield { type: "error", message: `Backend returned HTTP ${res.status}` };
    return;
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const data = frame
        .split("\n")
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trimStart())
        .join("\n");
      if (!data) continue;
      if (data === "[DONE]") {
        yield { type: "done", message_id: crypto.randomUUID() };
        return;
      }
      try {
        const p = JSON.parse(data);
        if (p.error) yield { type: "error", message: String(p.error) };
        else if (typeof p.token === "string") yield { type: "token", text: p.token };
      } catch {
        yield { type: "error", message: "Malformed SSE frame" };
      }
    }
  }
}

export async function fetchQuiz(contexts: BackendChunk[], numQuestions: number, signal?: AbortSignal): Promise<QuizQuestion[]> {
  const res = await fetch(QUIZ_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ retrieved_contexts: contexts, num_questions: numQuestions }),
    signal,
  });
  if (!res.ok) throw new Error(`Quiz request failed (HTTP ${res.status})`);
  const data = await res.json();
  return data.questions as QuizQuestion[];
}

/** Turn a backend chunk's metadata into a frontend Citation (MM:SS → seconds). */
export function chunkToCitation(c: BackendChunk): Citation {
  const m = c.metadata;
  const start = m.start_time ? parseTimestamp(m.start_time) : null;
  const end = m.end_time ? parseTimestamp(m.end_time) : null;
  return {
    id: c.chunk_id,
    label: m.page_number != null ? `${m.file_name}, Pg ${m.page_number}` : `${m.file_name}, ${m.start_time ?? ""}`,
    file_name: m.file_name,
    page_number: m.page_number,
    start_time: start,
    end_time: end,
  };
}

/* ---------- Communities ---------- */

export const COMMUNITIES_ENABLED = Boolean(BASE);
/** Auth is the JWT from the auth server, sent as a Bearer token. */

async function call<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().then((j) => j.detail).catch(() => null);
    throw new Error(typeof detail === "string" ? detail : `Request failed (HTTP ${res.status})`);
  }
  return res.json();
}

async function upload(path: string, file: File): Promise<CommunityResource> {
  const form = new FormData();
  form.append("file", file);
  // No Content-Type header: the browser sets the multipart boundary.
  const res = await fetch(`${BASE}${path}`, { method: "POST", headers: authHeaders(), body: form });
  if (!res.ok) {
    const detail = await res.json().then((j) => j.detail).catch(() => null);
    throw new Error(typeof detail === "string" ? detail : `Upload failed (HTTP ${res.status})`);
  }
  return res.json();
}

export const personalApi = {
  resources: () => call<CommunityResource[]>("GET", "/api/personal/resources"),
  upload: (file: File) => upload("/api/personal/resources/upload", file),
  url: (resourceId: string) => call<{ url: string }>("GET", `/api/personal/resources/${resourceId}/url`).then((r) => r.url),
  remove: (resourceId: string) =>
    call<{ status: string; document_id: string }>("DELETE", `/api/personal/resources/${resourceId}`),
};

export const communitiesApi = {
  uploadResource: (id: string, file: File) => upload(`/api/communities/${id}/resources/upload`, file),
  resourceUrl: (id: string, resourceId: string) =>
    call<{ url: string }>("GET", `/api/communities/${id}/resources/${resourceId}/url`).then((r) => r.url),
  deleteResource: (id: string, resourceId: string) => call<unknown>("DELETE", `/api/communities/${id}/resources/${resourceId}`),
  deleteResource: (id: string, resourceId: string) =>
    call<{ status: string; document_id: string }>("DELETE", `/api/communities/${id}/resources/${resourceId}`),
  create: (name: string, description?: string) =>
    call<Community>("POST", "/api/communities/create", { name, description: description || null }),
  join: (invite_code: string) => call<Community>("POST", "/api/communities/join", { invite_code }),
  inviteCode: (id: string) => call<{ invite_code: string }>("GET", `/api/communities/${id}/invite-code`),
  regenerate: (id: string) => call<{ id: string; new_invite_code: string }>("POST", `/api/communities/${id}/regenerate-key`),
  leave: (id: string) => call<unknown>("DELETE", `/api/communities/leave?community_id=${encodeURIComponent(id)}`),
  resources: (id: string) => call<CommunityResource[]>("GET", `/api/communities/${id}/resources`),
};
