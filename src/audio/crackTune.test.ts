import { describe, expect, it } from 'vitest';
import { barSeconds, clipCrackHistory, TUNE_CAP_SECONDS, tuneSeconds } from './crackTune';

const TWELVE = [
  { bulls: 0, cows: 0 },
  { bulls: 0, cows: 1 },
  { bulls: 0, cows: 0 },
  { bulls: 0, cows: 2 },
  { bulls: 1, cows: 0 },
  { bulls: 0, cows: 1 },
  { bulls: 1, cows: 1 },
  { bulls: 1, cows: 0 },
  { bulls: 2, cows: 1 },
  { bulls: 2, cows: 0 },
  { bulls: 3, cows: 0 },
  { bulls: 4, cows: 0 },
];

describe('crack tune clip', () => {
  it('plays a first-try win in full, under the cap', () => {
    const ace = [{ bulls: 4, cows: 0 }];
    expect(clipCrackHistory(ace)).toEqual(ace);
    expect(tuneSeconds(ace)).toBeLessThan(4);
    expect(tuneSeconds(ace)).toBeLessThanOrEqual(TUNE_CAP_SECONDS);
  });

  it('keeps the win try and snaps to a try downbeat', () => {
    const clipped = clipCrackHistory(TWELVE);
    expect(clipped[clipped.length - 1]).toEqual({ bulls: 4, cows: 0 });
    expect(clipped).toEqual(TWELVE.slice(TWELVE.length - clipped.length));
    expect(tuneSeconds(clipped)).toBeLessThanOrEqual(TUNE_CAP_SECONDS);
  });

  it('drops whole early tries when the full log would run past 10s', () => {
    expect(tuneSeconds(TWELVE)).toBeGreaterThan(TUNE_CAP_SECONDS);
    const clipped = clipCrackHistory(TWELVE);
    expect(clipped.length).toBeLessThan(TWELVE.length);
    expect(clipped[0]).toEqual(TWELVE[1]);
    const dropped = barSeconds(TWELVE[0]);
    expect(tuneSeconds(clipped) + dropped).toBeGreaterThan(TUNE_CAP_SECONDS);
  });

  it('does not add a try that would start the clip over budget', () => {
    const clipped = clipCrackHistory(TWELVE);
    const extra = TWELVE[TWELVE.length - clipped.length - 1];
    expect(tuneSeconds([extra, ...clipped])).toBeGreaterThan(TUNE_CAP_SECONDS);
  });
});
