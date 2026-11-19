import { useEffect, useRef, useState } from 'react';
import { playCrackTune, stopCrackTune } from '../audio/crackTune';
import type { Score } from '../engine';
import './HeistListen.css';

interface Props {
  scores: Score[];
  crackedToday: boolean;
  onClose: () => void;
  onPlayToday: () => void;
}

export function HeistListen({ scores, crackedToday, onClose, onPlayToday }: Props) {
  const [playing, setPlaying] = useState(false);
  const playTimer = useRef<number>(0);

  useEffect(() => {
    return () => {
      window.clearTimeout(playTimer.current);
      stopCrackTune();
    };
  }, []);

  const finishPlay = () => {
    window.clearTimeout(playTimer.current);
    setPlaying(false);
  };

  const handlePlay = () => {
    window.clearTimeout(playTimer.current);
    if (playing) {
      stopCrackTune();
      finishPlay();
      return;
    }
    const duration = playCrackTune(scores);
    if (duration <= 0) return;
    setPlaying(true);
    playTimer.current = window.setTimeout(finishPlay, duration * 1000);
  };

  return (
    <div className="heist-listen-overlay" role="dialog" aria-label="Hear the heist">
      <div className="heist-listen-card">
        <button type="button" className="heist-listen-close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        <h2 className="heist-listen-title">Hear the heist</h2>
        <button
          type="button"
          className="heist-listen-play"
          onClick={handlePlay}
          aria-pressed={playing}
          aria-label={playing ? 'Stop the heist' : 'Play the heist'}
          autoFocus
        >
          {playing ? (
            <span className="heist-listen-bars" aria-hidden>
              <span />
              <span />
              <span />
              <span />
            </span>
          ) : (
            <svg viewBox="0 0 24 24" width="34" height="34" aria-hidden>
              <path d="M8 5.2v13.6L19.2 12 8 5.2z" fill="currentColor" />
            </svg>
          )}
        </button>
        {!crackedToday && (
          <div className="heist-listen-links">
            <button type="button" className="heist-listen-today" onClick={onPlayToday}>
              Craq today's code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
