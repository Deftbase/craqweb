import { useSyncExternalStore } from 'react';
import { ASSIST_LEVELS, type AssistLevel } from '../engine';

const STORAGE_KEY = 'vault-cracker:assist';
const DEFAULT_LEVEL: AssistLevel = 'medium';

function load(): AssistLevel {
  return DEFAULT_LEVEL;
}

let level = load();
const listeners = new Set<() => void>();

export function setAssist(next: AssistLevel) {
  level = next;
  localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((l) => l());
}

export function nextAssist(current: AssistLevel): AssistLevel {
  return ASSIST_LEVELS[(ASSIST_LEVELS.indexOf(current) + 1) % ASSIST_LEVELS.length];
}

export function useAssist(): AssistLevel {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => level,
  );
}
