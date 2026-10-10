import type { ChatRequest, ChatStreamEvent } from "@/types/contract";

/**
 * POST-based SSE reader (EventSource only supports GET).
 * Expects frames like:  event: token\ndata: {"text":"..."}\n\n
 */
export async function* streamChat(
  url: string,
  body: ChatRequest,
  signal?: AbortSignal,
): AsyncGenerator<ChatStreamEvent> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    yield { type: "error", message: `HTTP ${res.status}` };
    return;
  }

  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += value;

    // Frames are separated by a blank line.
    let sep: number;
    while ((sep = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const evt = parseFrame(frame);
      if (evt) yield evt;
    }
  }
}

function parseFrame(frame: string): ChatStreamEvent | null {
  let event = "message";
  const data: string[] = [];
  for (const line of frame.split("\n")) {
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
  }
  if (!data.length) return null;
  try {
    const payload = JSON.parse(data.join("\n"));
    switch (event) {
      case "token":
        return { type: "token", text: payload.text };
      case "citation":
        return { type: "citation", citation: payload };
      case "done":
        return { type: "done", message_id: payload.message_id };
      case "error":
        return { type: "error", message: payload.message };
      default:
        return null;
    }
  } catch {
    return { type: "error", message: "Malformed SSE frame" };
  }
}

/** Backend base URL; falls back to the built-in mock route. */
export const CHAT_URL =
  (process.env.NEXT_PUBLIC_API_BASE_URL &&
    `${process.env.NEXT_PUBLIC_API_BASE_URL.replace(/\/$/, "")}/chat/stream`) ||
  "/api/mock-chat";
