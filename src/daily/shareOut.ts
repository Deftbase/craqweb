import { dailyShare, shareMarks, type ShareMark } from './save';

const BULL = '#3fc21a';
const COW = '#ffaa00';
const MISS = '#c8c5d4';
const TEXT = '#1c1830';
const DIM = '#77728f';
const MAGENTA = '#ff3d8b';

export interface SharePayload {
  history: readonly { bulls: number; cows: number }[];
  day?: string;
  clockLabel?: string;
  assistName: string;
  listenUrl?: string;
  percentile?: string;
}

export function shareCaption(payload: SharePayload) {
  return dailyShare(
    payload.history,
    payload.clockLabel,
    payload.assistName,
    payload.listenUrl,
    payload.percentile,
  );
}

export function twitterShareUrl(text: string) {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export function messagesShareUrl(text: string) {
  return `sms:?body=${encodeURIComponent(text)}`;
}

/** Phone share sheet. Skip desktop Chrome’s share UI so clipboard copy can show. */
export function prefersNativeShare() {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) return true;
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

export async function shareOrCopy(text: string): Promise<'shared' | 'copied' | 'idle'> {
  if (prefersNativeShare()) {
    try {
      await navigator.share({ text });
      return 'shared';
    } catch (err) {
      if (isAbort(err)) return 'idle';
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

/** iPhone/Android get the OS sheet. Desktop browsers often have no share API at all. */
export async function tryNativeShare(payload: SharePayload): Promise<'shared' | 'idle' | 'unavailable'> {
  const text = shareCaption(payload);
  const file = await shareGridFile(payload);
  try {
    if (file && canShareFiles(file)) {
      await navigator.share({ files: [file], text, title: 'CRAQ' });
      return 'shared';
    }
    if (typeof navigator.share === 'function') {
      await navigator.share({ text, title: 'CRAQ' });
      return 'shared';
    }
  } catch (err) {
    if (isAbort(err)) return 'idle';
  }
  return 'unavailable';
}

export async function copyShareText(payload: SharePayload) {
  await navigator.clipboard.writeText(shareCaption(payload));
}

export async function downloadShareGrid(payload: SharePayload) {
  const file = await shareGridFile(payload);
  if (!file) return;
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function canShareFiles(file: File) {
  try {
    return typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
  } catch {
    return false;
  }
}

function isAbort(err: unknown) {
  return Boolean(err && typeof err === 'object' && 'name' in err && err.name === 'AbortError');
}

async function shareGridFile(payload: SharePayload): Promise<File | null> {
  const blob = await renderShareGridPng(payload);
  if (!blob) return null;
  return new File([blob], `craq-${payload.day ?? 'practice'}.png`, { type: 'image/png' });
}

async function renderShareGridPng(payload: SharePayload): Promise<Blob | null> {
  const rows = payload.history.map((guess) => shareMarks(guess.bulls, guess.cows));
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  try {
    await document.fonts.ready;
  } catch {
    /* empty */
  }

  const scale = 2;
  const pad = 40;
  const cell = 34;
  const gap = 7;
  const maxCells = rows.reduce((n, row) => Math.max(n, row.length), 1);
  const gridW = maxCells * cell + (maxCells - 1) * gap;
  const gridH = rows.length * cell + (rows.length - 1) * gap;
  const width = Math.max(360, pad * 2 + gridW);
  const height = pad + 36 + 22 + 28 + gridH + 36 + pad;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = MAGENTA;
  ctx.font = '28px "Bungee", "Russo One", sans-serif';
  ctx.fillText('CRAQ', pad, pad + 26);

  ctx.fillStyle = DIM;
  ctx.font = '14px "Russo One", sans-serif';
  ctx.fillText(payload.day ? `Daily ${payload.day}` : 'Practice', pad, pad + 50);

  const gx = pad;
  const gy = pad + 78;
  rows.forEach((row, r) => {
    row.forEach((mark, c) => {
      drawMark(ctx, gx + c * (cell + gap), gy + r * (cell + gap), cell, mark);
    });
  });

  const tries = payload.history.length === 1 ? '1 try' : `${payload.history.length} tries`;
  const caption = [tries, payload.clockLabel, payload.assistName, payload.percentile]
    .filter(Boolean)
    .join('  ·  ');
  ctx.fillStyle = TEXT;
  ctx.font = '13px "Russo One", sans-serif';
  ctx.fillText(caption, pad, gy + gridH + 28);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

function drawMark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, mark: ShareMark) {
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2 - 1, 0, Math.PI * 2);
  if (mark === 'miss') {
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = MISS;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    return;
  }
  ctx.fillStyle = mark === 'bull' ? BULL : COW;
  ctx.fill();
}
