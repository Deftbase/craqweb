export type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/** Four unique digits, slot order matters. */
export type Code = readonly number[];

export const CODE_LENGTH = 4;
export const DIGITS: readonly number[] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

export interface Score {
  bulls: number;
  cows: number;
}

export interface GuessRecord extends Score {
  guess: Code;
}

export type DigitState = 'untested' | 'dead' | 'active' | 'locked';

/**
 * How much the keypad helps, weakest first: solo shows nothing, light shows
 * facts straight from the log, medium adds likelihood bars, heavy adds the
 * deduction rules.
 */
export type AssistLevel = 'solo' | 'light' | 'medium' | 'heavy';
export const ASSIST_LEVELS: readonly AssistLevel[] = ['solo', 'light', 'medium', 'heavy'];

export interface DigitSignal {
  digit: number;
  state: DigitState;
  /** Display strength 0..1: 0 for dead, 1 for locked, clamped 0.12..0.9 otherwise. */
  value: number;
  /** Raw share of remaining digit sets containing this digit. */
  ratio: number;
}
