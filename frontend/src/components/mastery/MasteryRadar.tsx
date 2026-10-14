"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import { useMastery } from "@/context/MasteryContext";
import { levelOf } from "@/lib/bkt";

/** Live BKT mastery radar; updates as quiz answers are recorded. */
export function MasteryRadar() {
  const { mastery } = useMastery();
  const data = Object.entries(mastery).map(([skill, v]) => ({ skill, value: Math.round(v * 100) }));
  const avg = data.reduce((a, d) => a + d.value, 0) / (data.length || 1) / 100;

  if (data.length === 0) return null;

  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Your mastery</h3>
        <span className="text-xs capitalize text-slate-400">{levelOf(avg)} · {Math.round(avg * 100)}%</span>
      </div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} outerRadius="68%">
            <PolarGrid stroke="#334155" />
            <PolarAngleAxis dataKey="skill" tick={{ fill: "#94a3b8", fontSize: 10 }} />
            <Radar dataKey="value" stroke="#818cf8" fill="#6366f1" fillOpacity={0.4} isAnimationActive />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
