import { score } from './score';
import type { Code, GuessRecord, Score } from './types';

/**
 * How close a result looks, from the bulls and cows a player can see.
 * The same score always lands on the same reading.
 */
const CLOSENESS: Record<string, number> = {
  '0,0': 0,
  '0,1': 0.12,
  '0,2': 0.24,
  '0,3': 0.36,
  '0,4': 0.58,
  '1,0': 0.3,
  '1,1': 0.42,
  '1,2': 0.53,
  '1,3': 0.64,
  '2,0': 0.62,
  '2,1': 0.74,
  '2,2': 0.84,
  '3,0': 0.9,
};

export function filterCandidates(candidates: readonly Code[], guess: Code, result: Score): Code[] {
  return candidates.filter((c) => {
    const s = score(guess, c);
    return s.bulls === result.bulls && s.cows === result.cows;
  });
}

/**
 * Progress toward opening the vault, 0..1. Follows the closest guess so far.
 * 100% only when the code is entered, so a full bar always means the door is open.
 */
export function breachLevel(history: readonly Score[], cracked: boolean): number {
  if (cracked) return 1;
  let best = 0;
  for (const h of history) best = Math.max(best, CLOSENESS[`${h.bulls},${h.cows}`] ?? 0);
  return best;
}

export function candidatesFromHistory(all: readonly Code[], history: readonly GuessRecord[]): Code[] {
  return history.reduce<Code[]>((pool, h) => filterCandidates(pool, h.guess, h), [...all]);
}
