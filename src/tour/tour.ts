import { ASSIST_LEVELS, type AssistLevel, type GuessRecord } from '../engine';

export const TOUR_CODE = [3, 4, 8, 7] as const;

export const UNLOCK_GUESSES = [
  [1, 2, 3, 4],
  [1, 2, 5, 6],
  [7, 8, 9, 0],
  [5, 6, 9, 0],
  [3, 4, 7, 8],
  [3, 4, 8, 7],
] as const;

export const ASSIST_GUESSES = [
  [1, 2, 5, 6],
  [0, 3, 7, 9],
  [3, 4, 8, 7],
] as const;

export type TourKind = 'unlock' | 'assist';

export interface TourLogRow {
  idx: number;
  digits: readonly (number | string)[];
  clue: { bulls: number; cows: number } | 'cold';
  circle?: readonly (number | string)[];
}

export interface TourCoinSample {
  digit: number;
  look: 'fade' | 'polish' | 'lock';
  label?: string;
}

export interface TourSlide {
  title?: string;
  body: string;
  caption?: string;
  digits?: readonly number[];
  circle?: readonly number[];
  extra?: readonly number[];
  plus?: boolean;
  swap?: readonly [number, number];
  log?: readonly TourLogRow[];
  coins?: readonly TourCoinSample[];
  assistLevel?: AssistLevel;
}

export interface UnlockPhase {
  slides: readonly TourSlide[];
  play: readonly number[];
  dead: readonly number[];
}

export interface AssistPhase {
  cueAssist: boolean;
  slides: readonly TourSlide[];
  play: readonly number[];
  dead: readonly number[];
  need: AssistLevel | null;
  done: boolean;
}

export interface CoachBeat {
  body: string;
  glow: readonly number[];
  glowAlt?: readonly number[];
  digitTips?: { readonly [digit: number]: string };
  hintTips?: { readonly [digit: number]: string };
  cueAssist: boolean;
  quietCheer: boolean;
  done: boolean;
}

const LOG_1234: TourLogRow = { idx: 1, digits: UNLOCK_GUESSES[0], clue: { bulls: 0, cows: 2 } };
const LOG_1256: TourLogRow = { idx: 2, digits: UNLOCK_GUESSES[1], clue: 'cold' };
const LOG_7890: TourLogRow = { idx: 3, digits: UNLOCK_GUESSES[2], clue: { bulls: 0, cows: 2 } };
const LOG_5690: TourLogRow = { idx: 4, digits: UNLOCK_GUESSES[3], clue: 'cold' };
const LOG_3478: TourLogRow = { idx: 5, digits: UNLOCK_GUESSES[4], clue: { bulls: 2, cows: 2 } };
const LOG_ASSIST_ABCD: TourLogRow = { idx: 1, digits: ['A', 'B', 'C', 'D'], clue: 'cold' };
const LOG_ASSIST_COLD: TourLogRow = { idx: 1, digits: ASSIST_GUESSES[0], clue: 'cold' };
const LOG_ASSIST_WARM: TourLogRow = { idx: 2, digits: ASSIST_GUESSES[1], clue: { bulls: 0, cows: 2 } };

const INTRO: UnlockPhase = {
  play: UNLOCK_GUESSES[0],
  dead: [],
  slides: [
    {
      title: 'Welcome to Craq!!',
      body: 'Your goal is to guess the unique 4-digit code that unlocks the vault.',
    },
    {
      body: 'You do that by guessing the unique 4-digit number. Remember: no digits are repeated in the final code.',
    },
    { body: "Let's start with your first guess. Try 1 2 3 4.", digits: UNLOCK_GUESSES[0] },
  ],
};

const AFTER_1234: UnlockPhase = {
  play: UNLOCK_GUESSES[1],
  dead: [],
  slides: [
    {
      body: '[[none:0 in place]] means none of the digits you guessed are in the right position.\n\n[[cow:2 misplaced]] means that two of the digits you guessed are in the code, just in the wrong positions.',
      log: [LOG_1234],
    },
    {
      body: "So how do you know which two of these are in? Let's assume 1 and 2.",
      digits: UNLOCK_GUESSES[0],
      circle: [1, 2],
    },
    {
      body: "Keep 1 and 2, then add two new digits we haven't tried yet: 5 and 6.",
      digits: UNLOCK_GUESSES[1],
      plus: true,
    },
  ],
};

const AFTER_1256: UnlockPhase = {
  play: UNLOCK_GUESSES[2],
  dead: [1, 2, 5, 6],
  slides: [
    {
      body: 'Fantastic clue!! [[none:no hits]] means none of the digits 1, 2, 5, and 6 are in the code.',
      log: [LOG_1256],
    },
    {
      body: 'Comparing your first and second guess:',
      log: [{ ...LOG_1234, circle: [3, 4] }, LOG_1256],
      caption: '3 and 4 must then be the 2 misplaced digits in the code.',
    },
    {
      body: "Now we need to find the other 2 digits. Let's try four digits you've not tried yet.",
      digits: UNLOCK_GUESSES[2],
    },
  ],
};

const AFTER_7890: UnlockPhase = {
  play: UNLOCK_GUESSES[3],
  dead: [1, 2, 5, 6],
  slides: [
    {
      body: 'Interesting! The clue tells us that 2 of the digits are in the code but in the wrong positions.\n\nBut how do we know which two of these are in?',
      log: [LOG_7890],
    },
    {
      body: "Let's assume 9 and 0.",
      digits: UNLOCK_GUESSES[2],
      circle: [9, 0],
    },
    {
      body: "Now let's introduce two numbers we already know are not in the code: 5 and 6.",
      digits: UNLOCK_GUESSES[3],
      circle: [9, 0],
      plus: true,
    },
  ],
};

const AFTER_5690: UnlockPhase = {
  play: UNLOCK_GUESSES[4],
  dead: [1, 2, 5, 6, 9, 0],
  slides: [
    {
      body: 'Great clue!! [[none:no hits]] means none of the digits 5, 6, 9, or 0 are in the code.',
      log: [LOG_5690],
    },
    {
      body: 'Comparing your third and fourth guess:',
      log: [{ ...LOG_7890, circle: [7, 8] }, LOG_5690],
      caption: 'So 7 and 8 must be the 2 misplaced digits.',
    },
    {
      body: "Now we know all four digits — 3, 4, 7, and 8... but we don't know if they're in the correct order. Let's try it.",
      digits: UNLOCK_GUESSES[4],
      circle: [3, 4, 7, 8],
    },
  ],
};

const AFTER_3478: UnlockPhase = {
  play: UNLOCK_GUESSES[5],
  dead: [1, 2, 5, 6, 9, 0],
  slides: [
    {
      body: '[[bull:2 in place]] means two of these digits sit in the right position.\n\n[[cow:2 misplaced]] means the two other correct digits are in the wrong position.',
      log: [LOG_3478],
    },
    {
      body: "But we don't know which, so let's try a different order. We keep 3 and 4 but switch 7 and 8.",
      digits: UNLOCK_GUESSES[4],
      swap: [7, 8],
    },
  ],
};

const DECKS: readonly UnlockPhase[] = [INTRO, AFTER_1234, AFTER_1256, AFTER_7890, AFTER_5690, AFTER_3478];

const LIGHT_SLIDES: readonly TourSlide[] = [
  {
    assistLevel: 'light',
    body: 'When Assist (Light) is turned on, all digits in a guess that comes back with no hits (like below)',
    log: [LOG_ASSIST_ABCD],
    caption:
      "...are automatically greyed out. This indicates that there's zero likelihood they're part of the code.",
  },
  { assistLevel: 'light', body: 'See it live. Try 1 2 5 6.', digits: ASSIST_GUESSES[0] },
];

const MEDIUM_SLIDES: readonly TourSlide[] = [
  {
    assistLevel: 'medium',
    body: 'When Assist (Medium) is turned on, in addition to greying out digits, a likelihood ring is added to each leftover digit on the panel. The ring shows how likely that digit is in the code.',
  },
  {
    assistLevel: 'medium',
    body: 'After each guess, the likelihood ring grows or shrinks. Digits with low likelihood fade out slowly, while digits with higher likelihood look more polished.',
    coins: [
      { digit: 9, look: 'fade', label: '22% likely' },
      { digit: 4, look: 'polish', label: '68% likely' },
    ],
  },
  { assistLevel: 'medium', body: 'See it live. Try 0 3 7 9.', digits: ASSIST_GUESSES[1] },
];

const HEAVY_SLIDES: readonly TourSlide[] = [
  {
    assistLevel: 'heavy',
    body: 'When Assist (heavy) is turned on, it combines all the benefits of (light) and (medium), and also visibly marks digits that are confirmed to be in the code.',
  },
  {
    assistLevel: 'heavy',
    body: 'For example, after your first and second guess:',
    log: [LOG_ASSIST_COLD, LOG_ASSIST_WARM],
    caption:
      'The first guess had no hits, and the second had only [[cow:2 misplaced]] digits. So the two untried digits: 4 and 8, are proven to be in the code.',
    coins: [
      { digit: 4, look: 'lock' },
      { digit: 8, look: 'lock' },
    ],
  },
  { assistLevel: 'heavy', body: 'See it live. Try 3 4 8 7.', digits: ASSIST_GUESSES[2] },
];

const ASSIST_DECKS: readonly (readonly TourSlide[])[] = [LIGHT_SLIDES, MEDIUM_SLIDES, HEAVY_SLIDES];
const ASSIST_NEED: readonly AssistLevel[] = ['light', 'medium', 'heavy'];

export function unlockPhase(historyLength: number): UnlockPhase | null {
  return DECKS[historyLength] ?? null;
}

function assistDead(historyLength: number): readonly number[] {
  return historyLength >= 1 ? [1, 2, 5, 6] : [];
}

export function assistPhase(historyLength: number, assist: AssistLevel): AssistPhase {
  if (historyLength >= ASSIST_GUESSES.length) {
    return { cueAssist: false, slides: [], play: [], dead: assistDead(historyLength), need: null, done: true };
  }
  const need = ASSIST_NEED[historyLength];
  if (ASSIST_LEVELS.indexOf(assist) < ASSIST_LEVELS.indexOf(need)) {
    return { cueAssist: true, slides: [], play: [], dead: assistDead(historyLength), need, done: false };
  }
  return {
    cueAssist: false,
    slides: ASSIST_DECKS[historyLength],
    play: ASSIST_GUESSES[historyLength],
    dead: assistDead(historyLength),
    need,
    done: false,
  };
}

export function tourDeadTips(dead: readonly number[]): { readonly [digit: number]: string } {
  return Object.fromEntries(dead.map((d) => [d, 'Out']));
}

/** Next digit(s) the walkthrough will accept for the current slots. */
export function tourAllowedDigits(
  script: readonly number[],
  slots: readonly (number | null)[],
  alt?: readonly number[],
): number[] {
  const filled = slots.filter((d): d is number => d != null);
  const nextOf = (seq: readonly number[]): number | null => {
    if (filled.length >= seq.length) return null;
    if (!filled.every((d, i) => d === seq[i])) return null;
    return seq[filled.length];
  };
  const allowed = new Set<number>();
  const a = nextOf(script);
  if (a != null) allowed.add(a);
  if (alt) {
    const b = nextOf(alt);
    if (b != null) allowed.add(b);
  }
  if (allowed.size > 0) return [...allowed];
  const fallback = script.find((d) => !filled.includes(d));
  return fallback == null ? [] : [fallback];
}

export function isTourDigitAllowed(
  script: readonly number[],
  slots: readonly (number | null)[],
  digit: number,
  alt?: readonly number[],
): boolean {
  if (script.length === 0) return true;
  return tourAllowedDigits(script, slots, alt).includes(digit);
}

function sameCode(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((d, i) => d === b[i]);
}

function clueOf(row: GuessRecord): string {
  const hits = row.bulls + row.cows;
  if (hits === 0) return 'No hits. None of these digits are in the code.';
  if (row.bulls === 0) {
    return `${row.cows === 1 ? '1 digit is' : `${row.cows} digits are`} in the code, in the wrong slot${row.cows === 1 ? '' : 's'}.`;
  }
  if (row.cows === 0) {
    return `${row.bulls === 1 ? '1 digit is' : `${row.bulls} digits are`} in the right slot.`;
  }
  return `${row.bulls} in place, ${row.cows} misplaced.`;
}

function offScript(row: GuessRecord, next: readonly number[]): CoachBeat {
  return {
    body: `${clueOf(row)} Follow the finger to the next numbers.`,
    glow: next,
    cueAssist: false,
    quietCheer: true,
    done: false,
  };
}

export function assistCoach(history: readonly GuessRecord[], assist: AssistLevel): CoachBeat {
  const last = history[history.length - 1];
  if (last?.bulls === 4) {
    return { body: '', glow: [], cueAssist: false, quietCheer: false, done: true };
  }
  const phase = assistPhase(history.length, assist);
  if (phase.done) {
    return { body: '', glow: [], cueAssist: false, quietCheer: false, done: true };
  }
  if (history.length > 0 && last && !sameCode(last.guess, ASSIST_GUESSES[history.length - 1])) {
    return offScript(last, phase.play.length ? phase.play : ASSIST_GUESSES[Math.min(history.length, ASSIST_GUESSES.length - 1)]);
  }
  return {
    body: '',
    glow: phase.cueAssist ? [] : phase.play,
    cueAssist: phase.cueAssist,
    quietCheer: true,
    done: false,
  };
}

export function tourCoach(kind: TourKind, history: readonly GuessRecord[], assist: AssistLevel): CoachBeat {
  if (kind === 'unlock') {
    const phase = unlockPhase(history.length);
    return {
      body: '',
      glow: phase?.play ?? [],
      cueAssist: false,
      quietCheer: true,
      done: !phase,
    };
  }
  return assistCoach(history, assist);
}
