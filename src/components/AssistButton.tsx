import { useEffect, useRef, useState } from 'react';
import { ASSIST_LEVELS, type AssistLevel } from '../engine';
import { PointingFinger } from './PointingFinger';
import './AssistButton.css';

export const ASSIST_NAMES: Record<AssistLevel, string> = {
  solo: 'Solo',
  light: 'Light',
  medium: 'Medium',
  heavy: 'Heavy',
};

interface Props {
  level: AssistLevel;
  onClick: () => void;
  cue?: boolean;
}

export function AssistButton({ level, onClick, cue = false }: Props) {
  const strength = ASSIST_LEVELS.indexOf(level);
  const [tipped, setTipped] = useState(false);
  const tipTimer = useRef(0);
  useEffect(() => () => window.clearTimeout(tipTimer.current), []);
  return (
    <button
      type="button"
      className={`chip-btn assist-btn${strength === 0 ? ' off' : ''}${cue ? ' cue' : ''}${tipped ? ' is-tipped' : ''}`}
      onClick={() => {
        onClick();
        window.clearTimeout(tipTimer.current);
        setTipped(true);
        tipTimer.current = window.setTimeout(() => setTipped(false), 1400);
      }}
      aria-label={`Assist: ${ASSIST_NAMES[level]}. Click to change.`}
    >
      <span className="assist-bars" aria-hidden>
        {[1, 2, 3].map((n) => (
          <span key={n} className={n <= strength ? 'on' : ''} />
        ))}
      </span>
      ASSIST
      <span className="assist-tip" aria-hidden>
        {ASSIST_NAMES[level]}
      </span>
      {cue && <PointingFinger className="assist-finger" />}
    </button>
  );
}
