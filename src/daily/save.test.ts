import { describe, expect, it } from 'vitest';
import {
  challengeText,
  clockFromDaily,
  dailyCrackedToday,
  dailyFromSearch,
  dailyPlayUrl,
  dailyShare,
  decodeHeist,
  elapsedMs,
  encodeHeist,
  formatClock,
  heistFromHash,
  msUntilTomorrow,
  nextVaultLine,
  heistListenUrl,
  idleClock,
  shareMarks,
  shareRow,
  type DailySave,
} from './save';

describe('daily share', () => {
  it('packs each guess as hits only', () => {
    expect(shareMarks(0, 0)).toEqual(['miss']);
    expect(shareMarks(1, 1)).toEqual(['bull', 'cow']);
    expect(shareMarks(4, 0)).toEqual(['bull', 'bull', 'bull', 'bull']);
    expect(shareRow(0, 0)).toBe('⚪');
    expect(shareRow(1, 0)).toBe('🟢');
    expect(shareRow(1, 1)).toBe('🟢🟡');
    expect(shareRow(2, 1)).toBe('🟢🟢🟡');
    expect(shareRow(4, 0)).toBe('🟢🟢🟢🟢');
  });

  it('writes the staircase, caption, and play-break-in link', () => {
    const history = [
      { bulls: 1, cows: 0 },
      { bulls: 1, cows: 1 },
      { bulls: 2, cows: 1 },
      { bulls: 4, cows: 0 },
    ];
    const text = dailyShare(
      history,
      '02:06',
      'Medium',
      'https://craq.example/#heist=10-11-21-40',
      'Top 25%',
    );
    expect(text).toBe(
      [
        'CRAQ 4 tries · 02:06 · Medium · Top 25%',
        '',
        '🟢',
        '🟢🟡',
        '🟢🟢🟡',
        '🟢🟢🟢🟢',
        '',
        'Play your break in',
        'https://craq.example/#heist=10-11-21-40',
      ].join('\n'),
    );
  });

  it('uses a single green row and the singular try for a one-try win', () => {
    const text = dailyShare([{ bulls: 4, cows: 0 }], '00:41', 'Solo');
    expect(text).toContain('🟢🟢🟢🟢');
    expect(text).toBe('CRAQ 1 try · 00:41 · Solo\n\n🟢🟢🟢🟢');
    expect(text).not.toContain('tries');
  });

  it('writes a Practice share without a clock or heist link', () => {
    const text = dailyShare(
      [
        { bulls: 1, cows: 0 },
        { bulls: 4, cows: 0 },
      ],
      undefined,
      'Medium',
    );
    expect(text).toBe('CRAQ 2 tries · Medium\n\n🟢\n🟢🟢🟢🟢');
    expect(text).not.toContain('Play your break in');
  });

  it('encodes the crack log for a listen link', () => {
    expect(encodeHeist([{ bulls: 0, cows: 0 }, { bulls: 4, cows: 0 }])).toBe('00-40');
    expect(decodeHeist('00-40')).toEqual([
      { bulls: 0, cows: 0 },
      { bulls: 4, cows: 0 },
    ]);
    expect(heistFromHash('#heist=21-40')).toEqual([
      { bulls: 2, cows: 1 },
      { bulls: 4, cows: 0 },
    ]);
    expect(heistListenUrl([{ bulls: 4, cows: 0 }], 'https://craq.example/')).toBe('https://craq.example/#heist=40');
  });

  it('builds a Daily challenge note with a play link', () => {
    expect(dailyFromSearch('?daily')).toBe(true);
    expect(dailyFromSearch('')).toBe(false);
    expect(dailyPlayUrl('https://craq.example/')).toBe('https://craq.example/?daily');
    expect(challengeText(1, 'https://craq.example/?daily')).toBe(
      'I cracked the code in 1 guess, can you beat that?\nhttps://craq.example/?daily',
    );
    expect(challengeText(6, 'https://craq.example/?daily')).toBe(
      'I cracked the code in 6 guesses, can you beat that?\nhttps://craq.example/?daily',
    );
  });

  it('knows this browser cracked today from the daily save', () => {
    expect(dailyCrackedToday(null)).toBe(false);
    expect(
      dailyCrackedToday({
        day: '2026-11-18',
        guesses: [[0, 2, 5, 7]],
        startedAt: 1,
        pausedMs: 0,
        lastSeen: 2,
        finished: false,
        peakAssist: 'solo',
      }),
    ).toBe(false);
    expect(
      dailyCrackedToday({
        day: '2026-11-18',
        guesses: [[0, 2, 5, 7]],
        startedAt: 1,
        pausedMs: 0,
        lastSeen: 2,
        finished: true,
        peakAssist: 'solo',
      }),
    ).toBe(true);
  });
});

describe('daily clock', () => {
  it('pads minutes so the header width stays put', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(41_000)).toBe('00:41');
    expect(formatClock(126_000)).toBe('02:06');
    expect(formatClock(3_661_000)).toBe('1:01:01');
  });

  it('counts down to the next local Daily', () => {
    const now = new Date(2026, 10, 22, 16, 28, 40);
    expect(msUntilTomorrow(now)).toBe(7 * 3600_000 + 31 * 60_000 + 20_000);
    expect(nextVaultLine(7 * 3600_000 + 32 * 60_000)).toBe('new vault in 7hrs: 32 mins');
    expect(nextVaultLine(5 * 60_000)).toBe('new vault in 0hrs: 05 mins');
    expect(nextVaultLine(0)).toBe('new vault in 0hrs: 00 mins');
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
