import type { Score } from '../engine';

export const SIXTEENTH = 0.155;
/** Rest + Am ring after the last try. Kept whole so the cadence never hard-cuts. */
export const RING_SECONDS = 2.56;
export const TUNE_CAP_SECONDS = 10;

const BULL = [220.0, 261.63, 329.63, 440.0];
const COW = [293.66, 392.0];
const LOG = [110.0, 130.81, 164.81, 220.0];
const PARTIALS: readonly [number, number][] = [
  [1, 1],
  [2.003, 0.36],
  [3.01, 0.16],
  [4.02, 0.08],
  [5.04, 0.04],
];

type Slot = 'bull' | 'cow' | 'miss';

interface TuneBar {
  slots: Slot[];
  bulls: number;
  cows: number;
}

interface Graph {
  dry: GainNode;
  conv: GainNode;
  drums: GainNode;
}

let ctx: AudioContext | null = null;
let active: { master: GainNode; token: number } | null = null;
let token = 0;

export function barSeconds(score: Score): number {
  return (score.bulls === 0 && score.cows === 0 ? 8 : 4) * SIXTEENTH;
}

export function tuneSeconds(history: readonly Score[]): number {
  return history.reduce((sum, guess) => sum + barSeconds(guess), 0) + RING_SECONDS;
}

/** Last 10s of whole tries, always including the win, never starting mid-bar. */
export function clipCrackHistory<T extends Score>(history: readonly T[]): T[] {
  if (history.length <= 1) return [...history];
  let start = history.length - 1;
  let bars = barSeconds(history[start]);
  for (let i = history.length - 2; i >= 0; i--) {
    const next = barSeconds(history[i]);
    if (bars + next + RING_SECONDS > TUNE_CAP_SECONDS) break;
    bars += next;
    start = i;
  }
  return history.slice(start);
}

export function stopCrackTune() {
  if (!active || !ctx) return;
  const { master } = active;
  active = null;
  const t = ctx.currentTime;
  try {
    master.gain.cancelScheduledValues(t);
    master.gain.setValueAtTime(Math.max(master.gain.value, 0.0001), t);
    master.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
  } catch {
    /* empty */
  }
  window.setTimeout(() => {
    try {
      master.disconnect();
    } catch {
      /* empty */
    }
  }, 80);
}

export function playCrackTune(history: readonly Score[]): number {
  stopCrackTune();
  const clipped = clipCrackHistory(history);
  if (clipped.length === 0) return 0;
  const ac = audio();
  if (!ac) return 0;

  const master = ac.createGain();
  const dry = ac.createGain();
  const conv = ac.createGain();
  const drums = ac.createGain();
  dry.gain.value = 0.58;
  conv.gain.value = 0.18;
  drums.gain.value = 1.15;
  const delay = ac.createDelay();
  delay.delayTime.value = 0.12;
  const fb = ac.createGain();
  fb.gain.value = 0.12;
  const damp = ac.createBiquadFilter();
  damp.type = 'lowpass';
  damp.frequency.value = 2200;
  const drumSend = ac.createGain();
  drumSend.gain.value = 0.06;
  dry.connect(master);
  conv.connect(delay);
  delay.connect(damp);
  damp.connect(fb);
  fb.connect(delay);
  damp.connect(master);
  drums.connect(master);
  drums.connect(drumSend);
  drumSend.connect(delay);
  master.gain.value = 0.36;
  master.connect(ac.destination);

  const graph: Graph = { dry, conv, drums };
  const startIndex = history.length - clipped.length;
  const t0 = ac.currentTime + 0.04;
  const six = SIXTEENTH;
  const bars = eventsFor(clipped);
  let cursor = t0;
  bars.forEach((bar, i) => {
    const b = startIndex + i;
    const empty = bar.bulls === 0 && bar.cows === 0;
    const last = i === bars.length - 1;
    const ticks = empty ? 8 : 4;
    const barT = cursor;
    groove(ac, graph, barT, ticks, six, b, empty);
    if (!empty) {
      let bi = 0;
      let ci = 0;
      bar.slots.forEach((kind, slot) => {
        const n = b * 4 + slot;
        const t = t16(barT, slot, six);
        if (kind === 'bull') {
          const hold = last && bi === 3 ? 2.1 : six * 1.45;
          piano(ac, graph, BULL[Math.min(bi, 3)], t, hold, vel(n, 0.55, 0.75));
          bi += 1;
        } else if (kind === 'cow') {
          piano(ac, graph, COW[ci % 2], t, six * 1.2, vel(n, 0.36, 0.48));
          ci += 1;
        }
      });
    }
    cursor += six * ticks;
  });

  const end = cursor + 0.12;
  hat(ac, graph, end, 0.7, true);
  clap(ac, graph, end, 0.9);
  logDrum(ac, graph, LOG[0], end, 1.0);
  logDrum(ac, graph, LOG[3], end + 0.05, 0.8);
  (
    [
      [55.0, 0.4, 2.5],
      [110.0, 0.48, 2.4],
      [164.81, 0.3, 2.2],
      [220.0, 0.34, 2.1],
      [261.63, 0.26, 2.0],
      [329.63, 0.22, 1.9],
    ] as const
  ).forEach((note, i) => {
    piano(ac, graph, note[0], end + 0.04 + i * 0.03, note[2], note[1]);
  });

  const duration = tuneSeconds(clipped);
  const fadeAt = t0 + duration - 0.4;
  master.gain.setValueAtTime(0.36, fadeAt);
  master.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

  const playToken = (token += 1);
  active = { master, token: playToken };
  window.setTimeout(() => {
    if (active?.token === playToken) {
      active = null;
      try {
        master.disconnect();
      } catch {
        /* empty */
      }
    }
  }, duration * 1000 + 80);

  return duration;
}

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function hash01(n: number) {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

function vel(n: number, lo: number, hi: number) {
  return lo + hash01(n) * (hi - lo);
}

function t16(barT: number, i: number, six: number) {
  const late = i % 2 === 1 ? 0.012 : 0;
  return barT + i * six + late + (hash01(i + 3) - 0.5) * 0.006;
}

function noiseBuf(ac: AudioContext, dur: number) {
  const buffer = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

function piano(ac: AudioContext, graph: Graph, freq: number, t: number, dur: number, v: number) {
  const out = ac.createGain();
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(1400 + v * 2800, t);
  lp.frequency.exponentialRampToValueAtTime(900, t + dur * 0.5);
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(v, t + 0.014);
  out.gain.exponentialRampToValueAtTime(v * 0.3, t + Math.min(0.1, dur * 0.35));
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  lp.connect(out);
  out.connect(graph.dry);
  out.connect(graph.conv);
  PARTIALS.forEach((p, n) => {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq * p[0], t);
    g.gain.value = p[1] / (1 + n * 0.15);
    osc.connect(g).connect(lp);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  });
}

function logDrum(ac: AudioContext, graph: Graph, freq: number, t: number, v: number) {
  const osc = ac.createOscillator();
  const og = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq * 1.08, t);
  osc.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(0.95 * v, t + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(900, t);
  osc.connect(og).connect(lp).connect(graph.dry);
  osc.start(t);
  osc.stop(t + 0.24);
  const click = ac.createOscillator();
  const cg = ac.createGain();
  click.type = 'triangle';
  click.frequency.setValueAtTime(freq * 3, t);
  cg.gain.setValueAtTime(0.0001, t);
  cg.gain.exponentialRampToValueAtTime(0.18 * v, t + 0.002);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
  click.connect(cg).connect(graph.drums);
  click.start(t);
  click.stop(t + 0.05);
}

function kick(ac: AudioContext, graph: Graph, t: number, v: number) {
  const osc = ac.createOscillator();
  const og = ac.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(78, t);
  osc.frequency.exponentialRampToValueAtTime(36, t + 0.11);
  og.gain.setValueAtTime(0.0001, t);
  og.gain.exponentialRampToValueAtTime(1.2 * v, t + 0.004);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.26);
  osc.connect(og).connect(graph.drums);
  osc.start(t);
  osc.stop(t + 0.28);
}

function clap(ac: AudioContext, graph: Graph, t: number, v: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf(ac, 0.12);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1800;
  bp.Q.value = 0.9;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
  src.connect(hp).connect(bp).connect(g).connect(graph.drums);
  src.start(t);
  src.stop(t + 0.12);
  const src2 = ac.createBufferSource();
  src2.buffer = noiseBuf(ac, 0.08);
  const g2 = ac.createGain();
  g2.gain.setValueAtTime(0.0001, t + 0.012);
  g2.gain.exponentialRampToValueAtTime(0.45 * v, t + 0.016);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
  src2.connect(bp).connect(g2).connect(graph.drums);
  src2.start(t + 0.012);
  src2.stop(t + 0.1);
}

function shaker(ac: AudioContext, graph: Graph, t: number, v: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuf(ac, 0.035);
  const bp = ac.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 7800;
  bp.Q.value = 0.55;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 5000;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.28 * v, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);
  src.connect(hp).connect(bp).connect(g).connect(graph.drums);
  src.start(t);
  src.stop(t + 0.04);
}

function talkingDrum(ac: AudioContext, graph: Graph, t: number, v: number) {
  const osc = ac.createOscillator();
  const og = ac.createGain();
  const bp = ac.createBiquadFilter();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(310, t);
  osc.frequency.exponentialRampToValueAtTime(168, t + 0.14);
  osc.frequency.setValueAtTime(250, t + 0.16);
  osc.frequency.exponentialRampToValueAtTime(140, t + 0.34);
  bp.type = 'bandpass';
  bp.frequency.value = 480;
  bp.Q.value = 1.2;
  og.gain.setValueAtTime(0.0001, t);
  og.gain.linearRampToValueAtTime(0.75 * v, t + 0.03);
  og.gain.linearRampToValueAtTime(0.22 * v, t + 0.14);
  og.gain.linearRampToValueAtTime(0.68 * v, t + 0.2);
  og.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
  osc.connect(bp).connect(og);
  og.connect(graph.dry);
  osc.start(t);
  osc.stop(t + 0.44);
}

function hat(ac: AudioContext, graph: Graph, t: number, v: number, open: boolean) {
  const dur = open ? 0.18 : 0.045;
  const src = ac.createBufferSource();
  src.buffer = noiseBuf(ac, dur);
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = open ? 5500 : 7000;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime((open ? 0.55 : 0.85) * v, t + 0.004);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(hp).connect(g).connect(graph.drums);
  src.start(t);
  src.stop(t + dur + 0.01);
}

function groove(ac: AudioContext, graph: Graph, barT: number, ticks: number, six: number, b: number, empty: boolean) {
  for (let s = 0; s < ticks; s++) {
    const t = t16(barT, s, six);
    const h = vel(b * 16 + s, 0.45, 0.7);
    hat(ac, graph, t, empty ? h * 1.35 : h * 0.85, false);
    shaker(ac, graph, t, vel(b * 16 + s + 7, 0.7, 1.05) * (s % 2 === 1 ? 1.15 : 0.75));
    shaker(ac, graph, t + six * 0.48, vel(b * 16 + s + 11, 0.45, 0.7));
  }
  kick(ac, graph, t16(barT, 0, six), vel(b, 0.9, 1.1));
  if (ticks === 8) {
    kick(ac, graph, t16(barT, 3, six), vel(b + 4, 0.55, 0.75));
    clap(ac, graph, t16(barT, 4, six), vel(b + 8, 0.8, 1.05));
    logDrum(ac, graph, LOG[0], t16(barT, 0, six), 0.9);
    logDrum(ac, graph, LOG[2], t16(barT, 3, six), 0.7);
    logDrum(ac, graph, LOG[3], t16(barT, 6, six), 0.75);
    if (b % 2 === 1) talkingDrum(ac, graph, t16(barT, 6, six), 0.85);
  } else {
    kick(ac, graph, t16(barT, 3, six), vel(b + 4, 0.35, 0.5));
    clap(ac, graph, t16(barT, 2, six), vel(b + 8, 0.85, 1.1));
    logDrum(ac, graph, empty ? LOG[1] : LOG[0], t16(barT, 0, six), 0.85);
    logDrum(ac, graph, LOG[2], t16(barT, 3, six), 0.7);
    if (b % 2 === 1) talkingDrum(ac, graph, t16(barT, 3, six) + 0.02, 0.48);
  }
}

function eventsFor(history: readonly Score[]): TuneBar[] {
  return history.map((guess) => {
    const slots: Slot[] = [];
    for (let i = 0; i < guess.bulls; i++) slots.push('bull');
    for (let i = 0; i < guess.cows; i++) slots.push('cow');
    while (slots.length < 4) slots.push('miss');
    return { slots: slots.slice(0, 4), bulls: guess.bulls, cows: guess.cows };
  });
}
