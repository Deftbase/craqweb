import { allCodes } from './code';
import type { Code } from './types';

/** Local calendar day. Reset is midnight on this device, like Wordle. */
export function dayKey(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
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
