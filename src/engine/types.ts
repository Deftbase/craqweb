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
 * facts straight from the log, medium adds likelihood bars and soft-locks
 * Rules 1–5 at 91%, heavy hard-locks those same rules at 100%.
 */
export type AssistLevel = 'solo' | 'light' | 'medium' | 'heavy';
export const ASSIST_LEVELS: readonly AssistLevel[] = ['solo', 'light', 'medium', 'heavy'];

export interface DigitSignal {
  digit: number;
  state: DigitState;
  /** Display strength 0..1: 0 dead, 1 locked, 0.91 Medium-deduced, else soft pack. */
  value: number;
  /** Raw share of remaining digit sets containing this digit. */
  ratio: number;
}
