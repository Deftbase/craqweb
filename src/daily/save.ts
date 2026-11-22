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

/** This browser already won today's daily. Practice / other devices do not count. */
export function dailyCrackedToday(save: DailySave | null = todaySave()): boolean {
  return save?.finished === true;
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

export type ShareMark = 'bull' | 'cow' | 'miss';

/** Packed marks for one guess. Misses are a single dot, not four empty slots. */
export function shareMarks(bulls: number, cows: number): ShareMark[] {
  const placed = Math.max(0, bulls);
  const misplaced = Math.max(0, cows);
  if (placed === 0 && misplaced === 0) return ['miss'];
  return [
    ...Array.from({ length: placed }, () => 'bull' as const),
    ...Array.from({ length: misplaced }, () => 'cow' as const),
  ];
}

/** One staircase row: green circles in place, yellow misplaced, a white circle when the guess missed. */
export function shareRow(bulls: number, cows: number): string {
  const marks = shareMarks(bulls, cows);
  if (marks.length === 1 && marks[0] === 'miss') return '⚪';
  return marks.map((mark) => (mark === 'bull' ? '🟢' : '🟡')).join('');
}

/** Packed bulls/cows per guess, spoiler-free. */
export function encodeHeist(history: readonly { bulls: number; cows: number }[]): string {
  return history.map((guess) => `${guess.bulls}${guess.cows}`).join('-');
}

export function decodeHeist(code: string): { bulls: number; cows: number }[] | null {
  if (!code) return null;
  const rows: { bulls: number; cows: number }[] = [];
  for (const part of code.split('-')) {
    if (!/^[0-4][0-4]$/.test(part)) return null;
    const bulls = Number(part[0]);
    const cows = Number(part[1]);
    if (bulls + cows > 4) return null;
    rows.push({ bulls, cows });
  }
  return rows.length ? rows : null;
}

export function heistFromHash(hash = typeof window === 'undefined' ? '' : window.location.hash) {
  const match = hash.match(/^#heist=([0-4][0-4](?:-[0-4][0-4])*)$/);
  return match ? decodeHeist(match[1]) : null;
}

export function heistListenUrl(history: readonly { bulls: number; cows: number }[], origin?: string) {
  const base =
    origin ??
    (typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`);
  return `${base}#heist=${encodeHeist(history)}`;
}

export function dailyFromSearch(search = typeof window === 'undefined' ? '' : window.location.search): boolean {
  return new URLSearchParams(search).has('daily');
}

/** Landing link for a friend to play today's vault. Digits stay off. */
export function dailyPlayUrl(origin?: string) {
  const base =
    origin ??
    (typeof window === 'undefined' ? '' : `${window.location.origin}${window.location.pathname}`);
  return `${base.replace(/\/$/, '')}/?daily`;
}

export function challengeText(guesses: number, url: string): string {
  const tries = guesses === 1 ? '1 guess' : `${guesses} guesses`;
  return `I cracked the code in ${tries}, can you beat that?\n${url}`;
}

/** Clipboard / share text for a finished vault. Digits stay off the share. */
export function dailyShare(
  history: readonly { bulls: number; cows: number }[],
  clockLabel: string | undefined,
  assistName: string,
  listenUrl?: string,
): string {
  const tries = history.length === 1 ? '1 try' : `${history.length} tries`;
  const rows = history.map((guess) => shareRow(guess.bulls, guess.cows)).join('\n');
  const header = [`CRAQ ${tries}`, clockLabel, assistName].filter(Boolean).join(' · ');
  if (!listenUrl) return `${header}\n\n${rows}`;
  return `${header}\n\n${rows}\n\nPlay your break in\n${listenUrl}`;
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
