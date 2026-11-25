import { DIGITS, type AssistLevel, type DigitSignal, type GuessRecord } from './types';

export const SIGNAL_FLOOR = 0.07;
export const SIGNAL_CEILING = 0.9;
/**
 * Shown for digits every remaining digit set contains. Only the rules in
 * `certainDigits` earn a full 100% lock.
 */
export const DEDUCED_VALUE = 0.91;

let cachedSets: number[][] | null = null;

/** All C(10, 4) = 210 sets of 4 distinct digits, ignoring order. */
export function allDigitSets(): number[][] {
  if (cachedSets) return cachedSets;
  const sets: number[][] = [];
  for (let a = 0; a < 10; a++)
    for (let b = a + 1; b < 10; b++)
      for (let c = b + 1; c < 10; c++) for (let d = c + 1; d < 10; d++) sets.push([a, b, c, d]);
  cachedSets = sets;
  return sets;
}

/** Digit sets that match every guess's hit total (in place + misplaced). */
export function digitSetsFromHistory(history: readonly GuessRecord[]): number[][] {
  return allDigitSets().filter((set) =>
    history.every((h) => h.guess.filter((d) => set.includes(d)).length === h.bulls + h.cows),
  );
}

/**
 * Per-digit signal. Likelihoods only use which digits are in the code (hit
 * totals), never positions, so a player can follow every bar by reasoning.
 * Only the heavy assist level runs the deduction rules; lower levels mark just
 * what the log states outright. How much of this to display is up to the UI.
 */
export function computeSpectrum(history: readonly GuessRecord[], assist: AssistLevel = 'heavy'): DigitSignal[] {
  const tested = new Set<number>();
  for (const h of history) h.guess.forEach((d) => tested.add(d));
  const { out, inCode } = certainDigits(history, assist === 'heavy');

  const sets = digitSetsFromHistory(history);
  const counts = new Array<number>(10).fill(0);
  for (const s of sets) for (const d of s) counts[d]++;
  const total = sets.length;

  return DIGITS.map((digit) => {
    const ratio = total ? counts[digit] / total : 0;

    // Only the explicit certainty rules mark digits dead or locked; anything
    // the digit sets imply beyond them stays within the floor/91% range.
    if (out.has(digit)) return { digit, state: 'dead', value: 0, ratio };
    if (inCode.has(digit)) return { digit, state: 'locked', value: 1, ratio };

    const deduced = total > 0 && counts[digit] === total;
    const value = deduced ? DEDUCED_VALUE : Math.min(SIGNAL_CEILING, Math.max(SIGNAL_FLOOR, ratio));
    return { digit, state: tested.has(digit) ? 'active' : 'untested', value, ratio };
  });
}

/**
 * Digits the log proves are out of / in the code, using only rules a player
 * can follow by hand:
 * - a no-hit guess strikes all its digits; a guess totalling 4 locks all its digits
 * - with `deduce`, these also chain until nothing changes:
 *   - Rule 1: a guess with N hits and exactly N digits not struck locks those digits
 *   - Rule 2: a guess whose hits are all locked digits strikes its other digits
 *   - Rule 3: 4 locked strikes the other 6; 6 struck locks the other 4
 *   - Rule 4: two guesses with no shared digit leave 2 untouched digits, which are
 *     struck if their hits sum to 4, or locked if they sum to 2
 *   - Rule 5: two guesses that differ by one slot; safe in-place/misplaced deltas
 *     lock/strike the swapped digits
 */
export function certainDigits(
  history: readonly GuessRecord[],
  deduce = true,
): { out: Set<number>; inCode: Set<number> } {
  const out = new Set<number>();
  const inCode = new Set<number>();
  const hitsOf = (h: GuessRecord) => h.bulls + h.cows;

  for (const h of history) {
    if (hitsOf(h) === 0) h.guess.forEach((d) => out.add(d));
    if (hitsOf(h) === 4) h.guess.forEach((d) => inCode.add(d));
  }
  if (!deduce) return { out, inCode };

  const leftovers: { digits: number[]; hits: number }[] = [];
  for (let i = 0; i < history.length; i++) {
    for (let j = i + 1; j < history.length; j++) {
      const used = new Set([...history[i].guess, ...history[j].guess]);
      if (used.size !== 8) continue;
      leftovers.push({ digits: DIGITS.filter((d) => !used.has(d)), hits: hitsOf(history[i]) + hitsOf(history[j]) });
    }
  }

  let changed = true;
  const mark = (set: Set<number>, digits: readonly number[]) => {
    for (const d of digits) {
      if (!set.has(d)) {
        set.add(d);
        changed = true;
      }
    }
  };

  while (changed) {
    changed = false;

    for (const h of history) {
      const open = h.guess.filter((d) => !out.has(d));
      if (hitsOf(h) > 0 && open.length === hitsOf(h)) mark(inCode, open);

      const locked = h.guess.filter((d) => inCode.has(d));
      if (locked.length === hitsOf(h)) mark(out, h.guess.filter((d) => !inCode.has(d)));
    }

    for (const { digits, hits } of leftovers) {
      if (hits === 4) mark(out, digits);
      if (hits === 2) mark(inCode, digits);
    }

    // Rule 5: one-slot neighbors — compare in place / misplaced deltas.
    for (let i = 0; i < history.length; i++) {
      for (let j = i + 1; j < history.length; j++) {
        const A = history[i];
        const B = history[j];
        const diffs: number[] = [];
        for (let p = 0; p < A.guess.length; p++) {
          if (A.guess[p] !== B.guess[p]) diffs.push(p);
        }
        if (diffs.length !== 1) continue;
        const a = A.guess[diffs[0]];
        const b = B.guess[diffs[0]];
        const db = B.bulls - A.bulls;
        const dc = B.cows - A.cows;
        if (db === -1 && dc === 0) {
          mark(inCode, [a]);
          mark(out, [b]);
        } else if (db === 1 && dc === 0) {
          mark(inCode, [b]);
          mark(out, [a]);
        } else if (db === 0 && dc === -1) {
          mark(inCode, [a]);
          mark(out, [b]);
        } else if (db === 0 && dc === 1) {
          mark(inCode, [b]);
          mark(out, [a]);
        } else if (db === -1 && dc === 1) {
          mark(inCode, [a, b]);
        } else if (db === 1 && dc === -1) {
          mark(inCode, [a, b]);
        }
      }
    }

    if (inCode.size === 4) mark(out, DIGITS.filter((d) => !inCode.has(d)));
    if (out.size === 6) mark(inCode, DIGITS.filter((d) => !out.has(d)));
  }

  return { out, inCode };
}

/** Fill amount (0..1) for each of the four track segments. */
export function segmentFills(value: number): number[] {
  return [0, 1, 2, 3].map((i) => Math.min(1, Math.max(0, value * 4 - i)));
}
