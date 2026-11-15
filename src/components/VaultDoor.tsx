import { forwardRef } from 'react';
import './VaultDoor.css';

export type VaultPhase = 'idle' | 'unlocking' | 'glow' | 'burst';

interface Props {
  slots: (number | null)[];
  /** Shown in the tumblers once the vault opens. */
  revealCode: readonly number[] | null;
  focusIndex: number;
  onFocusSlot: (index: number) => void;
  submitTick: number;
  /** Progress toward opening, 0..1. */
  breach: number;
  /** Breach before the latest guess; null hides the gain readout. */
  breachBefore: number | null;
  phase: VaultPhase;
  reject: { index: number; tick: number } | null;
  interactive: boolean;
  cheer?: { id: number; title: string; detail?: string; kind: string } | null;
  onPlayDemo?: () => void;
}

const ARM_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315];
const UNLOCK_SPIN = 180;
const DEMO_LAYERS = 13;
const DEMO_DEPTH = 12;

export const VaultDoor = forwardRef<HTMLDivElement, Props>(function VaultDoor(
  { slots, revealCode, focusIndex, onFocusSlot, submitTick, breach, breachBefore, phase, reject, interactive, cheer, onPlayDemo },
  ref,
) {
  const spin = phase === 'idle' ? 0 : UNLOCK_SPIN;
  const pct = Math.round(breach * 100);
  const gain = breachBefore === null ? null : pct - Math.round(breachBefore * 100);
  const fillPct = breach * 100;
  const basePct = breachBefore === null ? fillPct : Math.min(fillPct, breachBefore * 100);

  return (
    <div className={`vault phase-${phase}`} ref={ref} tabIndex={-1} aria-label="Vault door">
      <div className="vault-frame">
        <div className="vault-door">

          {cheer && (
            <div
              key={cheer.id}
              className={`toast toast-${cheer.kind}${cheer.detail ? '' : ' toast-plain'}`}
              role="status"
            >
              <strong>{cheer.title}</strong>
              {cheer.detail && <span>{cheer.detail}</span>}
            </div>
          )}

          <div className="tumblers" key={submitTick} data-shudder={submitTick > 0}>
            {(revealCode ?? slots).map((d, i) => {
              const rejected = reject?.index === i;
              return (
                <button
                  key={rejected ? `r${reject!.tick}` : i}
                  type="button"
                  tabIndex={-1}
                  className={[
                    'tumbler',
                    d !== null && 'filled',
                    revealCode && 'revealed',
                    interactive && focusIndex === i && 'focused',
                    rejected && 'rejected',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  onClick={() => onFocusSlot(i)}
                  aria-label={`Slot ${i + 1}${d !== null ? `: ${d}` : ''}`}
                >
                  <span className="digit">{d ?? ''}</span>
                </button>
              );
            })}
            {submitTick > 0 && <div className="shutter" aria-hidden />}
          </div>

          <div className="stress" title="How close you are to breaching the vault">
            <div className="stress-label">
              <span>BREACH</span>
              <span>
                {pct}%
                {gain !== null && gain > 0 && (
                  <span key={submitTick} className="stress-gain up">
                    {' '}(+{gain})
                  </span>
                )}
              </span>
            </div>
            <div className="stress-track">
              <div className="stress-fill" style={{ width: `${fillPct}%` }}>
                {gain !== null && fillPct > basePct && (
                  <div
                    key={submitTick}
                    className="stress-new"
                    style={{ width: `${((fillPct - basePct) / fillPct) * 100}%` }}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="vault-core" aria-hidden />
        </div>

        <div className="vault-handle-shade" aria-hidden>
          <div className="vault-handle" style={{ transform: `rotate(${spin}deg)` }}>
            <div key={submitTick} className={`handle-jolt${submitTick > 0 ? ' kick' : ''}`}>
              <div className="handle-hub" />
              {ARM_ANGLES.map((a) => (
                <div key={a} className="handle-arm" style={{ transform: `rotate(${a}deg)` }}>
                  <span className="handle-spoke" />
                  <span className="handle-grip" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {onPlayDemo && (
          <button type="button" className="vault-demo" onClick={onPlayDemo}>
            <span className="vault-demo-scene">
              <span className="vault-demo-spin">
                {Array.from({ length: DEMO_LAYERS }, (_, i) => (
                  <span
                    key={i}
                    className="vault-demo-layer"
                    style={{
                      transform: `translateZ(${(i / (DEMO_LAYERS - 1) - 0.5) * DEMO_DEPTH}px)`,
                    }}
                    aria-hidden
                  />
                ))}
                <span className="vault-demo-face">Play Demo</span>
                <span className="vault-demo-face vault-demo-back">Play Demo</span>
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
});
