import type { Code, Score } from './types';

export function score(guess: Code, secret: Code): Score {
  let bulls = 0;
  let hits = 0;
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) bulls++;
    if (secret.includes(guess[i])) hits++;
  }
  return { bulls, cows: hits - bulls };
}
