import type { AssistLevel, Code } from '../engine';
import { ASSIST_NAMES } from './AssistButton';
import './WinModal.css';

interface Props {
  secret: Code;
  guesses: number;
  /** Strongest assist used during the game. */
  assist: AssistLevel;
  onPlayAgain: () => void;
  onClose: () => void;
  /** Daily result. Absent in Practice. */
  timeLabel?: string;
  againLabel?: string;
  onShare?: () => void;
  shared?: boolean;
  /** Emoji rows for the daily share, one per guess. */
  shareRows?: string[];
  nextLabel?: string;
  onNext?: () => void;
  lead?: string;
  nextHint?: string;
}

function rank(guesses: number): { title: string; blurb: string } {
  if (guesses <= 4) return { title: 'LEGENDARY', blurb: 'They will write songs about this heist.' };
  if (guesses <= 6) return { title: 'MASTER THIEF', blurb: 'Smooth. Silent. Rich.' };
  if (guesses <= 8) return { title: 'PRO CRACKER', blurb: 'The vault never stood a chance.' };
  return { title: 'ROOKIE', blurb: 'Loud, messy, and loaded with loot.' };
}

export function WinModal({
  secret,
  guesses,
  assist,
  onPlayAgain,
  onClose,
  timeLabel,
  againLabel = 'CRACK ANOTHER VAULT',
  onShare,
  shared = false,
  shareRows,
  nextLabel,
  onNext,
  lead,
  nextHint,
}: Props) {
  const { title, blurb } = rank(guesses);
  const assistSecond = Boolean(nextHint && onNext && nextLabel);
  return (
    <div className="win-overlay" role="dialog" aria-label="Vault cracked" onClick={onClose}>
      <div className="win-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="win-close" onClick={onClose} aria-label="Close and view the board">
          ✕
        </button>
        <div className="win-kicker">ACCESS GRANTED</div>
        <h2 className="win-title">VAULT CRACKED!</h2>
        <div className="win-code">
          {secret.map((d, i) => (
            <span key={i} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
              {d}
            </span>
          ))}
        </div>
        {lead && <p className="win-lead">{lead}</p>}
        <div className="win-stats">
          <div>
            <b>{guesses}</b>
            <small>{guesses === 1 ? 'attempt' : 'attempts'}</small>
            <small className="win-assist">{timeLabel ? `${timeLabel} · ${ASSIST_NAMES[assist]}` : ASSIST_NAMES[assist]}</small>
          </div>
          <div>
            <b className="win-rank">{title}</b>
            <small>{blurb}</small>
          </div>
        </div>
        {shareRows && shareRows.length > 0 && <pre className="win-share">{shareRows.join('\n')}</pre>}
        {onShare && (
          <button type="button" className="win-btn" onClick={onShare} autoFocus>
            {shared ? 'COPIED' : 'SHARE'}
          </button>
        )}
        {onNext && nextLabel && !assistSecond && (
          <button type="button" className="win-btn" onClick={onNext} autoFocus={!onShare}>
            {nextLabel}
          </button>
        )}
        <button
          type="button"
          className={onShare || (onNext && !assistSecond) ? 'win-review' : 'win-btn'}
          onClick={onPlayAgain}
          autoFocus={!onShare && (!onNext || assistSecond)}
        >
          {againLabel}
        </button>
        {assistSecond && (
          <div className="win-hint-row">
            <span className="win-hint">{nextHint}</span>
            <button type="button" className="win-assist-btn" onClick={onNext}>
              {nextLabel}
            </button>
          </div>
        )}
        <button type="button" className="win-review" onClick={onClose}>
          Review the board
        </button>
      </div>
    </div>
  );
}
