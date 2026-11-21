import { describe, expect, it } from 'vitest';
import {
  allCodes,
  breachLevel,
  computeSpectrum,
  createGame,
  dailyCode,
  dayKey,
  filterCandidates,
  gameReducer,
  isValidCode,
  randomCode,
  replayGame,
  score,
  segmentFills,
  type GameAction,
  type GameState,
} from './index';

const play = (state: GameState, ...actions: GameAction[]) => actions.reduce(gameReducer, state);
const enter = (state: GameState, code: number[]) =>
  play(state, ...code.map((digit) => ({ type: 'INPUT_DIGIT', digit }) as GameAction), { type: 'SUBMIT' });

describe('codes', () => {
  it('has 5040 unique-digit codes', () => {
    const codes = allCodes();
    expect(codes).toHaveLength(5040);
    expect(codes.every((c) => isValidCode([...c]))).toBe(true);
  });

  it('generates valid random codes', () => {
    for (let i = 0; i < 50; i++) expect(isValidCode([...randomCode()])).toBe(true);
  });

  it('gives every player the same daily code', () => {
    const first = dailyCode('2026-11-11');
    expect(dailyCode('2026-11-11')).toEqual(first);
    expect(isValidCode([...first])).toBe(true);
    expect(dailyCode('2026-11-12')).not.toEqual(first);
  });

  it('keys the daily off the local calendar date', () => {
    expect(dayKey(new Date(2026, 10, 21, 0, 15, 0))).toBe('2026-11-21');
    expect(dayKey(new Date(2026, 10, 21, 23, 45, 0))).toBe('2026-11-21');
  });

  it('replays a solved daily back to won', () => {
    const secret = dailyCode('2026-11-11');
    const state = replayGame(secret, [[9, 8, 7, 6], secret]);
    expect(state.status).toBe('won');
    expect(state.history).toHaveLength(2);
    expect(state.history[1].bulls).toBe(4);
  });
});

describe('score', () => {
  it('counts bulls and cows', () => {
    expect(score([1, 2, 3, 4], [1, 2, 3, 4])).toEqual({ bulls: 4, cows: 0 });
    expect(score([4, 3, 2, 1], [1, 2, 3, 4])).toEqual({ bulls: 0, cows: 4 });
    expect(score([1, 5, 2, 6], [1, 2, 3, 4])).toEqual({ bulls: 1, cows: 1 });
    expect(score([5, 6, 7, 8], [1, 2, 3, 4])).toEqual({ bulls: 0, cows: 0 });
  });
});

describe('candidates', () => {
  it('keeps the secret and only consistent codes', () => {
    const secret = [7, 0, 3, 9];
    const guess = [1, 2, 3, 4];
    const pool = filterCandidates(allCodes(), guess, score(guess, secret));
    expect(pool.some((c) => c.join('') === '7039')).toBe(true);
    expect(pool.every((c) => score(guess, c).bulls === 1 && score(guess, c).cows === 0)).toBe(true);
  });
});

describe('spectrum', () => {
  it('starts every digit as untested', () => {
    const s = computeSpectrum([]);
    expect(s.every((d) => d.state === 'untested')).toBe(true);
    expect(s[0].ratio).toBeCloseTo(0.4);
  });

  it('kills all digits of a zero-hit guess', () => {
    const history = [{ guess: [1, 2, 3, 4], bulls: 0, cows: 0 }];
    const s = computeSpectrum(history);
    [1, 2, 3, 4].forEach((d) => expect(s[d].state).toBe('dead'));
    [0, 5].forEach((d) => expect(s[d].state).toBe('untested'));
  });

  const spectrumOf = (history: { guess: number[]; bulls: number; cows: number }[]) =>
    computeSpectrum(history);
  const states = (s: ReturnType<typeof computeSpectrum>, digits: number[]) => digits.map((d) => s[d].state);

  it('locks digits of a guess totalling 4 and strikes the other 6 (Rule 3)', () => {
    const s = spectrumOf([{ guess: [1, 2, 3, 4], bulls: 1, cows: 3 }]);
    [1, 2, 3, 4].forEach((d) => {
      expect(s[d].state).toBe('locked');
      expect(s[d].value).toBe(1);
    });
    expect(states(s, [0, 5, 6, 7, 8, 9])).toEqual(Array(6).fill('dead'));
  });

  it('locks the leftover digits once 6 are struck (Rule 3)', () => {
    const s = spectrumOf([
      { guess: [0, 1, 2, 3], bulls: 0, cows: 0 },
      { guess: [0, 1, 4, 5], bulls: 0, cows: 0 },
    ]);
    expect(states(s, [6, 7, 8, 9])).toEqual(Array(4).fill('locked'));
  });

  it('locks the only digits left that can explain a score (Rule 1)', () => {
    const s = spectrumOf([
      { guess: [0, 9, 1, 2], bulls: 2, cows: 0 },
      { guess: [0, 9, 7, 4], bulls: 0, cows: 0 },
    ]);
    expect(states(s, [1, 2])).toEqual(['locked', 'locked']);
    expect(states(s, [0, 9, 7, 4])).toEqual(Array(4).fill('dead'));
    expect(states(s, [3, 5, 6, 8])).toEqual(Array(4).fill('untested'));
  });

  it('strikes the 2 untouched digits when disjoint guesses sum to 4 (Rule 4)', () => {
    const s = spectrumOf([
      { guess: [0, 1, 2, 3], bulls: 0, cows: 3 },
      { guess: [4, 5, 6, 7], bulls: 0, cows: 1 },
    ]);
    expect(states(s, [8, 9])).toEqual(['dead', 'dead']);
    for (const d of s) {
      if (d.state === 'active') {
        expect(d.value).toBeGreaterThanOrEqual(0.07);
        expect(d.value).toBeLessThanOrEqual(0.91);
      }
    }
  });

  it('locks the 2 untouched digits when disjoint guesses sum to 2 (Rule 4)', () => {
    const s = spectrumOf([
      { guess: [0, 1, 2, 3], bulls: 1, cows: 0 },
      { guess: [4, 5, 6, 7], bulls: 0, cows: 1 },
    ]);
    expect(states(s, [8, 9])).toEqual(['locked', 'locked']);
  });

  it('chains rules until nothing changes', () => {
    // Rule 4 locks 8,9; the no-hit guess strikes 0,1,2,4; Rule 1 then locks 3.
    const s = spectrumOf([
      { guess: [0, 1, 2, 3], bulls: 1, cows: 0 },
      { guess: [4, 5, 6, 7], bulls: 0, cows: 1 },
      { guess: [0, 1, 2, 4], bulls: 0, cows: 0 },
    ]);
    expect(states(s, [8, 9, 3])).toEqual(['locked', 'locked', 'locked']);
    expect(states(s, [0, 1, 2, 4])).toEqual(Array(4).fill('dead'));
  });

  it('shows deduced-but-unconfirmed digits at 91% without locking them', () => {
    const history = [
      { guess: [0, 1, 2, 3], bulls: 0, cows: 2 },
      { guess: [4, 5, 6, 7], bulls: 1, cows: 1 },
    ];
    const s = computeSpectrum(history);
    expect(s.some((d) => d.state === 'locked')).toBe(false);
    expect(s.every((d) => d.value <= 0.91)).toBe(true);
  });

  it('ignores positions: a digit only positional logic proves stays uncertain', () => {
    // Only 0725 fits, but from hit totals alone the 4th digit is 2 or 9.
    const s = spectrumOf([
      { guess: [2, 6, 9, 1], bulls: 0, cows: 1 },
      { guess: [5, 7, 4, 8], bulls: 1, cows: 1 },
      { guess: [7, 5, 1, 0], bulls: 0, cows: 3 },
      { guess: [0, 7, 5, 6], bulls: 2, cows: 1 },
    ]);
    [0, 5, 7].forEach((d) => expect(s[d].value).toBe(0.91));
    expect(s[2].value).toBeCloseTo(0.5);
    expect(s[9].value).toBeCloseTo(0.5);
    [1, 4, 6, 8].forEach((d) => expect(s[d].value).toBe(0.07));
  });

  const yourGame = [
    { guess: [5, 2, 1, 0], bulls: 1, cows: 1 },
    { guess: [9, 4, 0, 7], bulls: 2, cows: 1 },
    { guess: [9, 2, 0, 4], bulls: 2, cows: 1 },
    { guess: [3, 6, 8, 2], bulls: 0, cows: 1 },
  ];

  it('strikes digits whose guess is fully explained by locked digits (Rule 2)', () => {
    const s = computeSpectrum(yourGame, 'heavy');
    expect(states(s, [2, 0])).toEqual(['locked', 'locked']);
    expect(states(s, [1, 5, 3, 6, 8])).toEqual(Array(5).fill('dead'));
  });

  it('only marks log facts below heavy assist', () => {
    for (const level of ['light', 'medium'] as const) {
      const s = computeSpectrum(yourGame, level);
      expect(s.some((d) => d.state === 'dead' || d.state === 'locked')).toBe(false);
    }
    const s = computeSpectrum([{ guess: [1, 2, 3, 4], bulls: 0, cows: 0 }], 'medium');
    expect(states(s, [1, 2, 3, 4])).toEqual(Array(4).fill('dead'));
    const four = computeSpectrum([{ guess: [1, 2, 3, 4], bulls: 1, cows: 3 }], 'light');
    expect(states(four, [1, 2, 3, 4])).toEqual(Array(4).fill('locked'));
    expect(four[5].state).toBe('untested');
  });

  it('splits a value into four segments', () => {
    expect(segmentFills(1)).toEqual([1, 1, 1, 1]);
    expect(segmentFills(0.5)).toEqual([1, 1, 0, 0]);
    expect(segmentFills(0.125)).toEqual([0.5, 0, 0, 0]);
  });
});

describe('reducer', () => {
  it('auto-advances and blocks duplicates', () => {
    let s = createGame([1, 2, 3, 4]);
    s = play(s, { type: 'INPUT_DIGIT', digit: 5 }, { type: 'INPUT_DIGIT', digit: 5 });
    expect(s.slots).toEqual([5, null, null, null]);
    expect(s.focusIndex).toBe(1);
    s = play(s, { type: 'FOCUS_SLOT', index: 3 }, { type: 'INPUT_DIGIT', digit: 6 });
    expect(s.slots).toEqual([5, null, null, 6]);
    expect(s.focusIndex).toBe(1);
  });

  it('backspaces and clears', () => {
    let s = play(createGame([1, 2, 3, 4]), { type: 'INPUT_DIGIT', digit: 5 }, { type: 'INPUT_DIGIT', digit: 6 });
    s = gameReducer(s, { type: 'BACKSPACE' });
    expect(s.slots).toEqual([5, null, null, null]);
    expect(s.focusIndex).toBe(1);
    s = gameReducer(s, { type: 'CLEAR' });
    expect(s.slots).toEqual([null, null, null, null]);
    expect(s.focusIndex).toBe(0);
  });

  it('ignores incomplete submissions', () => {
    const s = play(createGame([1, 2, 3, 4]), { type: 'INPUT_DIGIT', digit: 5 }, { type: 'SUBMIT' });
    expect(s.history).toHaveLength(0);
  });

  it('wins on 4 bulls', () => {
    const s = enter(createGame([1, 2, 3, 4]), [1, 2, 3, 4]);
    expect(s.status).toBe('cracking');
    expect(gameReducer(s, { type: 'FINISH_CRACK' }).status).toBe('won');
  });

  it('moves the breach with the closest result and never backward', () => {
    let s = createGame([1, 2, 3, 4]);
    expect(breachLevel(s.history, false)).toBe(0);
    s = enter(s, [5, 6, 7, 8]);
    expect(breachLevel(s.history, false)).toBe(0);
    s = enter(s, [1, 5, 6, 7]);
    expect(breachLevel(s.history, false)).toBe(0.3);
    s = enter(s, [9, 8, 7, 6]);
    expect(breachLevel(s.history, false)).toBe(0.3);
    s = enter(s, [1, 2, 3, 9]);
    expect(breachLevel(s.history, false)).toBe(0.9);
  });

  it('stays locked with one candidate left until the code is entered', () => {
    let s = createGame([1, 2, 3, 4]);
    s = enter(s, [2, 1, 3, 4]);
    s = enter(s, [1, 2, 4, 3]);
    s = enter(s, [1, 3, 2, 4]);
    expect(s.candidates).toHaveLength(1);
    expect(s.status).toBe('playing');
    expect(breachLevel(s.history, false)).toBe(0.84);
    s = enter(s, [1, 2, 3, 4]);
    expect(s.status).toBe('cracking');
    expect(breachLevel(s.history, true)).toBe(1);
  });
});
