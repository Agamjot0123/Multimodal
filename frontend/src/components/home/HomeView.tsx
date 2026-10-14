"use client";

import { useState } from "react";
import { BlinkingDots } from "@/components/home/BlinkingDots";
import { useAuth } from "@/components/auth/AuthGate";
import { MOCK_CHUNKS } from "@/data/mockCourse";
import { useCommunities } from "@/context/CommunityContext";
import { useMastery } from "@/context/MasteryContext";
import { useViewer } from "@/context/ViewerContext";
import { levelOf } from "@/lib/bkt";

type Start = "chat" | "quiz";

const KIND_LABEL: Record<string, string> = { video: "Video", slides: "Slides", pdf: "Textbook" };

/** The three highlighted phrases in the demo answer, each backed by a real course chunk. */
const MARKS = [
  { id: "c1", phrase: "reuses each layer’s local gradient" },
  { id: "c2", phrase: "the upstream gradient times the local one" },
  { id: "c5", phrase: "learning rate times the gradient" },
] as const;

function where(m: { page_number: number | null; start_time: string | null }) {
  return m.start_time ? `at ${m.start_time}` : `page ${m.page_number}`;
}

/** The hero: an answer with its claims highlighted; pick one to see the passage behind it. */
function MarkedUpAnswer({ onOpen }: { onOpen: (file: string) => void }) {
  const [picked, setPicked] = useState<string>(MARKS[0].id);
  const { sources } = useViewer();
  const chunk = MOCK_CHUNKS.find((c) => c.chunk.chunk_id === picked)!.chunk;
  const source = sources.find((s) => s.file_name === chunk.metadata.file_name);

  const mark = (i: number) => (
    <button
      type="button"
      className="mark cursor-pointer rounded-[3px] px-0.5 text-left text-slate-50 underline decoration-amber-300/40 underline-offset-4 transition-colors hover:decoration-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      style={{ ["--d" as string]: `${0.5 + i * 0.35}s` }}
      aria-pressed={picked === MARKS[i].id}
      onClick={() => setPicked(MARKS[i].id)}
    >
      {MARKS[i].phrase}
    </button>
  );

  return (
    <div className="w-full max-w-xl">
      <p className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md bg-indigo-500 px-4 py-2.5 text-[0.95rem] text-white">
        Why is backprop cheaper than computing every gradient separately?
      </p>

      <div className="font-reading mt-5 border-l-2 border-indigo-400/60 pl-5 text-[1.2rem] leading-[1.7] text-slate-200">
        It works backwards from the loss and {mark(0)} instead of recomputing it. Each weight’s gradient is then{" "}
        {mark(1)}, which is just the chain rule. Gradient descent applies the update as the {mark(2)}, and Adam adds
        momentum on top.
      </div>

      <div className="mt-6 rounded-xl bg-slate-900 px-5 py-4 ring-1 ring-slate-800" aria-live="polite">
        <div className="flex items-baseline justify-between gap-4">
          <p className="text-sm font-semibold text-amber-200">
            {source?.title ?? chunk.metadata.file_name}, {where(chunk.metadata)}
          </p>
          {source && (
            <button
              type="button"
              onClick={() => onOpen(source.file_name)}
              className="shrink-0 text-sm text-indigo-300 underline underline-offset-4 hover:text-indigo-200"
            >
              Open it
            </button>
          )}
        </div>
        <p className="font-reading mt-2 text-base italic leading-relaxed text-slate-400">“{chunk.text}”</p>
      </div>
    </div>
  );
}

function SkillRow({ skill, value, weakest }: { skill: string; value: number; weakest: boolean }) {
  const pct = Math.round(value * 100);
  return (
    <li className="grid grid-cols-[7.5rem_1fr_2.75rem] items-center gap-4 py-2.5">
      <span className="truncate text-[0.95rem] text-slate-200">{skill}</span>
      <div
        role="meter"
        aria-label={`${skill} mastery`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-2 rounded-full bg-slate-800"
      >
        <div
          className={`h-full rounded-full ${weakest ? "bg-amber-300" : "bg-indigo-400"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-right text-sm tabular-nums text-slate-400">{pct}%</span>
    </li>
  );
}

export function HomeView({ onStart }: { onStart: (mode: Start) => void }) {
  const { user } = useAuth();
  const { mastery } = useMastery();
  const { sources, openSource } = useViewer();
  const { communities, setActive } = useCommunities();

  const skills = Object.entries(mastery).sort((a, b) => a[1] - b[1]);
  const avg = skills.reduce((a, [, v]) => a + v, 0) / (skills.length || 1);
  const first = user?.name?.split(" ")[0];

  const open = (file: string) => {
    const s = sources.find((x) => x.file_name === file);
    if (s) openSource(s);
    onStart("chat");
  };

  return (
    <div className="relative min-h-0 flex-1">
      <BlinkingDots />
      <div className="absolute inset-0 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-12 lg:pt-20">
        <section className="grid items-center gap-14 lg:grid-cols-[1fr_1.05fr]">
          <div>
            <h1 className="text-[clamp(2.75rem,6.5vw,5.5rem)] font-extrabold leading-[0.95] tracking-tighter text-slate-50">
              Ask your course. See the page it came from.
            </h1>
            <p className="mt-7 max-w-md text-lg leading-relaxed text-slate-400">
              {first ? `${first}, every` : "Every"} answer links back to the lecture timestamp, slide or textbook page
              it was built from, so you can check it instead of trusting it.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-x-6 gap-y-3">
              <button
                onClick={() => onStart("chat")}
                className="rounded-full bg-amber-300 px-7 py-3.5 text-[0.95rem] font-bold text-slate-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-200"
              >
                Ask a question
              </button>
              <button
                onClick={() => onStart("quiz")}
                className="text-[0.95rem] font-semibold text-slate-200 underline decoration-slate-600 underline-offset-[6px] transition hover:decoration-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300"
              >
                Quiz me on weak spots
              </button>
            </div>
          </div>
          <div className="lg:justify-self-end">
            <MarkedUpAnswer onOpen={open} />
          </div>
        </section>

        <div className="mt-28 grid gap-x-16 gap-y-16 lg:grid-cols-[1.1fr_1fr]">
          <section>
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-3xl font-bold tracking-tight text-slate-50">Where you stand</h2>
              <p className="text-sm text-slate-400">
                Overall {Math.round(avg * 100)}%, {levelOf(avg)}
              </p>
            </div>
            <ul className="mt-5 divide-y divide-slate-800/80 border-y border-slate-800/80">
              {skills.map(([skill, v], i) => (
                <SkillRow key={skill} skill={skill} value={v} weakest={i === 0} />
              ))}
            </ul>
            {skills[0] && (
              <p className="mt-5 text-[0.95rem] text-slate-400">
                {skills[0][0]} is your lowest.{" "}
                <button
                  onClick={() => onStart("quiz")}
                  className="font-semibold text-amber-200 underline underline-offset-4 hover:text-amber-100"
                >
                  Practice it now
                </button>
              </p>
            )}
          </section>

          <div className="flex flex-col gap-14">
            <section>
              <h2 className="text-3xl font-bold tracking-tight text-slate-50">Your materials</h2>
              <ul className="mt-5 border-t border-slate-800/80">
                {sources.map((s) => (
                  <li key={s.file_name} className="border-b border-slate-800/80">
                    <button
                      onClick={() => open(s.file_name)}
                      className="group flex w-full items-baseline justify-between gap-4 py-3.5 text-left"
                    >
                      <span className="min-w-0 truncate text-[0.95rem] text-slate-200 group-hover:text-white">
                        {s.title}
                      </span>
                      <span className="shrink-0 text-sm text-slate-500">
                        {KIND_LABEL[s.kind] ?? s.kind}
                        {s.kind === "video" && s.duration ? `, ${Math.round(s.duration / 60)} min` : ""}
                        {s.pages ? `, ${s.pages} pages` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h2 className="text-3xl font-bold tracking-tight text-slate-50">Communities</h2>
              {communities.length === 0 ? (
                <p className="mt-4 max-w-sm text-[0.95rem] leading-relaxed text-slate-400">
                  You haven’t joined any yet. Create one or enter an invite code from the sources panel in the
                  workspace to study with classmates.
                </p>
              ) : (
                <ul className="mt-5 border-t border-slate-800/80">
                  {communities.map((c) => (
                    <li key={c.id} className="border-b border-slate-800/80">
                      <button
                        onClick={() => {
                          setActive(c.id);
                          onStart("chat");
                        }}
                        className="flex w-full items-baseline justify-between gap-4 py-3.5 text-left text-[0.95rem] text-slate-200 hover:text-white"
                      >
                        <span className="truncate">{c.name}</span>
                        <span className="shrink-0 text-sm text-slate-500">{c.description ?? "Open"}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
