import { dayKey } from '../engine/daily';

const KEY = 'vault-cracker:streak';

export interface StreakSave {
  current: number;
  max: number;
  lastWinDay: string | null;
}

export function emptyStreak(): StreakSave {
  return { current: 0, max: 0, lastWinDay: null };
}

export function yesterdayKey(day: string): string {
  const [y, m, d] = day.split('-').map(Number);
  return dayKey(new Date(y, m - 1, d - 1));
}

export function loadStreak(): StreakSave {
  if (typeof localStorage === 'undefined') return emptyStreak();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStreak();
    const save = JSON.parse(raw) as Partial<StreakSave>;
    const current = typeof save.current === 'number' && save.current > 0 ? save.current : 0;
    const max = typeof save.max === 'number' && save.max > 0 ? save.max : 0;
    const lastWinDay = typeof save.lastWinDay === 'string' ? save.lastWinDay : null;
    return { current, max, lastWinDay };
  } catch {
    return emptyStreak();
  }
}

export function saveStreak(save: StreakSave) {
  localStorage.setItem(KEY, JSON.stringify(save));
}

/** Streak still showing today: won today, or won yesterday and not yet played. */
export function visibleStreak(save: StreakSave, today: string): number {
  if (!save.lastWinDay || save.current < 1) return 0;
  if (save.lastWinDay === today || save.lastWinDay === yesterdayKey(today)) return save.current;
  return 0;
}

export function streakAfterWin(save: StreakSave, today: string): StreakSave {
  if (save.lastWinDay === today) return save;
  const current = save.lastWinDay === yesterdayKey(today) ? save.current + 1 : 1;
  return { current, max: Math.max(save.max, current), lastWinDay: today };
}

export function recordDailyWin(today: string): StreakSave {
  const next = streakAfterWin(loadStreak(), today);
  saveStreak(next);
  return next;
}

export function streakLine(n: number): string | undefined {
  if (n < 1) return undefined;
  return n === 1 ? '1-DAY STREAK' : `${n}-DAY STREAK`;
}
