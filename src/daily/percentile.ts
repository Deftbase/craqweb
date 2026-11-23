import type { AssistLevel } from '../engine';

/** Shown bands only. Outside Top 75% returns null — no badge, no share mention. */
export type PercentileBand = 'Top 5%' | 'Top 10%' | 'Top 25%' | 'Top 50%' | 'Top 75%';

type Cap = { tries: number; ms: number };

/** House curve for Daily. First matching band wins. */
const CAPS: Record<PercentileBand, Partial<Record<AssistLevel, Cap>>> = {
  'Top 5%': {
    solo: { tries: 4, ms: 4 * 60_000 },
  },
  'Top 10%': {
    solo: { tries: 6, ms: 6 * 60_000 },
    light: { tries: 4, ms: 5 * 60_000 },
    medium: { tries: 3, ms: 3 * 60_000 },
  },
  'Top 25%': {
    solo: { tries: 8, ms: 8 * 60_000 },
    light: { tries: 6, ms: 6 * 60_000 },
    medium: { tries: 5, ms: 4 * 60_000 },
    heavy: { tries: 4, ms: 4 * 60_000 },
  },
  'Top 50%': {
    solo: { tries: 10, ms: 10 * 60_000 },
    light: { tries: 8, ms: 8 * 60_000 },
    medium: { tries: 7, ms: 6 * 60_000 },
    heavy: { tries: 6, ms: 6 * 60_000 },
  },
  'Top 75%': {
    solo: { tries: 12, ms: 12 * 60_000 },
    light: { tries: 10, ms: 10 * 60_000 },
    medium: { tries: 10, ms: 10 * 60_000 },
    heavy: { tries: 10, ms: 10 * 60_000 },
  },
};

const ORDER: PercentileBand[] = ['Top 5%', 'Top 10%', 'Top 25%', 'Top 50%', 'Top 75%'];

export function dailyPercentile(tries: number, ms: number, assist: AssistLevel): PercentileBand | null {
  const elapsed = Math.max(0, ms);
  const guesses = Math.max(0, tries);
  for (const band of ORDER) {
    const cap = CAPS[band][assist];
    if (cap && guesses <= cap.tries && elapsed <= cap.ms) return band;
  }
  return null;
}
