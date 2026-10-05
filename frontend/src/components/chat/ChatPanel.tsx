"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_URL, postChat, toCitation } from "@/lib/api";
import { segmentAnswer } from "@/lib/citations";
import { CitationChip } from "@/components/chat/CitationChip";
import { MOCK_CONTEXTS } from "@/data/mockCourse";
import type { Citation } from "@/types/contract";

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  citations: Citation[];
  error?: string;
}

const SUGGESTIONS = ["Explain backpropagation simply", "Why do we need the chain rule?", "Quiz me on gradients"];

export function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Braces matter: scrollIntoView returns a Promise in newer browsers, which React rejects as a cleanup.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    const aid = crypto.randomUUID();
    setMessages((m) => [
      ...m,
      { id: crypto.randomUUID(), role: "user", text: question, citations: [] },
      { id: aid, role: "assistant", text: "", citations: [] },
    ]);
    setInput("");
    setBusy(true);

    const patch = (fn: (msg: Message) => Message) =>
      setMessages((m) => m.map((msg) => (msg.id === aid ? fn(msg) : msg)));

    abortRef.current = new AbortController();
    try {
      const res = await postChat(
        CHAT_URL,
        { query: question, retrieved_contexts: MOCK_CONTEXTS },
        abortRef.current.signal,
      );
      patch((msg) => ({ ...msg, text: res.answer, citations: res.citations.map(toCitation) }));
    } catch (e) {
      const err = e as Error;
      if (err.name !== "AbortError") patch((msg) => ({ ...msg, error: err.message || "Connection lost" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="mx-auto mt-16 max-w-sm text-center">
            <p className="text-lg font-semibold">Ask about this lecture</p>
            <p className="mt-1 text-sm text-slate-400">Every answer cites the exact slide, page or timestamp.</p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => ask(s)} className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "flex justify-end" : ""}>
            <div
              className={`max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user" ? "bg-indigo-600 text-white" : "bg-slate-900 ring-1 ring-slate-800"
              }`}
            >
              {m.role === "assistant" ? <AssistantBody text={m.text} citations={m.citations} /> : m.text}
              {m.role === "assistant" && !m.text && !m.error && <span className="animate-pulse text-slate-500">Thinking…</span>}
              {m.error && <p className="mt-1 text-xs text-rose-400">⚠ {m.error}</p>}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="flex gap-2 border-t border-slate-800 p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask a question about the course…"
          className="min-w-0 flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm outline-none ring-1 ring-slate-800 placeholder:text-slate-500 focus:ring-indigo-500"
        />
        <button disabled={busy || !input.trim()} className="rounded-lg bg-indigo-600 px-4 text-sm font-medium disabled:opacity-40">
          {busy ? "…" : "Send"}
        </button>
      </form>
    </div>
  );
}

/** Answer with inline chips, plus any backend citations the answer didn't reference inline. */
function AssistantBody({ text, citations }: { text: string; citations: Citation[] }) {
  const segments = segmentAnswer(text, citations);
  const inlined = new Set(segments.flatMap((s) => (s.kind === "citation" && s.citation ? [s.citation.id] : [])));
  const rest = citations.filter((c) => !inlined.has(c.id));

  return (
    <>
      <span className="whitespace-pre-wrap">
        {segments.map((seg, i) =>
          seg.kind === "text" ? <span key={i}>{seg.text}</span> : <CitationChip key={i} label={seg.label} citation={seg.citation} />,
        )}
      </span>
      {text && rest.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-1 border-t border-slate-800 pt-2 text-xs text-slate-500">
          Sources:
          {rest.map((c) => (
            <CitationChip key={c.id} label={c.label} citation={c} />
          ))}
        </div>
      )}
    </>
  );
}
