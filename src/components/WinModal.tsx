import { useEffect, useRef, useState } from 'react';
import { playCrackTune, stopCrackTune } from '../audio/crackTune';
import { challengeText, dailyPlayUrl, nextVaultLine } from '../daily/save';
import { shareCaption, shareOrCopy, type SharePayload } from '../daily/shareOut';
import type { AssistLevel, Code, Score } from '../engine';
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
  /** Daily crack log for the heist tune. Absent in Practice. */
  tuneScores?: Score[];
  sharePayload?: SharePayload;
  nextLabel?: string;
  onNext?: () => void;
  lead?: string;
  nextHint?: string;
  /** Daily streak on this browser. Absent in Practice. */
  streakLabel?: string;
  /** Daily win card shows a countdown instead of new vault. */
  nextVault?: boolean;
}

function heistGift(guesses: number) {
  return guesses <= 4
    ? 'A gift from us to you. We wrote a song about this one.'
    : 'A gift from us to you. We turned your attempts into a song.';
}

function rank(guesses: number): { title: string; blurb: string; tag: string } {
  if (guesses <= 4) return { title: 'LEGENDARY', blurb: 'They will write songs about this heist.', tag: 'gold' };
  if (guesses <= 6) return { title: 'SMOOTH OPERATOR', blurb: 'In and out. Nobody heard a thing.', tag: 'violet' };
  if (guesses <= 8) return { title: 'LOCKSMITH', blurb: 'A few wrong turns. Then the door gave up.', tag: 'hot' };
  return { title: 'BRUTE FORCE', blurb: 'You took the scenic route.', tag: 'steel' };
}

export function WinModal({
  secret,
  guesses,
  assist,
  onPlayAgain,
  onClose,
  timeLabel,
  againLabel = 'CRACK ANOTHER VAULT',
  tuneScores,
  sharePayload,
  nextLabel,
  onNext,
  lead,
  nextHint,
  streakLabel,
  nextVault = false,
}: Props) {
  const { title, blurb, tag } = rank(guesses);
  const assistSecond = Boolean(nextHint && onNext && nextLabel);
  const [playing, setPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const [challenged, setChallenged] = useState(false);
  const playTimer = useRef<number>(0);
  const copiedTimer = useRef<number>(0);
  const challengedTimer = useRef<number>(0);
  const showHeist = Boolean(tuneScores && tuneScores.length > 0);
  const [vaultIn, setVaultIn] = useState(nextVaultLine);

  useEffect(() => {
    return () => {
      window.clearTimeout(playTimer.current);
      window.clearTimeout(copiedTimer.current);
      window.clearTimeout(challengedTimer.current);
      stopCrackTune();
    };
  }, []);

  useEffect(() => {
    if (!nextVault) return;
    const tick = () => setVaultIn(nextVaultLine());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [nextVault]);

  const handlePlayTune = () => {
    if (!tuneScores || tuneScores.length === 0) return;
    window.clearTimeout(playTimer.current);
    if (playing) {
      stopCrackTune();
      setPlaying(false);
      return;
    }
    const duration = playCrackTune(tuneScores);
    if (duration <= 0) return;
    setPlaying(true);
    playTimer.current = window.setTimeout(() => setPlaying(false), duration * 1000);
  };

  const handleShare = async () => {
    if (!sharePayload) return;
    const result = await shareOrCopy(shareCaption(sharePayload));
    if (result !== 'copied') return;
    setCopied(true);
    window.clearTimeout(copiedTimer.current);
    copiedTimer.current = window.setTimeout(() => setCopied(false), 2000);
  };

  const handleChallenge = async () => {
    const result = await shareOrCopy(challengeText(guesses, dailyPlayUrl()));
    if (result !== 'copied') return;
    setChallenged(true);
    window.clearTimeout(challengedTimer.current);
    challengedTimer.current = window.setTimeout(() => setChallenged(false), 2000);
  };

  const meta = [guesses === 1 ? '1 attempt' : `${guesses} attempts`, timeLabel, ASSIST_NAMES[assist]]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="win-overlay" role="dialog" aria-label="You cracked the vault" onClick={onClose}>
      <div className="win-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="win-close" onClick={onClose} aria-label="Close and view the board">
          ✕
        </button>
        <h2 className="win-title">You cracked the vault!</h2>
        <div className="win-code">
          {secret.map((d, i) => (
            <span key={i} style={{ animationDelay: `${0.15 + i * 0.12}s` }}>
              {d}
            </span>
          ))}
        </div>
        <p className="win-meta">{meta}</p>
        {streakLabel && <p className="win-streak">{streakLabel}</p>}
        <div className="win-rank">
          <span className={`win-rank-tag win-rank-tag-${tag}`}>{title}</span>
          <small>{blurb}</small>
        </div>
        {lead && <p className="win-lead">{lead}</p>}
        {showHeist && (
          <div className="win-heist">
            <p className="win-heist-kicker">Hear the heist</p>
            <p className="win-heist-copy">{heistGift(guesses)}</p>
            <button type="button" className="win-heist-play" onClick={handlePlayTune} aria-pressed={playing}>
              {playing ? 'Playing' : 'Play your break in'}
            </button>
          </div>
        )}
        {sharePayload && (
          <button type="button" className="win-btn win-share-btn" onClick={() => void handleShare()} autoFocus>
            {copied ? 'COPIED TO CLIPBOARD' : 'SHARE'}
          </button>
        )}
        {onNext && nextLabel && !assistSecond && (
          <button type="button" className="win-btn" onClick={onNext} autoFocus={!sharePayload}>
            {nextLabel}
          </button>
        )}
        {sharePayload ? (
          <div className="win-foot">
            <p className="how-links win-links">
              <span className="win-challenge-wrap">
                <button type="button" className="how-try" onClick={() => void handleChallenge()}>
                  challenge a friend
                </button>
                {challenged && (
                  <span className="win-copied-tip" role="status">
                    Copied to clipboard
                  </span>
                )}
              </span>
              {!nextVault && (
                <>
                  <span className="how-dot" aria-hidden>
                    ·
                  </span>
                  <button type="button" className="how-try" onClick={onPlayAgain}>
                    new vault
                  </button>
                </>
              )}
            </p>
            {nextVault && <p className="win-next-vault">{vaultIn}</p>}
          </div>
        ) : (
          <button
            type="button"
            className={onNext && !assistSecond ? 'win-review' : 'win-btn'}
            onClick={onPlayAgain}
            autoFocus={!onNext || assistSecond}
          >
            {againLabel}
          </button>
        )}
        {assistSecond && (
          <div className="win-hint-row">
            <span className="win-hint">{nextHint}</span>
            <button type="button" className="win-assist-btn" onClick={onNext}>
              {nextLabel}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
