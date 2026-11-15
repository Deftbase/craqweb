import { describe, expect, it } from 'vitest';
import { clockFromDaily, dailyShare, elapsedMs, formatClock, idleClock, shareRow, type DailySave } from './save';

describe('daily share', () => {
  it('packs each guess as hits only', () => {
    expect(shareRow(0, 0)).toBe('·');
    expect(shareRow(1, 0)).toBe('🟩');
    expect(shareRow(1, 1)).toBe('🟩🟨');
    expect(shareRow(2, 1)).toBe('🟩🟩🟨');
    expect(shareRow(4, 0)).toBe('🟩🟩🟩🟩');
  });

  it('writes the staircase and the caption', () => {
    const text = dailyShare(
      [
        { bulls: 1, cows: 0 },
        { bulls: 1, cows: 1 },
        { bulls: 2, cows: 1 },
        { bulls: 4, cows: 0 },
      ],
      '2026-11-11',
      '02:06',
      'Medium',
    );
    expect(text).toBe(
      ['CRAQ', 'Daily 2026-11-11', '', '🟩', '🟩🟨', '🟩🟩🟨', '🟩🟩🟩🟩', '', '4 tries · 02:06 · Medium'].join('\n'),
    );
  });

  it('uses a single green row and the singular try for a one-try win', () => {
    const text = dailyShare([{ bulls: 4, cows: 0 }], '2026-11-11', '00:41', 'Solo');
    expect(text).toContain('🟩🟩🟩🟩');
    expect(text).toContain('1 try · 00:41 · Solo');
    expect(text).not.toContain('tries');
  });
});

describe('daily clock', () => {
  it('pads minutes so the header width stays put', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(41_000)).toBe('00:41');
    expect(formatClock(126_000)).toBe('02:06');
    expect(formatClock(3_661_000)).toBe('1:01:01');
  });

  it('stays idle until a guess exists', () => {
    expect(clockFromDaily(null)).toEqual(idleClock());
    expect(
      clockFromDaily({
        day: '2026-11-14',
        guesses: [],
        startedAt: 1_000,
        pausedMs: 0,
        lastSeen: 2_000,
        finished: false,
        peakAssist: 'solo',
      }),
    ).toEqual(idleClock());
  });

  it('counts elapsed time only after the clock has started', () => {
    const save: Pick<DailySave, 'startedAt' | 'pausedMs' | 'lastSeen' | 'finished'> = {
      startedAt: 0,
      pausedMs: 0,
      lastSeen: 0,
      finished: false,
    };
    expect(elapsedMs(save, 50_000)).toBe(0);
    expect(elapsedMs({ ...save, startedAt: 10_000 }, 50_000)).toBe(40_000);
  });
});
