import { useState } from 'react';
import { ASSIST_LEVELS, type AssistLevel } from '../engine';
import { ASSIST_NAMES } from './AssistButton';
import type { TourCoinSample, TourLogRow, TourSlide } from '../tour/tour';
import './AssistButton.css';
import './Ledger.css';
import './TourPopup.css';

interface Props {
  slides: readonly TourSlide[];
  index: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
}

function MiniAssist({ level }: { level: AssistLevel }) {
  const strength = ASSIST_LEVELS.indexOf(level);
  return (
    <span className="tour-assist-label" aria-hidden>
      <span className={`chip-btn assist-btn tour-mini-assist${strength === 0 ? ' off' : ''}`}>
        <span className="assist-bars">
          {[1, 2, 3].map((n) => (
            <span key={n} className={n <= strength ? 'on' : ''} />
          ))}
        </span>
        ASSIST
      </span>
      <span className="assist-tip tour-assist-tip">{ASSIST_NAMES[level]}</span>
    </span>
  );
}

function SampleCoins({ items }: { items: readonly TourCoinSample[] }) {
  return (
    <div className="tour-samples" aria-hidden>
      {items.map((coin) => (
        <span key={`${coin.look}-${coin.digit}`} className="tour-sample">
          <i
            className={`tour-sample-coin is-${coin.look}`}
            style={
              coin.look === 'fade'
                ? { ['--v' as string]: 0.22, ['--g' as string]: 0.19 }
                : coin.look === 'polish'
                  ? { ['--v' as string]: 0.82, ['--g' as string]: 0.94 }
                  : { ['--v' as string]: 1, ['--g' as string]: 1 }
            }
          >
            <span>
              <b>{coin.digit}</b>
            </span>
          </i>
          {coin.label && <em>{coin.label}</em>}
        </span>
      ))}
    </div>
  );
}

function Chip({ digit, circled }: { digit: number; circled?: boolean }) {
  return <span className={circled ? 'tour-chip is-circled' : 'tour-chip'}>{digit}</span>;
}

function SwapRow({ keep, pair }: { keep: readonly number[]; pair: readonly [number, number] }) {
  const [play, setPlay] = useState(0);
  return (
    <div className="tour-swap-wrap">
      <div key={play} className="tour-chips is-swap" aria-hidden>
        <Chip digit={keep[0]} />
        <Chip digit={keep[1]} />
        <span className="tour-swap-pair">
          <span className="tour-swap-arrow" aria-hidden>
            ⇄
          </span>
          <span className="tour-chip is-swap-a">{pair[0]}</span>
          <span className="tour-chip is-swap-b">{pair[1]}</span>
        </span>
      </div>
      <button type="button" className="tour-replay" onClick={() => setPlay((n) => n + 1)} aria-label="Replay swap">
        <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
          <path
            fill="currentColor"
            d="M12 5V1L7 6l5 5V7c3.3 0 6 2.7 6 6s-2.7 6-6 6-6-2.7-6-6H4c0 4.4 3.6 8 8 8s8-3.6 8-8-3.6-8-8-8z"
          />
        </svg>
      </button>
    </div>
  );
}

function ChipRow({
  digits,
  circle = [],
  plus = false,
  swap,
}: {
  digits: readonly number[];
  circle?: readonly number[];
  plus?: boolean;
  swap?: readonly [number, number];
}) {
  if (swap && digits.length === 4) {
    return <SwapRow keep={digits.slice(0, 2)} pair={swap} />;
  }
  if (plus && digits.length === 4) {
    return (
      <div className="tour-chips" aria-hidden>
        <Chip digit={digits[0]} circled={circle.includes(digits[0])} />
        <Chip digit={digits[1]} circled={circle.includes(digits[1])} />
        <span className="tour-plus">+</span>
        <Chip digit={digits[2]} circled={circle.includes(digits[2])} />
        <Chip digit={digits[3]} circled={circle.includes(digits[3])} />
      </div>
    );
  }
  return (
    <div className="tour-chips" aria-hidden>
      {digits.map((d, i) => (
        <Chip key={`${d}-${i}`} digit={d} circled={circle.includes(d)} />
      ))}
    </div>
  );
}

function badgeFor(clue: TourLogRow['clue']) {
  if (clue === 'cold') {
    return (
      <span className="ledger-score">
        <span className="badge badge-none">no hits</span>
      </span>
    );
  }
  return (
    <span className="ledger-score">
      <span className={`badge ${clue.bulls > 0 ? 'badge-bull' : 'badge-none'}`}>{clue.bulls} in place</span>
      <span className={`badge ${clue.cows > 0 ? 'badge-cow' : 'badge-none'}`}>{clue.cows} misplaced</span>
    </span>
  );
}

function tagFor(clue: TourLogRow['clue']) {
  if (clue === 'cold') return { text: 'COLD', kind: 'cold' };
  if (clue.bulls === 4) return { text: 'CRACKED', kind: 'win' };
  if (clue.bulls + clue.cows === 4) return { text: 'ALL IN', kind: 'gold' };
  return null;
}

function LogRows({ rows }: { rows: readonly TourLogRow[] }) {
  return (
    <ol className="tour-log">
      {rows.map((row) => {
        const tag = tagFor(row.clue);
        const circled = row.circle ?? [];
        return (
          <li key={row.idx} className="ledger-row">
            <span className="ledger-idx">{String(row.idx).padStart(2, '0')}</span>
            <span className="ledger-digits">
              {row.digits.map((d, i) => (
                <span key={i} className={circled.includes(d) ? 'ledger-digit is-circled' : 'ledger-digit'}>
                  {d}
                </span>
              ))}
            </span>
            {badgeFor(row.clue)}
            {tag && <span className={`ledger-tag tag-${tag.kind}`}>{tag.text}</span>}
          </li>
        );
      })}
    </ol>
  );
}

function inline(text: string) {
  return text.split(/(\[\[[^\]]+\]\])/g).map((part, i) => {
    const m = /^\[\[(bull|cow|none):([^\]]+)\]\]$/.exec(part);
    if (!m) return part;
    return (
      <span key={i} className={`badge badge-${m[1]}`}>
        {m[2]}
      </span>
    );
  });
}

function Copy({ text }: { text: string }) {
  return text.split('\n\n').map((para, i) => (
    <p key={i} className="tour-copy">
      {inline(para)}
    </p>
  ));
}

export function TourPopup({ slides, index, onNext, onBack, onSkip }: Props) {
  const slide = slides[index];
  if (!slide) return null;
  const last = index === slides.length - 1;
  return (
    <aside className="tour-pop" aria-label="Walkthrough">
      <div className="tour-pop-bar" />
      <div className="tour-pop-body">
        <p className="tour-kicker">WALKTHROUGH</p>
        {slide.title && <p className="tour-hello">{slide.title}</p>}
        {slide.assistLevel && <MiniAssist level={slide.assistLevel} />}
        {!slide.caption && slide.log && <LogRows rows={slide.log} />}
        <div key={index} className="tour-copy-block">
          <Copy text={slide.body} />
        </div>
        {slide.caption && slide.log && <LogRows rows={slide.log} />}
        {slide.caption && (
          <p className={slide.assistLevel ? 'tour-copy' : 'tour-caption'}>{inline(slide.caption)}</p>
        )}
        {slide.digits && (
          <ChipRow digits={slide.digits} circle={slide.circle} plus={slide.plus} swap={slide.swap} />
        )}
        {slide.extra && <ChipRow digits={slide.extra} />}
        {slide.coins && <SampleCoins items={slide.coins} />}
        <div className="tour-pop-nav">
          <button type="button" className="tour-arrow" onClick={onBack} disabled={index === 0} aria-label="Back">
            ‹
          </button>
          <div className="tour-dots" aria-hidden>
            {slides.map((_, i) => (
              <i key={i} className={i === index ? 'on' : ''} />
            ))}
          </div>
          {last ? (
            <button type="button" className="tour-next" onClick={onNext}>
              Go to game
            </button>
          ) : (
            <button type="button" className="tour-arrow" onClick={onNext} aria-label="Next">
              ›
            </button>
          )}
        </div>
        <button type="button" className="tour-skip" onClick={onSkip}>
          Skip
        </button>
      </div>
    </aside>
  );
}
