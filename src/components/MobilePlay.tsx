import type { RefObject } from 'react';
import { canSubmit, type AssistLevel, type DigitSignal, type GameState } from '../engine';
import { sfx } from '../audio/sfx';
import type { AssistPhase, TourKind, UnlockPhase } from '../tour/tour';
import { tourDeadTips } from '../tour/tour';
import { CX, CY, CoinBelt, RIG_H, RIG_W } from './CoinBelt';
import { Ledger } from './Ledger';
import { TourPopup } from './TourPopup';
import { VaultDoor, type VaultPhase } from './VaultDoor';
import './MobilePlay.css';

const OUTER = RIG_W - CX - 12;
const SPAN = `${OUTER * 2}px`;

interface Toast {
  id: number;
  title: string;
  detail?: string;
  kind: string;
}

interface Props {
  state: GameState;
  spectrum: DigitSignal[];
  assist: AssistLevel;
  playing: boolean;
  highlight: number | null;
  onHighlight: (digit: number | null) => void;
  phase: VaultPhase;
  reject: { index: number; tick: number } | null;
  toast: Toast | null;
  breach: number;
  breachBefore: number | null;
  onDigit: (digit: number) => void;
  onSubmit: () => void;
  onFocusSlot: (index: number) => void;
  tour: TourKind | null;
  tourPlaying: boolean;
  tourSlide: number;
  walk: UnlockPhase | AssistPhase | null;
  assistWalk: AssistPhase | null;
  onTourNext: () => void;
  onTourBack: () => void;
  onTourSkip: () => void;
  helpOpen: boolean;
  demoAvailable: boolean;
  mode: 'versus' | 'daily';
  hasGuess: boolean;
  onPlayDemo: () => void;
  onTryGame: () => void;
  onCloseHelp: () => void;
  onAssistTour: () => void;
  vaultRef: RefObject<HTMLDivElement>;
}

export function MobilePlay({
  state,
  spectrum,
  assist,
  playing,
  highlight,
  onHighlight,
  phase,
  reject,
  toast,
  breach,
  breachBefore,
  onDigit,
  onSubmit,
  onFocusSlot,
  tour,
  tourPlaying,
  tourSlide,
  walk,
  assistWalk,
  onTourNext,
  onTourBack,
  onTourSkip,
  helpOpen,
  demoAvailable,
  mode,
  hasGuess,
  onPlayDemo,
  onTryGame,
  onCloseHelp,
  onAssistTour,
  vaultRef,
}: Props) {
  return (
    <div className="mobile-play">
      <div className="mobile-vault" style={{ ['--span' as string]: SPAN }}>
        <div
          className="mobile-rig"
          style={{
            width: RIG_W,
            height: RIG_H,
            ['--rig-w' as string]: `${RIG_W}px`,
            ['--rig-h' as string]: `${RIG_H}px`,
            ['--cx' as string]: `${CX}px`,
            ['--cy' as string]: `${CY}px`,
          }}
        >
          <VaultDoor
            ref={vaultRef}
            slots={state.slots}
            revealCode={playing ? null : state.secret}
            focusIndex={state.focusIndex}
            onFocusSlot={onFocusSlot}
            submitTick={state.history.length}
            breach={breach}
            breachBefore={playing && state.history.length > 0 ? breachBefore : null}
            phase={phase}
            reject={reject}
            interactive={playing}
            cheer={toast}
            onPlayDemo={
              demoAvailable && !tour && !helpOpen && playing && !hasGuess && mode !== 'daily' ? onPlayDemo : undefined
            }
          />
          <CoinBelt
            slots={state.slots}
            spectrum={spectrum}
            assist={assist}
            canSubmit={canSubmit(state)}
            disabled={!playing || Boolean(tour && !tourPlaying)}
            onDigit={onDigit}
            onSubmit={onSubmit}
            open={false}
            hintDigits={tourPlaying && walk ? walk.play : []}
            digitTips={tour === 'unlock' ? tourDeadTips(walk?.dead ?? []) : undefined}
            forceDead={walk?.dead ?? assistWalk?.dead ?? []}
          />
        </div>
      </div>
      {walk && !tourPlaying && !helpOpen && playing && (
        <TourPopup
          key={`${tour}-${state.history.length}-${assist}`}
          slides={walk.slides}
          index={tourSlide}
          onNext={onTourNext}
          onBack={onTourBack}
          onSkip={onTourSkip}
        />
      )}
      {helpOpen && (
        <aside className="how-to mobile-how-to" aria-label="How to play">
          <button type="button" className="mobile-how-to-close" onClick={onCloseHelp} aria-label="Close">
            ✕
          </button>
          <h2 className="panel-title">HOW TO PLAY</h2>
          <p>
            Guess the unique 4 digit code that unlocks the vault.{' '}
            <span className="how-rose">No digits are repeated in the code.</span>
          </p>
          <p>Each guess gives you a clue.</p>
          <div className="how-example" aria-hidden>
            <span className="ledger-idx">01</span>
            <span className="ledger-digits">
              <span>4</span>
              <span>8</span>
              <span>2</span>
              <span>7</span>
            </span>
            <span className="ledger-score">
              <span className="badge badge-bull">1 in place</span>
              <span className="badge badge-cow">2 misplaced</span>
            </span>
          </div>
          <p className="how-keys">
            <span className="how-key">
              <span className="badge badge-bull">1 in place</span>
              means one digit is in the right slot.
            </span>
            <span className="how-key">
              <span className="badge badge-cow">2 misplaced</span>
              means two digits are in the code, but in the wrong slots.
            </span>
          </p>
          {!tour && (
            <div className="how-tour">
              <button type="button" className="how-demo" onClick={onPlayDemo}>
                Play Demo
              </button>
              <p className="how-links">
                <button
                  type="button"
                  className="how-try"
                  onClick={() => {
                    sfx.key();
                    onTryGame();
                  }}
                >
                  try game
                </button>
                <span className="how-dot" aria-hidden>
                  ·
                </span>
                <button type="button" className="how-assist-link" onClick={onAssistTour}>
                  how assist works
                </button>
              </p>
            </div>
          )}
        </aside>
      )}

      {state.history.length > 0 && (
        <div className="mobile-log">
          <Ledger
            history={state.history}
            draft={playing ? state.slots : null}
            draftFocus={state.focusIndex}
            highlight={highlight}
            onHighlight={onHighlight}
            showBarsHint={assist === 'medium' || assist === 'heavy'}
            revealed
          />
        </div>
      )}
    </div>
  );
}
