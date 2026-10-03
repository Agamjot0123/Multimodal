"use client";

import { useEffect, useRef, useState } from "react";
import { CHAT_URL, streamChat } from "@/lib/sse";
import { segmentAnswer } from "@/lib/citations";
import { CitationChip } from "@/components/chat/CitationChip";
import { MOCK_COURSE_ID } from "@/data/mockCourse";
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

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), [messages]);
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
      for await (const evt of streamChat(
        CHAT_URL,
        { question, course_id: MOCK_COURSE_ID, student_id: "demo" },
        abortRef.current.signal,
      )) {
        if (evt.type === "token") patch((msg) => ({ ...msg, text: msg.text + evt.text }));
        else if (evt.type === "citation") patch((msg) => ({ ...msg, citations: [...msg.citations, evt.citation] }));
        else if (evt.type === "error") patch((msg) => ({ ...msg, error: evt.message }));
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") patch((msg) => ({ ...msg, error: "Connection lost" }));
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
              {m.role === "assistant"
                ? segmentAnswer(m.text, m.citations).map((seg, i) =>
                    seg.kind === "text" ? <span key={i}>{seg.text}</span> : <CitationChip key={i} label={seg.label} citation={seg.citation} />,
                  )
                : m.text}
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
