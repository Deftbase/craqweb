import { describe, expect, it } from 'vitest';
import { dailyPercentile } from './percentile';

describe('dailyPercentile', () => {
  it('keeps Solo 4 tries under 4 minutes in Top 5%', () => {
    expect(dailyPercentile(4, 3 * 60_000 + 50_000, 'solo')).toBe('Top 5%');
    expect(dailyPercentile(4, 4 * 60_000, 'solo')).toBe('Top 5%');
    expect(dailyPercentile(4, 4 * 60_000 + 1, 'solo')).toBe('Top 10%');
  });

  it('ranks Light on the approved curve', () => {
    expect(dailyPercentile(4, 5 * 60_000, 'light')).toBe('Top 10%');
    expect(dailyPercentile(6, 6 * 60_000, 'light')).toBe('Top 25%');
    expect(dailyPercentile(8, 8 * 60_000, 'light')).toBe('Top 50%');
    expect(dailyPercentile(10, 10 * 60_000, 'light')).toBe('Top 75%');
  });

  it('puts Medium 5 tries in 4 minutes in Top 25%', () => {
    expect(dailyPercentile(5, 4 * 60_000, 'medium')).toBe('Top 25%');
    expect(dailyPercentile(5, 4 * 60_000 + 1, 'medium')).toBe('Top 50%');
  });

  it('gives Heavy and Solo the Top 75% ceilings and hides anything slower', () => {
    expect(dailyPercentile(10, 10 * 60_000, 'heavy')).toBe('Top 75%');
    expect(dailyPercentile(12, 12 * 60_000, 'solo')).toBe('Top 75%');
    expect(dailyPercentile(13, 60_000, 'solo')).toBeNull();
  });

  it('does not give Light or Heavy a Top 5% band', () => {
    expect(dailyPercentile(1, 1_000, 'light')).toBe('Top 10%');
    expect(dailyPercentile(1, 1_000, 'heavy')).toBe('Top 25%');
  });
});
