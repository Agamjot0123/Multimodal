"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { bktUpdate } from "@/lib/bkt";
import { MOCK_SKILLS } from "@/data/mockCourse";

type Mastery = Record<string, number>;
const KEY = "studymate.mastery.v1";
const initial = (): Mastery => Object.fromEntries(MOCK_SKILLS.map((s) => [s.skill, s.mastery]));

interface MasteryState {
  mastery: Mastery;
  record: (skill: string, correct: boolean) => void;
  reset: () => void;
}

const Ctx = createContext<MasteryState | null>(null);

export function MasteryProvider({ children }: { children: React.ReactNode }) {
  const [mastery, setMastery] = useState<Mastery>(initial);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setMastery({ ...initial(), ...JSON.parse(saved) });
    } catch {}
  }, []);

  const persist = (m: Mastery) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(m));
    } catch {}
    return m;
  };

  const record = useCallback((skill: string, correct: boolean) => {
    setMastery((m) => persist({ ...m, [skill]: bktUpdate(m[skill] ?? 0.3, correct) }));
  }, []);
  const reset = useCallback(() => setMastery(persist(initial())), []);

  const value = useMemo(() => ({ mastery, record, reset }), [mastery, record, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMastery() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useMastery must be used inside <MasteryProvider>");
  return v;
}
