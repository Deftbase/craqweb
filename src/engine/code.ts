import { CODE_LENGTH, type Code } from './types';

let cachedCodes: Code[] | null = null;

/** All P(10, 4) = 5,040 codes made of unique digits. */
export function allCodes(): Code[] {
  if (cachedCodes) return cachedCodes;
  const codes: Code[] = [];
  for (let a = 0; a < 10; a++)
    for (let b = 0; b < 10; b++) {
      if (b === a) continue;
      for (let c = 0; c < 10; c++) {
        if (c === a || c === b) continue;
        for (let d = 0; d < 10; d++) {
          if (d === a || d === b || d === c) continue;
          codes.push([a, b, c, d]);
        }
      }
    }
  cachedCodes = codes;
  return codes;
}

export function randomCode(rng: () => number = Math.random): Code {
  const pool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, CODE_LENGTH);
}

export function isValidCode(code: readonly (number | null)[]): code is Code {
  return (
    code.length === CODE_LENGTH &&
    code.every((d) => d !== null && Number.isInteger(d) && d >= 0 && d <= 9) &&
    new Set(code).size === CODE_LENGTH
  );
}

export function codeKey(code: Code): string {
  return code.join('');
}
