import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AssistLevel, DigitSignal } from '../engine';
import { PointingFinger } from './PointingFinger';
import './CoinBelt.css';

interface Props {
  slots: (number | null)[];
  spectrum: DigitSignal[];
  assist: AssistLevel;
  canSubmit: boolean;
  disabled: boolean;
  onDigit: (digit: number) => void;
  onSubmit: () => void;
  /** Loose arm has swung out. False until the first guess. */
  open: boolean;
  onArmClick?: () => void;
  armLabel?: string;
  /** The loose arm can be clicked in either pose. */
  armToggle?: boolean;
  /** Coins the walkthrough wants the player to tap. */
  hintDigits?: readonly number[];
  /** Bite-sized walkthrough notes on specific digits. */
  digitTips?: { readonly [digit: number]: string };
  /** Shown on a digit only while the finger is pointing at it. */
  hintTips?: { readonly [digit: number]: string };
  /** Digits the walkthrough has proven out. Grey them like Assist. */
  forceDead?: readonly number[];
}

export const CY = 238;
const R = 218;
const BELT = 29;
const FROM = 16;
const TO = 142;
const HUG_END = 322;
const SWING = 62;
const LOG_W = 300;
const LOG_LEFT = 16;
const CRACK_FROM = 164;
const CRACK_TO = 196;
const CRACK_WIDTH = 52;
const LABEL_R = 340;
const ORDER = [1, 2, 3, 4, 5, 6, 7, 8, 9, 0] as const;

function at(cx: number, deg: number, r = R): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(rad), CY + r * Math.sin(rad)];
}

/** Tip x when the vault center is at 0, so the real center can leave room for the log. */
function tipOffset(): number {
  const hinge = at(0, HUG_END);
  const end = at(0, 270);
  const a = (SWING * Math.PI) / 180;
  const dx = end[0] - hinge[0];
  const dy = end[1] - hinge[1];
  return hinge[0] + dx * Math.cos(a) - dy * Math.sin(a);
}

export const CX = LOG_LEFT + LOG_W - 2 - tipOffset();
export const RIG_W = CX + R + BELT + 12;
export const RIG_H = CY + R + BELT + 12;

function polar(deg: number, r: number): [number, number] {
  return at(CX, deg, r);
}

function turn(p: [number, number], deg: number, origin: [number, number]): [number, number] {
  const a = (deg * Math.PI) / 180;
  const dx = p[0] - origin[0];
  const dy = p[1] - origin[1];
  return [origin[0] + dx * Math.cos(a) - dy * Math.sin(a), origin[1] + dx * Math.sin(a) + dy * Math.cos(a)];
}

const spots = ORDER.map((digit, i) => {
  const deg = FROM + (i * (TO - FROM)) / (ORDER.length - 1);
  const [x, y] = polar(deg, R);
  const lift = 60;
  return { digit, x, y, lx: ((CX - x) / R) * lift, ly: ((CY - y) / R) * lift };
});

const [bx1, by1] = polar(FROM - 4, R);
const [bx2, by2] = polar(TO + 4, R);
const beltPath = `M ${bx1} ${by1} A ${R} ${R} 0 0 1 ${bx2} ${by2}`;
const outer = R + BELT;

const hugFrom = 360 - (FROM - 4);
const [hx1, hy1] = polar(hugFrom, R);
const p0 = polar(HUG_END, R);
const p3 = polar(270, R);
const hugPath = `M ${hx1} ${hy1} A ${R} ${R} 0 0 0 ${p0[0]} ${p0[1]}`;
const armRest = `M ${p0[0]} ${p0[1]} A ${R} ${R} 0 0 0 ${p3[0]} ${p3[1]}`;
const tipAtOpen = turn(p3, SWING, p0);
export const LOG_TIP_X = tipAtOpen[0];
export const LOG_TIP_Y = tipAtOpen[1];

function armPath(deg: number): { d: string; hub: [number, number] } {
  const tip = turn(p3, deg, p0);
  return {
    d: `M ${p0[0]} ${p0[1]} A ${R} ${R} 0 0 0 ${tip[0]} ${tip[1]}`,
    hub: turn([CX, CY], deg, p0),
  };
}

const [ex1, ey1] = polar(CRACK_TO, R);
const [ex2, ey2] = polar(CRACK_FROM, R);
const enterPath = `M ${ex1} ${ey1} A ${R} ${R} 0 0 0 ${ex2} ${ey2}`;
const ENTER_MID = (CRACK_FROM + CRACK_TO) / 2;
const [enterFingerX, enterFingerY] = polar(ENTER_MID - 10, R);
const labelY = polar(ENTER_MID, R)[1];

function labelAt(deg: number): [number, number] {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [CX + LABEL_R * Math.cos(rad), labelY - LABEL_R + LABEL_R * Math.sin(rad)];
}

const [lx1, ly1] = labelAt(196);
const [lx2, ly2] = labelAt(164);
const labelPath = `M ${lx1} ${ly1} A ${LABEL_R} ${LABEL_R} 0 0 0 ${lx2} ${ly2}`;

function tipFor(signal: DigitSignal, showBars: boolean): string | null {
  switch (signal.state) {
    case 'untested':
      return showBars ? `${Math.round(signal.value * 100)}% likely` : 'Not tried yet';
    case 'dead':
      return 'Out · not in the code';
    case 'locked':
      return '100% · in the code';
    case 'active':
      return showBars ? `${Math.round(signal.value * 100)}% likely` : null;
  }
}

function warmth(signal: DigitSignal, showMarks: boolean, showBars: boolean): number {
  if (showMarks && signal.state === 'locked') return 1;
  if (!showBars || signal.state === 'dead') return 0;
  if (signal.state !== 'active' && signal.state !== 'untested') return 0;
  return Math.min(1, Math.max(0, (signal.value - 0.07) / 0.8));
}

function ring(signal: DigitSignal, showBars: boolean, triedGrey: boolean): number {
  if (showBars) {
    if (signal.state === 'locked') return 1;
    if (signal.state === 'dead') return 0;
    if (signal.state === 'active' || signal.state === 'untested') return signal.value;
    return 0;
  }
  /* Solo / Light: full grey rim after a digit has been tried. */
  if (triedGrey && signal.state === 'active') return 1;
  return 0;
}

export function CoinBelt({
  slots,
  spectrum,
  assist,
  canSubmit,
  disabled,
  onDigit,
  onSubmit,
  open,
  onArmClick,
  armLabel,
  armToggle = false,
  hintDigits = [],
  digitTips = {},
  hintTips = {},
  forceDead = [],
}: Props) {
  const showMarks = assist !== 'solo';
  const hasGuess = spectrum.some((d) => d.state !== 'untested');
  const showBars = (assist === 'medium' || assist === 'heavy') && hasGuess;
  const ready = canSubmit && !disabled;
  const [settledDead, setSettledDead] = useState<ReadonlySet<number>>(() => new Set());
  const deadKey = forceDead.join(',');
  useEffect(() => {
    if (!deadKey) {
      setSettledDead(new Set());
      return;
    }
    const next = new Set(deadKey.split(',').map(Number));
    const t = window.setTimeout(() => setSettledDead(next), 520);
    return () => window.clearTimeout(t);
  }, [deadKey]);
  const nextHint = hintDigits.find((d) => !slots.includes(d));
  const hintEnter = hintDigits.length > 0 && nextHint == null && ready;
  const armBase = useRef<SVGPathElement>(null);
  const armFace = useRef<SVGPathElement>(null);
  const armShade = useRef<SVGRadialGradientElement>(null);
  const angleRef = useRef(0);

  const apply = (deg: number) => {
    const { d, hub } = armPath(deg);
    armBase.current?.setAttribute('d', d);
    armFace.current?.setAttribute('d', d);
    armShade.current?.setAttribute('cx', hub[0].toFixed(2));
    armShade.current?.setAttribute('cy', hub[1].toFixed(2));
  };

  useLayoutEffect(() => {
    apply(angleRef.current);
  });

  useEffect(() => {
    const target = open ? SWING : 0;
    if (Math.abs(angleRef.current - target) < 0.01) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) {
      angleRef.current = target;
      apply(target);
      return;
    }
    const from = angleRef.current;
    const started = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const u = Math.min(1, (now - started) / 700);
      const e = u < 0.5 ? 2 * u * u : 1 - ((-2 * u + 2) ** 2) / 2;
      angleRef.current = from + (target - from) * e;
      apply(angleRef.current);
      if (u < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [open]);

  return (
    <div className={`coin-belt${disabled ? ' is-disabled' : ''}${armToggle ? ' has-log' : ''}`}>
      <svg className="belt" viewBox={`0 0 ${RIG_W} ${RIG_H}`}>
        <defs>
          <radialGradient id="coin-trough" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={outer}>
            <stop offset={(R - BELT) / outer} stopColor="#a9aebb" />
            <stop offset={(R - BELT + 7) / outer} stopColor="#d4d7df" />
            <stop offset={R / outer} stopColor="#eceef2" />
            <stop offset={(outer - 5) / outer} stopColor="#d8dbe2" />
            <stop offset="1" stopColor="#bfc3cd" />
          </radialGradient>
          <radialGradient id="coin-trough-arm" gradientUnits="userSpaceOnUse" cx={CX} cy={CY} r={outer} ref={armShade}>
            <stop offset={(R - BELT) / outer} stopColor="#a9aebb" />
            <stop offset={(R - BELT + 7) / outer} stopColor="#d4d7df" />
            <stop offset={R / outer} stopColor="#eceef2" />
            <stop offset={(outer - 5) / outer} stopColor="#d8dbe2" />
            <stop offset="1" stopColor="#bfc3cd" />
          </radialGradient>
        </defs>
        <path d={beltPath} fill="none" stroke="#b9bdc9" strokeWidth={BELT * 2 + 4} strokeLinecap="round" />
        <path d={beltPath} fill="none" stroke="url(#coin-trough)" strokeWidth={BELT * 2} strokeLinecap="round" />
        <path d={hugPath} fill="none" stroke="#b9bdc9" strokeWidth={BELT * 2 + 4} strokeLinecap="round" />
        <path d={hugPath} fill="none" stroke="url(#coin-trough)" strokeWidth={BELT * 2} strokeLinecap="round" />
        <path
          ref={armBase}
          className="arm"
          d={armRest}
          fill="none"
          stroke="#b9bdc9"
          strokeWidth={BELT * 2 + 4}
          strokeLinecap="round"
          onClick={armToggle ? onArmClick : undefined}
        />
        <path
          ref={armFace}
          className="arm"
          d={armRest}
          fill="none"
          stroke="url(#coin-trough-arm)"
          strokeWidth={BELT * 2}
          strokeLinecap="round"
          role={armToggle ? 'button' : undefined}
          aria-label={armToggle ? armLabel : undefined}
          onClick={armToggle ? onArmClick : undefined}
        />
        <circle cx={p0[0]} cy={p0[1]} r={6} fill="#3e4450" />
      </svg>

      <svg className="enter-arc" viewBox={`0 0 ${RIG_W} ${RIG_H}`}>
        <defs>
          <linearGradient id="enter-hot" gradientUnits="userSpaceOnUse" x1={ex1} y1="0" x2={ex2} y2="0">
            <stop offset="0" stopColor="#ff3d8b" />
            <stop offset="1" stopColor="#ff7a3d" />
          </linearGradient>
          <path id="enter-text" d={labelPath} />
        </defs>
        <g
          className={`enter-btn${ready ? ' ready' : ''}${hintEnter ? ' cue' : ''}`}
          role="button"
          aria-label="Enter"
          aria-disabled={!ready}
          onClick={() => ready && onSubmit()}
        >
          <path className="enter-base" d={enterPath} strokeWidth={CRACK_WIDTH + 4} />
          <path className="enter-face" d={enterPath} strokeWidth={CRACK_WIDTH} />
          <text className="enter-label" dominantBaseline="central">
            <textPath href="#enter-text" startOffset="50%" textAnchor="middle">
              ENTER
            </textPath>
          </text>
        </g>
      </svg>
      {hintEnter && (
        <PointingFinger
          className="coin-finger enter-finger"
          style={{ left: enterFingerX - 4, top: enterFingerY - 22 }}
        />
      )}

      {spots.map(({ digit, x, y, lx, ly }) => {
        const signal = spectrum[digit];
        const used = slots.includes(digit);
        const next = nextHint === digit;
        const knockedOut = forceDead.includes(digit);
        const fresh = signal.state === 'untested' && !knockedOut;
        const markClass = knockedOut
          ? null
          : fresh
            ? 'untested'
            : showMarks && (signal.state === 'dead' || signal.state === 'locked')
              ? signal.state
              : hasGuess && signal.state === 'active'
                ? 'active'
                : null;
        const tourTip = (next && hintTips[digit]) || digitTips[digit];
        const hoverTip = knockedOut
          ? null
          : fresh
            ? tipFor(signal, showBars)
            : showMarks && signal.state !== 'untested'
              ? tipFor(signal, showBars)
              : null;
        const tip = tourTip ?? hoverTip;
        return (
          <span key={digit}>
            <i className="socket" style={{ left: x, top: y }} />
            <button
              type="button"
              tabIndex={-1}
              className={[
                'coin',
                used && 'used',
                (knockedOut || (showMarks && signal.state === 'dead')) && 'dead',
                settledDead.has(digit) && 'settled',
                markClass,
                markClass === 'active' && !showBars && 'rim-grey',
                next && 'next',
                disabled && 'is-off',
                x > CX && 'tip-left',
                tourTip && 'has-tour-tip',
              ]
                .filter(Boolean)
                .join(' ')}
              style={{
                left: x,
                top: y,
                ['--v' as string]: ring(signal, showBars, hasGuess && !showBars),
                ['--g' as string]: warmth(signal, showMarks, showBars),
                ['--lx' as string]: `${lx}px`,
                ['--ly' as string]: `${ly}px`,
              }}
              aria-disabled={disabled || undefined}
              aria-label={tip ? `${digit}. ${tip}` : `${digit}`}
              onClick={() => {
                if (disabled) return;
                onDigit(digit);
              }}
            >
              <span>
                <b>{digit}</b>
              </span>
              {tip && (
                <em className={`tip${tourTip ? ' is-tour' : ''}${tourTip && tourTip.length > 40 ? ' is-wide' : ''}`}>
                  {tip}
                </em>
              )}
            </button>
            {next && (
              <PointingFinger
                className="coin-finger"
                style={{ left: x - 4, top: y - 18 }}
              />
            )}
          </span>
        );
      })}
    </div>
  );
}
