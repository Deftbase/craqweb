import { useSyncExternalStore } from 'react';

const STORAGE_KEY = 'vault-cracker:muted';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = typeof localStorage !== 'undefined' && localStorage.getItem(STORAGE_KEY) === '1';
const listeners = new Set<() => void>();

function audio(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

interface ToneOpts {
  freq: number;
  to?: number;
  type?: OscillatorType;
  dur?: number;
  gain?: number;
  delay?: number;
  attack?: number;
}

function tone({ freq, to, type = 'sine', dur = 0.15, gain = 0.3, delay = 0, attack = 0.005 }: ToneOpts) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(master);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

interface NoiseOpts {
  dur?: number;
  gain?: number;
  delay?: number;
  from?: number;
  to?: number;
  type?: BiquadFilterType;
}

function noise({ dur = 0.4, gain = 0.25, delay = 0, from = 3000, to = 400, type = 'bandpass' }: NoiseOpts) {
  const ac = audio();
  if (!ac || !master) return;
  const t = ac.currentTime + delay;
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.Q.value = 0.9;
  filter.frequency.setValueAtTime(from, t);
  filter.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.03);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter).connect(g).connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];

export const sfx = {
  key() {
    tone({ freq: 1800, to: 900, type: 'square', dur: 0.04, gain: 0.08 });
    tone({ freq: 140, type: 'triangle', dur: 0.06, gain: 0.18 });
  },
  /** Ta-daa, ta-daaaa. A new vault. */
  newVault() {
    const ac = audio();
    const out = master;
    if (!ac || !out) return;
    const hammer = ac.createBuffer(1, Math.ceil(ac.sampleRate * 0.03), ac.sampleRate);
    const data = hammer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const note = (freq: number, dur: number, gain: number, delay: number) => {
      const t = ac.currentTime + delay;
      [1, 0.52, 0.24, 0.12, 0.06, 0.03].forEach((amp, i) => {
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq * (i + 1) * (1 + i * i * 0.00035);
        const life = Math.max(0.06, dur * (1 - i * 0.11));
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain * amp, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + life);
        osc.connect(g).connect(out);
        osc.start(t);
        osc.stop(t + life + 0.02);
      });
      const src = ac.createBufferSource();
      src.buffer = hammer;
      const filter = ac.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1800;
      const ng = ac.createGain();
      ng.gain.setValueAtTime(gain * 0.3, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      src.connect(filter).connect(ng).connect(out);
      src.start(t);
      src.stop(t + 0.04);
    };
    note(392, 0.5, 0.18, 0);
    note(261.63, 0.6, 0.08, 0.15);
    note(523.25, 0.6, 0.2, 0.15);
    note(783.99, 0.4, 0.16, 0.48);
    [130.81, 261.63, 329.63, 392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      note(f, 1.2, i < 2 ? 0.1 : 0.08, 0.62),
    );
  },
  clunk() {
    tone({ freq: 220, to: 70, type: 'triangle', dur: 0.14, gain: 0.35 });
    noise({ dur: 0.08, gain: 0.12, from: 1800, to: 600 });
  },
  deny() {
    tone({ freq: 180, type: 'sawtooth', dur: 0.12, gain: 0.14 });
    tone({ freq: 150, type: 'sawtooth', dur: 0.14, gain: 0.14, delay: 0.1 });
  },
  hiss() {
    noise({ dur: 0.55, gain: 0.28, from: 5000, to: 500, type: 'highpass' });
    tone({ freq: 90, to: 50, type: 'sine', dur: 0.35, gain: 0.3 });
  },
  bull(i: number, delay = 0) {
    const f = PENTA[Math.min(PENTA.length - 1, i + 3)];
    tone({ freq: f, type: 'triangle', dur: 0.32, gain: 0.26, delay });
    tone({ freq: f * 2, type: 'sine', dur: 0.2, gain: 0.08, delay });
  },
  cow(i: number, delay = 0) {
    tone({ freq: PENTA[Math.min(PENTA.length - 1, i)], type: 'sine', dur: 0.22, gain: 0.18, delay });
  },
  dead(delay = 0) {
    tone({ freq: 300, to: 90, type: 'sawtooth', dur: 0.45, gain: 0.12, delay });
  },
  close(delay = 0) {
    [0, 0.09, 0.18].forEach((d, i) => tone({ freq: 660 + i * 220, type: 'square', dur: 0.1, gain: 0.08, delay: delay + d }));
  },
  unlock() {
    [0, 0.16, 0.32, 0.48].forEach((d, i) => {
      tone({ freq: 160 - i * 18, to: 60, type: 'triangle', dur: 0.2, gain: 0.35, delay: d });
      noise({ dur: 0.12, gain: 0.1, from: 2500, to: 700, delay: d });
    });
    noise({ dur: 1.1, gain: 0.25, from: 6000, to: 300, type: 'highpass', delay: 0.6 });
  },
  fanfare() {
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.51];
    notes.forEach((f, i) => {
      tone({ freq: f, type: 'square', dur: 0.22, gain: 0.1, delay: i * 0.11 });
      tone({ freq: f / 2, type: 'triangle', dur: 0.25, gain: 0.16, delay: i * 0.11 });
    });
  },
  coins(count = 14) {
    for (let i = 0; i < count; i++) {
      const d = i * 0.07 + Math.random() * 0.05;
      const f = 1800 + Math.random() * 1400;
      tone({ freq: f, type: 'square', dur: 0.06, gain: 0.05, delay: d });
      tone({ freq: f * 1.5, type: 'sine', dur: 0.12, gain: 0.05, delay: d + 0.05 });
    }
  },
};

export function setMuted(next: boolean) {
  muted = next;
  localStorage.setItem(STORAGE_KEY, next ? '1' : '0');
  if (next && ctx) void ctx.suspend();
  listeners.forEach((l) => l());
}

export function useMuted(): boolean {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => muted,
  );
}
