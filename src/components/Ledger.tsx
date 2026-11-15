import { useEffect, useRef, type ReactNode } from 'react';
import type { GuessRecord } from '../engine';
import './Ledger.css';

interface Props {
  history: GuessRecord[];
  /** The guess being typed, shown faintly under the log; null when not playing. */
  draft: (number | null)[] | null;
  draftFocus: number;
  highlight: number | null;
  onHighlight: (digit: number | null) => void;
  showBarsHint: boolean;
  /** Sits under the loose belt instead of in its own column. */
  docked?: boolean;
  /** Clip has opened. The panel stays shut until the arm has swung. */
  revealed?: boolean;
  /** How-to card is using this spot. */
  concealed?: boolean;
  note?: ReactNode;
}

function flavor({ bulls, cows }: GuessRecord): { text: string; kind: string } | null {
  if (bulls === 4) return { text: 'CRACKED', kind: 'win' };
  if (bulls === 3) return { text: 'SO CLOSE', kind: 'hot' };
  if (bulls + cows === 4) return { text: 'ALL IN', kind: 'gold' };
  if (bulls + cows === 0) return { text: 'COLD', kind: 'cold' };
  if (bulls === 2) return { text: 'HOT', kind: 'hot' };
  return null;
}

export function Ledger({
  history,
  draft,
  draftFocus,
  highlight,
  onHighlight,
  showBarsHint,
  docked = false,
  revealed = false,
  concealed = false,
  note,
}: Props) {
  const listRef = useRef<HTMLOListElement>(null);
  const showDraft = draft !== null && draft.some((d) => d !== null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [history.length, showDraft]);

  const digitClass = (d: number) =>
    `ledger-digit${highlight === d ? ' lit' : ''}${highlight !== null && highlight !== d ? ' dim' : ''}`;

  return (
    <section
      className={['panel', 'ledger-panel', docked && 'docked', revealed && 'revealed', concealed && 'concealed']
        .filter(Boolean)
        .join(' ')}
      aria-label="Guess ledger"
    >
      <h2 className="panel-title">
        CRACK LOG
      </h2>

      {history.length === 0 ? (
        <div className="ledger-empty">
          <p className="ledger-empty-lead">Spin the tumblers.</p>
          <p>The vault hides 4 different digits.</p>
          <div className="legend">
            <span className="badge badge-bull">in place</span> right digit, right slot
          </div>
          <div className="legend">
            <span className="badge badge-cow">misplaced</span> right digit, wrong slot
          </div>
          {showBarsHint && <p>The coins warm from silver to gold as a digit gets more likely.</p>}
        </div>
      ) : (
        <ol className="ledger-list" ref={listRef}>
          {history.map((h, row) => {
            const tag = flavor(h);
            return (
              <li key={row} className="ledger-row">
                <span className="ledger-idx">{String(row + 1).padStart(2, '0')}</span>
                <span className="ledger-digits">
                  {h.guess.map((d, i) => (
                    <button
                      key={i}
                      type="button"
                      tabIndex={-1}
                      className={digitClass(d)}
                      onClick={() => onHighlight(highlight === d ? null : d)}
                    >
                      {d}
                    </button>
                  ))}
                </span>
                <span className="ledger-score">
                  {h.bulls + h.cows === 0 ? (
                    <span className="badge badge-none">no hits</span>
                  ) : (
                    <>
                      <span className={`badge ${h.bulls > 0 ? 'badge-bull' : 'badge-none'}`}>{h.bulls} in place</span>
                      <span className={`badge ${h.cows > 0 ? 'badge-cow' : 'badge-none'}`}>{h.cows} misplaced</span>
                    </>
                  )}
                </span>
                {tag && <span className={`ledger-tag tag-${tag.kind}`}>{tag.text}</span>}
              </li>
            );
          })}
          {showDraft && draft && (
            <li className="ledger-row ledger-draft" aria-label="Guess in progress">
              <span className="ledger-idx">{String(history.length + 1).padStart(2, '0')}</span>
              <span className="ledger-digits">
                {draft.map((d, i) => (
                  <span
                    key={i}
                    className={[
                      d === null ? 'ledger-digit empty' : digitClass(d),
                      i === draftFocus && 'focused',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {d ?? ''}
                  </span>
                ))}
              </span>
              <span className="ledger-score" aria-hidden>
                <span className="badge badge-pending">{'\u00a0'}</span>
                <span className="badge badge-pending">{'\u00a0'}</span>
              </span>
            </li>
          )}
        </ol>
      )}
      {note}
    </section>
  );
}
