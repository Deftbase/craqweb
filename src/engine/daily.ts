import { allCodes } from './code';
import type { Code } from './types';

/** UTC day, so everyone cracking "today" shares one code. */
export function dayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function hashDay(day: string): number {
  let h = 2166136261;
  for (let i = 0; i < day.length; i++) {
    h ^= day.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** The same calendar day always yields the same valid code. */
export function dailyCode(day = dayKey()): Code {
  const pool = allCodes();
  return pool[hashDay(day) % pool.length];
}
