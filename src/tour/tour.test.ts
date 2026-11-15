import { describe, expect, it } from 'vitest';
import { computeSpectrum, score } from '../engine';
import {
  ASSIST_GUESSES,
  TOUR_CODE,
  UNLOCK_GUESSES,
  assistPhase,
  isTourDigitAllowed,
  unlockPhase,
} from './tour';

const row = (guess: readonly number[]) => ({ guess: [...guess], ...score(guess, TOUR_CODE) });

describe('unlock walkthrough', () => {
  it('scores the scripted guesses against the tour code', () => {
    expect(score(UNLOCK_GUESSES[0], TOUR_CODE)).toEqual({ bulls: 0, cows: 2 });
    expect(score(UNLOCK_GUESSES[1], TOUR_CODE)).toEqual({ bulls: 0, cows: 0 });
    expect(score(UNLOCK_GUESSES[2], TOUR_CODE)).toEqual({ bulls: 0, cows: 2 });
    expect(score(UNLOCK_GUESSES[3], TOUR_CODE)).toEqual({ bulls: 0, cows: 0 });
    expect(score(UNLOCK_GUESSES[4], TOUR_CODE)).toEqual({ bulls: 2, cows: 2 });
    expect(score(UNLOCK_GUESSES[5], TOUR_CODE)).toEqual({ bulls: 4, cows: 0 });
  });

  it('walks slide decks into the next play guess', () => {
    const start = unlockPhase(0);
    expect(start?.play).toEqual([1, 2, 3, 4]);
    expect(start?.slides[0].title).toContain('Welcome to Craq');
    expect(start?.slides[0].body).toContain('unique 4-digit code');
    expect(start?.slides[start.slides.length - 1]?.digits).toEqual([1, 2, 3, 4]);

    const after1 = unlockPhase(1);
    expect(after1?.play).toEqual([1, 2, 5, 6]);
    expect(after1?.slides[0].log?.[0]).toMatchObject({ idx: 1, clue: { bulls: 0, cows: 2 } });
    expect(after1?.slides).toHaveLength(3);

    const after2 = unlockPhase(2);
    expect(after2?.play).toEqual([7, 8, 9, 0]);
    expect(after2?.dead).toEqual([1, 2, 5, 6]);
    expect(after2?.slides.some((s) => s.log?.some((row) => row.circle?.includes(3)))).toBe(true);

    const after3 = unlockPhase(3);
    expect(after3?.play).toEqual([5, 6, 9, 0]);

    const after4 = unlockPhase(4);
    expect(after4?.play).toEqual([3, 4, 7, 8]);
    expect(after4?.dead).toEqual([1, 2, 5, 6, 9, 0]);
    expect(after4?.slides.some((s) => s.log?.some((row) => row.circle?.includes(7)))).toBe(true);

    const after5 = unlockPhase(5);
    expect(after5?.play).toEqual([3, 4, 8, 7]);

    expect(unlockPhase(6)).toBeNull();
  });

  it('only accepts the next scripted digit', () => {
    const start = unlockPhase(0)!;
    expect(isTourDigitAllowed(start.play, [null, null, null, null], 1)).toBe(true);
    expect(isTourDigitAllowed(start.play, [null, null, null, null], 9)).toBe(false);
    expect(isTourDigitAllowed(start.play, [1, null, null, null], 2)).toBe(true);
    expect(isTourDigitAllowed(start.play, [1, null, null, null], 3)).toBe(false);
  });

  it('keeps the scripted rows scoring as the slides describe', () => {
    expect(row(UNLOCK_GUESSES[0])).toMatchObject({ bulls: 0, cows: 2 });
    expect(row(UNLOCK_GUESSES[1])).toMatchObject({ bulls: 0, cows: 0 });
  });
});

describe('assist walkthrough', () => {
  it('scores the assist guesses against the tour code', () => {
    expect(score(ASSIST_GUESSES[0], TOUR_CODE)).toEqual({ bulls: 0, cows: 0 });
    expect(score(ASSIST_GUESSES[1], TOUR_CODE)).toEqual({ bulls: 0, cows: 2 });
    expect(score(ASSIST_GUESSES[2], TOUR_CODE)).toEqual({ bulls: 4, cows: 0 });
  });

  it('asks for a tap, then walks Light, Medium, and Heavy', () => {
    const start = assistPhase(0, 'solo');
    expect(start.cueAssist).toBe(true);
    expect(start.need).toBe('light');
    expect(start.play).toEqual([]);

    const light = assistPhase(0, 'light');
    expect(light.cueAssist).toBe(false);
    expect(light.play).toEqual([1, 2, 5, 6]);
    expect(light.slides[0].title).toBeUndefined();
    expect(light.slides[0].assistLevel).toBe('light');
    expect(light.slides[0].log?.[0]).toMatchObject({ digits: ['A', 'B', 'C', 'D'], clue: 'cold' });
    expect(light.slides[0].caption).toContain('zero likelihood');
    expect(light.slides[1].body).toContain('See it live');
    expect(light.slides[1].digits).toEqual([1, 2, 5, 6]);

    const afterCold = assistPhase(1, 'light');
    expect(afterCold.cueAssist).toBe(true);
    expect(afterCold.need).toBe('medium');
    expect(afterCold.dead).toEqual([1, 2, 5, 6]);

    const medium = assistPhase(1, 'medium');
    expect(medium.play).toEqual([0, 3, 7, 9]);
    expect(medium.slides[0].title).toBeUndefined();
    expect(medium.slides[0].assistLevel).toBe('medium');
    expect(medium.slides[1].coins?.map((c) => c.look)).toEqual(['fade', 'polish']);
    expect(medium.slides[2].body).toContain('See it live');
    expect(medium.slides[2].digits).toEqual([0, 3, 7, 9]);

    const afterTwo = assistPhase(2, 'medium');
    expect(afterTwo.cueAssist).toBe(true);
    expect(afterTwo.need).toBe('heavy');

    const heavy = assistPhase(2, 'heavy');
    expect(heavy.play).toEqual([3, 4, 8, 7]);
    expect(heavy.slides[0].title).toBeUndefined();
    expect(heavy.slides[0].assistLevel).toBe('heavy');
    expect(heavy.slides[0].body).toContain('(heavy)');
    expect(heavy.slides[0].body).toContain('(light)');
    expect(heavy.slides[0].body).toContain('(medium)');
    expect(heavy.slides[1].caption).toContain('digits: 4 and 8, are');
    expect(heavy.slides[1].log?.map((row) => row.digits)).toEqual([
      [1, 2, 5, 6],
      [0, 3, 7, 9],
    ]);
    expect(heavy.slides[1].coins?.map((c) => c.digit)).toEqual([4, 8]);
    expect(heavy.slides[2].body).toContain('See it live');
    expect(heavy.slides[2].digits).toEqual([3, 4, 8, 7]);

    expect(assistPhase(3, 'heavy').done).toBe(true);
  });

  it('warms leftovers after the cold guess, then Heavy locks 4 and 8', () => {
    const afterCold = computeSpectrum([row(ASSIST_GUESSES[0])], 'medium');
    expect(afterCold.find((s) => s.digit === 4)?.ratio).toBeCloseTo(2 / 3);
    expect(afterCold.find((s) => s.digit === 1)?.state).toBe('dead');

    const afterTwo = computeSpectrum([row(ASSIST_GUESSES[0]), row(ASSIST_GUESSES[1])], 'heavy');
    expect(afterTwo.find((s) => s.digit === 4)?.state).toBe('locked');
    expect(afterTwo.find((s) => s.digit === 8)?.state).toBe('locked');
  });
});
