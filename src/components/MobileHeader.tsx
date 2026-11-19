import type { AssistLevel } from '../engine';
import type { GameMode } from '../daily/save';
import { AssistButton } from './AssistButton';
import './MobileHeader.css';

interface Props {
  mode: GameMode;
  onSwitchMode: (mode: GameMode) => void;
  helpOpen: boolean;
  onToggleHelp: () => void;
  showResults: boolean;
  onResults: () => void;
  assist: AssistLevel;
  assistCue: boolean;
  onAssist: () => void;
  muted: boolean;
  onToggleMute: () => void;
  dayLabel: string;
  clockLabel: string;
  streak?: number;
  onNewGame: () => void;
}

export function MobileHeader({
  mode,
  onSwitchMode,
  helpOpen,
  onToggleHelp,
  showResults,
  onResults,
  assist,
  assistCue,
  onAssist,
  muted,
  onToggleMute,
  dayLabel,
  clockLabel,
  streak = 0,
  onNewGame,
}: Props) {
  return (
    <header className="header header-phone">
      <h1 className="logo">CRAQ</h1>
      <div className="header-phone-row header-phone-row-modes">
        <div className="mode-switch" role="group" aria-label="Game mode">
          <button
            type="button"
            className={mode === 'versus' ? 'on' : ''}
            aria-pressed={mode === 'versus'}
            onClick={() => onSwitchMode('versus')}
          >
            PRACTICE
          </button>
          <button
            type="button"
            className={mode === 'daily' ? 'on' : ''}
            aria-pressed={mode === 'daily'}
            onClick={() => onSwitchMode('daily')}
          >
            DAILY
          </button>
        </div>
        <button
          type="button"
          className={`chip-btn${helpOpen ? ' on' : ''}`}
          aria-expanded={helpOpen}
          onClick={onToggleHelp}
        >
          HOW TO PLAY
        </button>
        {showResults ? (
          <button type="button" className="chip-btn results-btn" onClick={onResults}>
            🏆 RESULTS
          </button>
        ) : (
          <span className="header-phone-slot" aria-hidden />
        )}
      </div>
      <div className="header-phone-row">
        <AssistButton level={assist} cue={assistCue} onClick={onAssist} />
        <button
          type="button"
          className={`chip-btn sound-btn${muted ? ' is-off' : ''}`}
          onClick={onToggleMute}
          aria-label={muted ? 'Unmute sound' : 'Mute sound'}
        >
          <span className="sound-on" aria-hidden>
            🔊 SOUND ON
          </span>
          <span className="sound-off" aria-hidden>
            🔇 SOUND OFF
          </span>
        </button>
        {mode === 'daily' ? (
          <span className="daily-clock" title="Today's shared vault">
            {dayLabel} · <span className="daily-time">{clockLabel}</span>
            {streak > 0 ? ` · ${streak}` : ''}
          </span>
        ) : (
          <button type="button" className="chip-btn hot" onClick={onNewGame}>
            NEW GAME
          </button>
        )}
      </div>
    </header>
  );
}
