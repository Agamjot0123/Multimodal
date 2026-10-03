import { MOCK_SKILLS } from "@/data/mockCourse";

/** Compact mastery bars. Replaced by BKT-driven data + Recharts radar on Day 7/9. */
export function MasteryMini() {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Your mastery</h3>
      <ul className="space-y-2">
        {MOCK_SKILLS.map(({ skill, mastery }) => (
          <li key={skill} className="text-xs">
            <div className="mb-1 flex justify-between text-slate-400">
              <span>{skill}</span>
              <span className="tabular-nums">{Math.round(mastery * 100)}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-800">
              <div
                className={`h-full rounded-full ${mastery >= 0.7 ? "bg-emerald-500" : mastery >= 0.4 ? "bg-amber-400" : "bg-rose-500"}`}
                style={{ width: `${mastery * 100}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
