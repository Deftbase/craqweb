import { createGame, dailyCode, dayKey, randomCode, replayGame, type AssistLevel, type GameState } from '../engine';

export type GameMode = 'versus' | 'daily';

export interface DailySave {
  day: string;
  guesses: number[][];
  startedAt: number;
  pausedMs: number;
  /** Last moment the clock was known to be running. Offline time is treated as a pause. */
  lastSeen: number;
  finished: boolean;
  peakAssist: AssistLevel;
}

const DAILY_KEY = 'vault-cracker:daily';
const MODE_KEY = 'vault-cracker:mode';

export function loadMode(): GameMode {
  if (typeof localStorage === 'undefined') return 'versus';
  return localStorage.getItem(MODE_KEY) === 'daily' ? 'daily' : 'versus';
}

export function saveMode(mode: GameMode) {
  localStorage.setItem(MODE_KEY, mode);
}

export function loadDaily(): DailySave | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (!raw) return null;
    const save = JSON.parse(raw) as DailySave;
    if (!save || typeof save.day !== 'string' || !Array.isArray(save.guesses)) return null;
    if (typeof save.startedAt !== 'number' || typeof save.pausedMs !== 'number' || typeof save.lastSeen !== 'number') return null;
    return save;
  } catch {
    return null;
  }
}

export function saveDaily(save: DailySave) {
  localStorage.setItem(DAILY_KEY, JSON.stringify(save));
}

export function todaySave(): DailySave | null {
  const save = loadDaily();
  return save?.day === dayKey() ? save : null;
}

export function elapsedMs(save: Pick<DailySave, 'startedAt' | 'pausedMs' | 'lastSeen' | 'finished'>, now = Date.now()): number {
  if (!save.startedAt) return 0;
  const end = save.finished ? save.lastSeen : now;
  return Math.max(0, end - save.startedAt - save.pausedMs);
}

export function idleClock() {
  return { startedAt: 0, pausedMs: 0, lastSeen: 0, finished: false };
}

/** Restore the daily clock. Empty unfinished saves have not started playing yet. */
export function clockFromDaily(save: DailySave | null, at = Date.now()) {
  if (!save || (!save.guesses.length && !save.finished)) return idleClock();
  if (save.finished) {
    return { startedAt: save.startedAt, pausedMs: save.pausedMs, lastSeen: save.lastSeen, finished: true };
  }
  return {
    startedAt: save.startedAt,
    pausedMs: save.pausedMs + Math.max(0, at - save.lastSeen),
    lastSeen: at,
    finished: false,
  };
}

/** One staircase row: greens for digits in place, yellows for misplaced, a dot when the guess missed. */
export function shareRow(bulls: number, cows: number): string {
  const placed = Math.max(0, bulls);
  const misplaced = Math.max(0, cows);
  if (placed === 0 && misplaced === 0) return '·';
  return '🟩'.repeat(placed) + '🟨'.repeat(misplaced);
}

/** Clipboard text for a finished daily. Digits stay off the share. */
export function dailyShare(
  history: readonly { bulls: number; cows: number }[],
  day: string,
  clockLabel: string,
  assistName: string,
): string {
  const tries = history.length === 1 ? '1 try' : `${history.length} tries`;
  const rows = history.map((guess) => shareRow(guess.bulls, guess.cows)).join('\n');
  return `CRAQ\nDaily ${day}\n\n${rows}\n\n${tries} · ${clockLabel} · ${assistName}`;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const s = String(total % 60).padStart(2, '0');
  const mTotal = Math.floor(total / 60);
  const h = Math.floor(mTotal / 60);
  const m = String(mTotal % 60).padStart(2, '0');
  if (h > 0) return `${h}:${m}:${s}`;
  return `${m}:${s}`;
}

export function gameForMode(mode: GameMode, versus?: GameState): GameState {
  if (mode === 'versus') return versus ?? createGame(randomCode());
  const day = dayKey();
  const save = todaySave();
  return save ? replayGame(dailyCode(day), save.guesses) : createGame(dailyCode(day));
}
