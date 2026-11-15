import { useMemo, useReducer } from 'react';
import { computeSpectrum, gameReducer, type AssistLevel, type Code, type GameState } from '../engine';

/**
 * Local single-player session. A networked session for head-to-head play
 * should expose this same shape so components don't change.
 */
export function useGameSession(assist: AssistLevel, initial: GameState) {
  const [state, dispatch] = useReducer(gameReducer, initial);

  const spectrum = useMemo(() => computeSpectrum(state.history, assist), [state.history, assist]);

  const actions = useMemo(
    () => ({
      input: (digit: number) => dispatch({ type: 'INPUT_DIGIT', digit }),
      focusSlot: (index: number) => dispatch({ type: 'FOCUS_SLOT', index }),
      backspace: () => dispatch({ type: 'BACKSPACE' }),
      clear: () => dispatch({ type: 'CLEAR' }),
      submit: () => dispatch({ type: 'SUBMIT' }),
      finishCrack: () => dispatch({ type: 'FINISH_CRACK' }),
      newGame: (secret: Code) => dispatch({ type: 'NEW_GAME', secret }),
      restore: (next: GameState) => dispatch({ type: 'RESTORE', state: next }),
    }),
    [],
  );

  return { state, spectrum, actions };
}

export type GameSession = ReturnType<typeof useGameSession>;
