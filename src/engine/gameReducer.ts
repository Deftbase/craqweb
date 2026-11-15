import { allCodes, isValidCode } from './code';
import { filterCandidates } from './candidates';
import { score } from './score';
import { CODE_LENGTH, type Code, type GuessRecord } from './types';

export type GameStatus = 'playing' | 'cracking' | 'won';
export interface GameState {
  secret: Code;
  slots: (number | null)[];
  focusIndex: number;
  history: GuessRecord[];
  candidates: Code[];
  status: GameStatus;
}

export type GameAction =
  | { type: 'INPUT_DIGIT'; digit: number }
  | { type: 'FOCUS_SLOT'; index: number }
  | { type: 'BACKSPACE' }
  | { type: 'CLEAR' }
  | { type: 'SUBMIT' }
  | { type: 'FINISH_CRACK' }
  | { type: 'NEW_GAME'; secret: Code }
  | { type: 'RESTORE'; state: GameState };

const emptySlots = () => new Array<number | null>(CODE_LENGTH).fill(null);

export function createGame(secret: Code): GameState {
  return {
    secret,
    slots: emptySlots(),
    focusIndex: 0,
    history: [],
    candidates: allCodes(),
    status: 'playing',
  };
}

function nextEmpty(slots: (number | null)[], from: number): number {
  for (let step = 1; step <= CODE_LENGTH; step++) {
    const i = (from + step) % CODE_LENGTH;
    if (slots[i] === null) return i;
  }
  return from;
}

export function canSubmit(state: GameState): boolean {
  return state.status === 'playing' && isValidCode(state.slots);
}

/** Rebuild a finished or in-progress vault from the guesses already submitted. */
export function replayGame(secret: Code, guesses: readonly Code[]): GameState {
  return guesses.reduce((state, guess) => {
    const playing = state.status === 'playing' ? state : { ...state, status: 'playing' as const };
    const submitted = gameReducer({ ...playing, slots: [...guess], focusIndex: 0 }, { type: 'SUBMIT' });
    return submitted.status === 'cracking' ? { ...submitted, status: 'won' } : submitted;
  }, createGame(secret));
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'NEW_GAME') return createGame(action.secret);
  if (action.type === 'RESTORE') return action.state;
  if (action.type === 'FINISH_CRACK') {
    return state.status === 'cracking' ? { ...state, status: 'won' } : state;
  }
  if (state.status !== 'playing') return state;

  switch (action.type) {
    case 'INPUT_DIGIT': {
      const { digit } = action;
      if (!Number.isInteger(digit) || digit < 0 || digit > 9) return state;
      if (state.slots.some((d, i) => d === digit && i !== state.focusIndex)) return state;
      const slots = [...state.slots];
      slots[state.focusIndex] = digit;
      return { ...state, slots, focusIndex: nextEmpty(slots, state.focusIndex) };
    }
    case 'FOCUS_SLOT': {
      if (action.index < 0 || action.index >= CODE_LENGTH) return state;
      return { ...state, focusIndex: action.index };
    }
    case 'BACKSPACE': {
      const slots = [...state.slots];
      let i = state.focusIndex;
      if (slots[i] === null) {
        i = (i + CODE_LENGTH - 1) % CODE_LENGTH;
        if (slots[i] === null) return state;
      }
      slots[i] = null;
      return { ...state, slots, focusIndex: i };
    }
    case 'CLEAR':
      return { ...state, slots: emptySlots(), focusIndex: 0 };
    case 'SUBMIT': {
      if (!isValidCode(state.slots)) return state;
      const guess: Code = [...state.slots];
      const result = score(guess, state.secret);
      const history = [...state.history, { guess, ...result }];
      const candidates = filterCandidates(state.candidates, guess, result);
      return {
        ...state,
        history,
        candidates,
        slots: emptySlots(),
        focusIndex: 0,
        status: result.bulls === CODE_LENGTH ? 'cracking' : 'playing',
      };
    }
  }
}
