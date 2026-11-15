import './Coach.css';

interface Props {
  body: string;
  onSkip: () => void;
  skipLabel?: string;
  dup?: boolean;
  variant?: 'card' | 'note';
}

export function Coach({ body, onSkip, skipLabel = 'Skip', dup = false, variant = 'card' }: Props) {
  const skip = (
    <button type="button" className="coach-skip" onClick={onSkip}>
      {skipLabel}
    </button>
  );
  if (variant === 'note') {
    return (
      <div className="coach-note">
        <p>{body}</p>
        {dup && <p className="coach-dup">Each digit once.</p>}
        {skip}
      </div>
    );
  }
  return (
    <aside className="panel how-to coach-card" aria-label="Walkthrough">
      <h2 className="panel-title">WALKTHROUGH</h2>
      <p>{body}</p>
      {dup && <p className="coach-dup">Each digit once.</p>}
      {skip}
    </aside>
  );
}
