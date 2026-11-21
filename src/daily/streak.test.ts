import { describe, expect, it } from 'vitest';
import {
  emptyStreak,
  streakAfterWin,
  streakLine,
  visibleStreak,
  yesterdayKey,
  type StreakSave,
} from './streak';

const won = (day: string, current: number, max = current): StreakSave => ({
  current,
  max,
  lastWinDay: day,
});

describe('daily streak', () => {
  it('treats the previous local calendar day as yesterday', () => {
    expect(yesterdayKey('2026-11-19')).toBe('2026-11-18');
    expect(yesterdayKey('2026-03-01')).toBe('2026-02-28');
  });

  it('starts at 1 on a first win', () => {
    expect(streakAfterWin(emptyStreak(), '2026-11-19')).toEqual(won('2026-11-19', 1));
  });

  it('adds one when yesterday was a win', () => {
    expect(streakAfterWin(won('2026-11-18', 3, 5), '2026-11-19')).toEqual({
      current: 4,
      max: 5,
      lastWinDay: '2026-11-19',
    });
  });

  it('resets to 1 after a missed day', () => {
    expect(streakAfterWin(won('2026-11-16', 8, 8), '2026-11-19')).toEqual(won('2026-11-19', 1, 8));
  });

  it('does not double-count the same day', () => {
    const save = won('2026-11-19', 4, 4);
    expect(streakAfterWin(save, '2026-11-19')).toBe(save);
  });

  it('keeps the streak visible on the win day and the next morning before a win', () => {
    const save = won('2026-11-18', 4, 6);
    expect(visibleStreak(save, '2026-11-18')).toBe(4);
    expect(visibleStreak(save, '2026-11-19')).toBe(4);
    expect(visibleStreak(save, '2026-11-20')).toBe(0);
  });

  it('labels the win card', () => {
    expect(streakLine(0)).toBeUndefined();
    expect(streakLine(1)).toBe('1-DAY STREAK');
    expect(streakLine(4)).toBe('4-DAY STREAK');
  });
});
