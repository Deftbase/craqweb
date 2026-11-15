import type { TourKind } from './tour';

export interface TourSave {
  unlockDone: boolean;
  assistDone: boolean;
}

const KEY = 'vault-cracker:tour';

export function loadTour(): TourSave {
  if (typeof localStorage === 'undefined') return { unlockDone: false, assistDone: false };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { unlockDone: false, assistDone: false };
    const save = JSON.parse(raw) as Partial<TourSave>;
    return { unlockDone: Boolean(save.unlockDone), assistDone: Boolean(save.assistDone) };
  } catch {
    return { unlockDone: false, assistDone: false };
  }
}

export function saveTour(save: TourSave) {
  localStorage.setItem(KEY, JSON.stringify(save));
}

export function markTourDone(kind: TourKind) {
  const save = loadTour();
  if (kind === 'unlock') save.unlockDone = true;
  else save.assistDone = true;
  saveTour(save);
  return save;
}
