"use client";

import { useRef, useState } from "react";
import { fetchQuiz } from "@/lib/api";
import { levelOf, quizSizeFor } from "@/lib/bkt";
import { useMastery } from "@/context/MasteryContext";
import type { QuizQuestion } from "@/types/contract";

type Phase = "pick" | "loading" | "run" | "done";

/** Adaptive quiz: size scales with mastery; each answer updates the skill's BKT estimate. */
export function QuizPanel() {
  const { mastery, record } = useMastery();
  const [phase, setPhase] = useState<Phase>("pick");
  const [skill, setSkill] = useState("");
  const [topic, setTopic] = useState("");
  const [qs, setQs] = useState<QuizQuestion[]>([]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function start(s: string) {
    setSkill(s);
    setPhase("loading");
    setError(null);
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    try {
      const questions = await fetchQuiz([], quizSizeFor(mastery[s] ?? 0.3), abortRef.current.signal);
      if (!questions.length) throw new Error("No questions returned");
      setQs(questions);
      setI(0);
      setScore(0);
      setPicked(null);
      setPhase("run");
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError((e as Error).message);
      setPhase("pick");
    }
  }

  function answer(idx: number) {
    if (picked !== null) return;
    const ok = idx === qs[i].correct_option_index;
    setPicked(idx);
    if (ok) setScore((n) => n + 1);
    record(skill, ok);
  }

  function next() {
    if (i + 1 >= qs.length) setPhase("done");
    else {
      setI(i + 1);
      setPicked(null);
    }
  }

  if (phase === "pick" || phase === "loading")
    return (
      <div className="flex-1 overflow-y-auto p-4">
        <p className="text-lg font-semibold">Practice a topic</p>
        <p className="mt-1 text-sm text-slate-400">Questions are generated from your course materials; length adapts to your mastery.</p>
        {error && <p className="mt-3 text-xs text-rose-400">⚠ {error}</p>}
        <form
          className="mt-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (topic.trim() && phase === "pick") start(topic.trim());
          }}
        >
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Topic to practice…"
            className="min-w-0 flex-1 rounded-lg bg-slate-900 px-3 py-2 text-sm outline-none ring-1 ring-slate-800 placeholder:text-slate-500 focus:ring-indigo-500"
          />
          <button disabled={phase === "loading" || !topic.trim()} className="rounded-lg bg-indigo-600 px-4 text-sm font-medium disabled:opacity-40">
            {phase === "loading" ? "Generating…" : "Start"}
          </button>
        </form>
        <ul className="mt-4 space-y-2">
          {Object.entries(mastery).map(([s, m]) => (
            <li key={s}>
              <button
                disabled={phase === "loading"}
                onClick={() => start(s)}
                className="flex w-full items-center justify-between rounded-lg bg-slate-900 px-4 py-3 text-left text-sm ring-1 ring-slate-800 hover:ring-indigo-500 disabled:opacity-50"
              >
                <span>{s}</span>
                <span className="text-xs capitalize text-slate-400">
                  {phase === "loading" && skill === s ? "Generating…" : `${levelOf(m)} · ${Math.round(m * 100)}%`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    );

  if (phase === "done")
    return (
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <p className="text-3xl font-bold">{score}/{qs.length}</p>
          <p className="mt-1 text-sm text-slate-400">
            {skill} mastery is now <span className="font-medium text-slate-200">{Math.round(mastery[skill] * 100)}%</span>
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <button onClick={() => start(skill)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm">Another round</button>
            <button onClick={() => setPhase("pick")} className="rounded-lg border border-slate-700 px-4 py-2 text-sm">Pick skill</button>
          </div>
        </div>
      </div>
    );

  const q = qs[i];
  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="mb-3 flex justify-between text-xs text-slate-500">
        <span>{skill}</span>
        <span>Question {i + 1} of {qs.length}</span>
      </div>
      <p className="text-base font-medium">{q.question}</p>
      <ul className="mt-4 space-y-2">
        {q.options.map((o, idx) => {
          const correct = idx === q.correct_option_index;
          const style =
            picked === null
              ? "ring-slate-800 hover:ring-indigo-500"
              : correct
                ? "bg-emerald-500/15 ring-emerald-500"
                : idx === picked
                  ? "bg-rose-500/15 ring-rose-500"
                  : "ring-slate-800 opacity-60";
          return (
            <li key={idx}>
              <button onClick={() => answer(idx)} disabled={picked !== null} className={`w-full rounded-lg bg-slate-900 px-4 py-3 text-left text-sm ring-1 ${style}`}>
                {o}
              </button>
            </li>
          );
        })}
      </ul>
      {picked !== null && (
        <div className="mt-4 rounded-lg bg-slate-900 p-3 text-sm ring-1 ring-slate-800">
          <p className="text-slate-300">{q.explanation}</p>
          <p className="mt-1 text-xs text-slate-500">{q.source_citation}</p>
          <button onClick={next} className="mt-3 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm">{i + 1 >= qs.length ? "Finish" : "Next"}</button>
        </div>
      )}
    </div>
  );
}
