/** Bayesian Knowledge Tracing: one tracker per skill. */
export interface BktParams {
  pInit: number; // prior P(L0)
  pLearn: number; // P(T): learn after a practice step
  pSlip: number; // P(S): known but answered wrong
  pGuess: number; // P(G): unknown but answered right
}

export const DEFAULT_BKT: BktParams = { pInit: 0.3, pLearn: 0.15, pSlip: 0.1, pGuess: 0.25 };

/** Posterior P(known) given the observation, then the learning transition. */
export function bktUpdate(pKnown: number, correct: boolean, p: BktParams = DEFAULT_BKT): number {
  const posterior = correct
    ? (pKnown * (1 - p.pSlip)) / (pKnown * (1 - p.pSlip) + (1 - pKnown) * p.pGuess)
    : (pKnown * p.pSlip) / (pKnown * p.pSlip + (1 - pKnown) * (1 - p.pGuess));
  return posterior + (1 - posterior) * p.pLearn;
}

export type MasteryLevel = "novice" | "developing" | "proficient";

export function levelOf(pKnown: number): MasteryLevel {
  return pKnown >= 0.8 ? "proficient" : pKnown >= 0.5 ? "developing" : "novice";
}

/** Dynamic quiz difficulty/length driven by mastery. */
export function quizSizeFor(pKnown: number): number {
  return pKnown >= 0.8 ? 5 : pKnown >= 0.5 ? 4 : 3;
}
