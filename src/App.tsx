import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ASSIST_LEVELS,
  breachLevel,
  canSubmit,
  createGame,
  dailyCode,
  dayKey,
  randomCode,
  type AssistLevel,
  type Code,
  type GameState,
  type GuessRecord,
} from './engine';
import {
  clockFromDaily,
  dailyFromSearch,
  formatClock,
  gameForMode,
  dailyCrackedToday,
  heistFromHash,
  heistListenUrl,
  idleClock,
  loadMode,
  saveDaily,
  saveMode,
  todaySave,
  type GameMode,
} from './daily/save';
import { loadStreak, recordDailyWin, streakLine, visibleStreak } from './daily/streak';
import { loadTour, markTourDone } from './tour/save';
import {
  assistPhase,
  isTourDigitAllowed,
  TOUR_CODE,
  tourDeadTips,
  unlockPhase,
  type TourKind,
} from './tour/tour';
import { useGameSession } from './session/useGameSession';
import { setMuted, sfx, useMuted } from './audio/sfx';
import { nextAssist, setAssist, useAssist } from './settings/assist';
import { ASSIST_NAMES, AssistButton } from './components/AssistButton';
import { TourPopup } from './components/TourPopup';
import { VaultDoor, type VaultPhase } from './components/VaultDoor';
import { CoinBelt, CX, CY, LOG_TIP_X, LOG_TIP_Y, RIG_H, RIG_W } from './components/CoinBelt';
import { Ledger } from './components/Ledger';
import { ParticleBurst } from './components/ParticleBurst';
import { HeistListen } from './components/HeistListen';
import { MobileHeader } from './components/MobileHeader';
import { MobilePlay } from './components/MobilePlay';
import { WinModal } from './components/WinModal';
import { usePhone } from './layout/usePhone';
import './App.css';

interface Toast {
  id: number;
  title: string;
  detail?: string;
  kind: 'hot' | 'gold' | 'cold' | 'warm';
}

const CHEERS = ['WAY TO GO!!', 'NICE ONE!!', 'KEEP AT IT!!', 'GOOD EYE!!', 'YES!!'];
const CLOSE = ['SOLID ATTEMPT!!', 'RIGHT THERE!!', 'ALMOST!!', 'HOT ON IT!!', 'LOOKING SHARP!!'];
const MISSES = ['NEXT ONE!!', 'KEEP DIGGING!!', 'SHAKE IT OFF!!', 'STILL IN IT!!'];

function reactionFor(r: GuessRecord, attempt: number): Omit<Toast, 'id'> {
  const hits = r.bulls + r.cows;
  if (r.bulls === 3) return { title: 'SO CLOSE!!', detail: 'One to go.', kind: 'hot' };
  if (hits === 4) return { title: 'ALL FOUR!!', detail: 'Now put them in order.', kind: 'gold' };
  if (hits >= 2) return { title: CLOSE[attempt % CLOSE.length], kind: 'gold' };
  if (hits === 0) return { title: MISSES[attempt % MISSES.length], kind: 'cold' };
  return { title: CHEERS[attempt % CHEERS.length], kind: 'hot' };
}

const strongerAssist = (a: AssistLevel, b: AssistLevel) =>
  ASSIST_LEVELS.indexOf(a) >= ASSIST_LEVELS.indexOf(b) ? a : b;

export default function App() {
  const assist = useAssist();
  const [mode, setMode] = useState<GameMode>(() => {
    if (dailyFromSearch()) {
      saveMode('daily');
      return 'daily';
    }
    return loadMode();
  });
  const [demoAvailable, setDemoAvailable] = useState(() => !loadTour().unlockDone);
  const [tour, setTour] = useState<TourKind | null>(null);
  const [boot] = useState(() => gameForMode(mode));
  const { state, spectrum, actions } = useGameSession(assist, boot);
  const muted = useMuted();
  const [peakAssist, setPeakAssist] = useState<AssistLevel>(() =>
    mode === 'daily' ? (todaySave()?.peakAssist ?? assist) : assist,
  );
  const [clock, setClock] = useState(() => clockFromDaily(mode === 'daily' ? todaySave() : null));
  const [now, setNow] = useState(() => Date.now());
  const [heistListen, setHeistListen] = useState(() => heistFromHash());
  const [streak, setStreak] = useState(() => {
    const today = dayKey();
    if (todaySave()?.finished) return recordDailyWin(today).current;
    return visibleStreak(loadStreak(), today);
  });
  const versusRef = useRef<GameState | null>(null);
  const dailyDayRef = useRef(todaySave()?.day ?? dayKey());
  const vaultRef = useRef<HTMLDivElement>(null);
  const prevAssistRef = useRef<AssistLevel>(assist);
  const tourRef = useRef(tour);
  tourRef.current = tour;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const clockRef = useRef(clock);
  clockRef.current = clock;

  const [highlight, setHighlight] = useState<number | null>(null);
  const [resultsOpen, setResultsOpen] = useState(() => boot.status !== 'won');
  const [reject, setReject] = useState<{ index: number; tick: number } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [shake, setShake] = useState<'' | 'shake' | 'big-shake'>('');
  const [phase, setPhase] = useState<VaultPhase>('idle');
  const [burst, setBurst] = useState<{ trigger: number; origin: { x: number; y: number } | null }>({
    trigger: 0,
    origin: null,
  });

  const phone = usePhone();
  const playing = state.status === 'playing';
  const lastResult = state.history[state.history.length - 1];
  const hasGuess = state.history.length > 0;
  const [armExtended, setArmExtended] = useState(() => boot.history.length > 0);
  const [logShown, setLogShown] = useState(() => boot.history.length > 0);
  const [helpOpen, setHelpOpen] = useState(() => {
    const isPhone = typeof window !== 'undefined' && window.matchMedia('(max-width: 560px)').matches;
    if (isPhone) return false;
    return boot.history.length === 0 && !demoAvailable && loadMode() !== 'daily';
  });
  const helpDelayRef = useRef(0);
  const clearHelpDelay = () => {
    window.clearTimeout(helpDelayRef.current);
    helpDelayRef.current = 0;
  };
  const closeHelp = () => {
    clearHelpDelay();
    setHelpOpen(false);
  };
  const toggleHelp = () => {
    clearHelpDelay();
    setHelpOpen((open) => !open);
  };
  const [tourSlide, setTourSlide] = useState(0);
  const [tourPlaying, setTourPlaying] = useState(false);
  const tourPlayingRef = useRef(tourPlaying);
  tourPlayingRef.current = tourPlaying;
  const unlock = tour === 'unlock' ? unlockPhase(state.history.length) : null;
  const assistWalk = tour === 'assist' ? assistPhase(state.history.length, assist) : null;
  const walk = unlock ?? (assistWalk && !assistWalk.cueAssist && assistWalk.slides.length > 0 ? assistWalk : null);

  useEffect(() => {
    setArmExtended(hasGuess);
  }, [state.history.length]);

  useEffect(() => {
    if (!armExtended) {
      setLogShown(false);
      return;
    }
    const t = window.setTimeout(() => setLogShown(true), 420);
    return () => window.clearTimeout(t);
  }, [armExtended]);

  useEffect(() => {
    if (tour) return;
    if (demoAvailable || hasGuess) {
      clearHelpDelay();
      setHelpOpen(false);
      return;
    }
    if (phone) {
      clearHelpDelay();
      helpDelayRef.current = window.setTimeout(() => setHelpOpen(true), 1000);
      return () => clearHelpDelay();
    }
    setHelpOpen(true);
  }, [hasGuess, tour, demoAvailable, phone]);

  useEffect(() => {
    if (tour === 'unlock' || tour === 'assist') setAssist('solo');
  }, [tour]);

  useEffect(() => {
    if (!tour) return;
    setTourSlide(0);
    setTourPlaying(false);
  }, [state.history.length, tour]);

  useEffect(() => {
    if (tour !== 'assist') return;
    setTourSlide(0);
    setTourPlaying(false);
  }, [assist, tour]);

  useEffect(() => {
    if (tour === 'unlock' && state.status === 'won') {
      markTourDone('unlock');
      setDemoAvailable(false);
    }
    if (tour === 'assist' && state.status === 'won') markTourDone('assist');
  }, [tour, state.status]);

  const refocus = () => vaultRef.current?.focus({ preventScroll: true });

  const stateRef = useRef(state);
  stateRef.current = state;
  const assistRef = useRef(assist);
  assistRef.current = assist;

  useEffect(() => {
    if (stateRef.current.status === 'playing') setPeakAssist((p) => strongerAssist(p, assist));
  }, [assist]);

  const handleDigit = useCallback(
    (digit: number) => {
      const s = stateRef.current;
      if (s.status !== 'playing') return;
      const kind = tourRef.current;
      if (kind) {
        if (!tourPlayingRef.current) {
          sfx.deny();
          return;
        }
        const script =
          kind === 'unlock'
            ? unlockPhase(s.history.length)?.play
            : assistPhase(s.history.length, assistRef.current).play;
        if (!script?.length || !isTourDigitAllowed(script, s.slots, digit)) {
          sfx.deny();
          return;
        }
      }
      const dupAt = s.slots.findIndex((d, i) => d === digit && i !== s.focusIndex);
      if (dupAt !== -1) {
        sfx.deny();
        setReject({ index: dupAt, tick: Date.now() });
        return;
      }
      sfx.clunk();
      if (modeRef.current === 'daily' && !clockRef.current.startedAt && !clockRef.current.finished) {
        const at = Date.now();
        setClock({ startedAt: at, pausedMs: 0, lastSeen: at, finished: false });
      }
      actions.input(digit);
      setHighlight(digit);
    },
    [actions],
  );

  const handleBackspace = useCallback(() => {
    sfx.key();
    actions.backspace();
    setHighlight(null);
  }, [actions]);

  const handleClear = useCallback(() => {
    sfx.key();
    actions.clear();
    setHighlight(null);
    refocus();
  }, [actions]);

  const handleSubmit = useCallback(() => {
    if (!canSubmit(stateRef.current)) {
      if (stateRef.current.status === 'playing') sfx.deny();
      return;
    }
    sfx.hiss();
    navigator.vibrate?.(35);
    actions.submit();
    setHighlight(null);
    refocus();
  }, [actions]);

  const handleFocusSlot = useCallback(
    (i: number) => {
      const s = stateRef.current;
      if (s.status !== 'playing') return;
      if (tourRef.current) {
        if (tourRef.current && !tourPlayingRef.current) {
          sfx.deny();
          return;
        }
        const lastFilled = s.slots.reduce((acc, d, idx) => (d != null ? idx : acc), -1);
        if (i !== lastFilled) {
          sfx.deny();
          return;
        }
      }
      sfx.key();
      const filled = s.slots[i] !== null;
      actions.focusSlot(i);
      if (filled) actions.backspace();
      setHighlight(null);
    },
    [actions],
  );

  const resetBoard = (secret: Code) => {
    sfx.newVault();
    actions.newGame(secret);
    setPhase('idle');
    setToast(null);
    setHighlight(null);
    setResultsOpen(true);
    setArmExtended(false);
    setLogShown(false);
    refocus();
  };

  const persistDaily = () => {
    const at = Date.now();
    saveDaily({
      day: dailyDayRef.current,
      guesses: stateRef.current.history.map((h) => [...h.guess]),
      startedAt: clock.startedAt,
      pausedMs: clock.pausedMs,
      lastSeen: clock.finished ? clock.lastSeen : at,
      finished: stateRef.current.status !== 'playing',
      peakAssist,
    });
  };

  const beginTour = (kind: TourKind) => {
    sfx.key();
    if (!tourRef.current) prevAssistRef.current = assistRef.current;
    if (mode === 'daily') persistDaily();
    else if (mode === 'versus' && !tourRef.current) versusRef.current = stateRef.current;
    if (mode !== 'versus') {
      setMode('versus');
      saveMode('versus');
    }
    setTour(kind);
    setAssist('solo');
    setPeakAssist('solo');
    clearHelpDelay();
    setHelpOpen(false);
    setTourSlide(0);
    setTourPlaying(false);
    resetBoard([...TOUR_CODE]);
  };

  const endTour = (random: boolean, restoreAssist: boolean) => {
    const kind = tourRef.current;
    if (kind) markTourDone(kind);
    if (kind === 'unlock') setDemoAvailable(false);
    setTour(null);
    if (restoreAssist) setAssist(prevAssistRef.current);
    if (random) {
      setPeakAssist(restoreAssist ? prevAssistRef.current : assistRef.current);
      clearHelpDelay();
      setHelpOpen(true);
      resetBoard(randomCode());
    }
  };

  const handleNewGame = () => {
    if (tourRef.current) {
      endTour(true, true);
      return;
    }
    sfx.newVault();
    actions.newGame(randomCode());
    setPeakAssist(assistRef.current);
    setPhase('idle');
    setToast(null);
    setHighlight(null);
    setResultsOpen(true);
    refocus();
  };

  const shownMs = !clock.startedAt
    ? 0
    : Math.max(0, (clock.finished ? clock.lastSeen : now) - clock.startedAt - clock.pausedMs);

  const switchMode = (next: GameMode) => {
    if (next === mode) return;
    if (tourRef.current) {
      markTourDone(tourRef.current);
      setTour(null);
      setAssist(prevAssistRef.current);
    }
    sfx.key();
    if (mode === 'versus') versusRef.current = stateRef.current;
    if (mode === 'daily') {
      const at = Date.now();
      saveDaily({
        day: dailyDayRef.current,
        guesses: stateRef.current.history.map((h) => [...h.guess]),
        startedAt: clock.startedAt,
        pausedMs: clock.pausedMs,
        lastSeen: clock.finished ? clock.lastSeen : at,
        finished: stateRef.current.status !== 'playing',
        peakAssist,
      });
    }
    const nextState = next === 'versus' ? (versusRef.current ?? createGame(randomCode())) : gameForMode('daily');
    if (next === 'versus') versusRef.current = null;
    actions.restore(nextState);
    setMode(next);
    saveMode(next);
    setPhase('idle');
    setToast(null);
    setHighlight(null);
    setResultsOpen(nextState.status !== 'won');
    if (next === 'daily') {
      const save = todaySave();
      dailyDayRef.current = save?.day ?? dayKey();
      setPeakAssist(save?.peakAssist ?? assistRef.current);
      setClock(clockFromDaily(save));
    } else {
      setPeakAssist(assistRef.current);
      setClock(idleClock());
    }
    refocus();
  };

  useEffect(() => {
    if (mode !== 'daily' || clock.finished || !clock.startedAt) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [mode, clock.finished, clock.startedAt]);

  useEffect(() => {
    if (mode !== 'daily' || state.status === 'playing' || clock.finished) return;
    setClock((c) => ({ ...c, lastSeen: Date.now(), finished: true }));
    if (state.status === 'won') setStreak(recordDailyWin(dayKey()).current);
  }, [mode, state.status, clock.finished]);

  useEffect(() => {
    if (mode !== 'daily' || clock.finished || !clock.startedAt) return;
    const onVis = () => {
      const at = Date.now();
      if (document.hidden) {
        setClock((c) => (c.finished || !c.startedAt ? c : { ...c, lastSeen: at }));
      } else {
        setClock((c) =>
          c.finished || !c.startedAt ? c : { ...c, pausedMs: c.pausedMs + Math.max(0, at - c.lastSeen), lastSeen: at },
        );
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [mode, clock.finished, clock.startedAt]);

  useEffect(() => {
    if (mode !== 'daily') return;
    const roll = () => {
      const today = dayKey();
      if (today === dailyDayRef.current) return;
      dailyDayRef.current = today;
      actions.restore(createGame(dailyCode(today)));
      setClock(idleClock());
      setStreak(visibleStreak(loadStreak(), today));
      setPeakAssist(assistRef.current);
      setPhase('idle');
      setToast(null);
      setHighlight(null);
      setResultsOpen(true);
    };
    const id = window.setInterval(roll, 15000);
    document.addEventListener('visibilitychange', roll);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', roll);
    };
  }, [mode, actions]);

  useEffect(() => {
    if (mode !== 'daily') return;
    const flush = () => {
      saveDaily({
        day: dailyDayRef.current,
        guesses: stateRef.current.history.map((h) => [...h.guess]),
        startedAt: clock.startedAt,
        pausedMs: clock.pausedMs,
        lastSeen: clock.finished ? clock.lastSeen : Date.now(),
        finished: clock.finished || stateRef.current.status !== 'playing',
        peakAssist,
      });
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [mode, clock.startedAt, clock.pausedMs, clock.finished, peakAssist]);

  useEffect(() => {
    if (mode !== 'daily') return;
    saveDaily({
      day: dailyDayRef.current,
      guesses: state.history.map((h) => [...h.guess]),
      startedAt: clock.startedAt,
      pausedMs: clock.pausedMs,
      lastSeen: clock.finished ? clock.lastSeen : Date.now(),
      finished: clock.finished || state.status !== 'playing',
      peakAssist,
    });
  }, [mode, state.history, state.status, clock.startedAt, clock.pausedMs, clock.finished, peakAssist]);

  useEffect(() => {
    if (!reject) return;
    const t = window.setTimeout(() => setReject(null), 450);
    return () => clearTimeout(t);
  }, [reject]);

  // React to each new guess: chimes, toast, and screen shake.
  const breach = breachLevel(state.history, state.status !== 'playing');
  const breachBefore = breachLevel(state.history.slice(0, -1), false);
  useEffect(() => {
    if (!lastResult) return;
    if (state.status !== 'playing') return;

    const timers: number[] = [];
    const result = lastResult;
    const attempt = state.history.length - 1;
    timers.push(
      window.setTimeout(() => {
        const hits = result.bulls + result.cows;
        for (let i = 0; i < result.bulls; i++) sfx.bull(i, i * 0.13);
        for (let i = 0; i < result.cows; i++) sfx.cow(i, (result.bulls + i) * 0.13);
        if (hits === 0) sfx.dead();
        if (result.bulls === 3) sfx.close(0.5);

        const quiet = Boolean(tourRef.current) && result.bulls < 4;
        if (!quiet) setToast({ id: Date.now(), ...reactionFor(result, attempt) });
        if (result.bulls === 3) setShake('big-shake');
        else if (hits >= 2) setShake('shake');
      }, 420),
    );
    return () => timers.forEach(clearTimeout);
  }, [state.history.length]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!shake) return;
    const t = window.setTimeout(() => setShake(''), 750);
    return () => clearTimeout(t);
  }, [shake]);

  // Grand win sequence: bolts retract, core glows, then the loot explodes.
  useEffect(() => {
    if (state.status !== 'cracking') return;
    setToast(null);
    setPhase('unlocking');
    sfx.unlock();
    const timers = [
      window.setTimeout(() => setPhase('glow'), 900),
      window.setTimeout(() => {
        setPhase('burst');
        setShake('big-shake');
        const rect = vaultRef.current?.getBoundingClientRect();
        const origin = rect
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        setBurst((b) => ({ trigger: b.trigger + 1, origin }));
        sfx.fanfare();
        sfx.coins(18);
      }, 1600),
      window.setTimeout(() => actions.finishCrack(), 2700),
    ];
    return () => timers.forEach(clearTimeout);
  }, [state.status, actions]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const s = stateRef.current;
      if (s.status === 'won') {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleNewGame();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          setResultsOpen(false);
        }
        return;
      }
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleDigit(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSubmit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        handleClear();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        if (tourRef.current) return;
        const dir = e.key === 'ArrowLeft' ? 3 : 1;
        actions.focusSlot((s.focusIndex + dir) % 4);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [actions, handleDigit, handleBackspace, handleSubmit, handleClear, handleNewGame]);

  useEffect(() => {
    refocus();
  }, []);

  useEffect(() => {
    const sync = () => setHeistListen(heistFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);

  return (
    <div className={`app ${shake}`}>
      {phone ? (
        <MobileHeader
          mode={mode}
          onSwitchMode={switchMode}
          helpOpen={helpOpen}
          onToggleHelp={() => {
            sfx.key();
            toggleHelp();
            refocus();
          }}
          showResults={state.status === 'won' && !resultsOpen}
          onResults={() => setResultsOpen(true)}
          assist={assist}
          assistCue={Boolean(assistWalk?.cueAssist)}
          onAssist={() => {
            if (tour === 'assist') {
              if (!assistWalk?.cueAssist || !assistWalk.need) return;
              sfx.key();
              setAssist(assistWalk.need);
              refocus();
              return;
            }
            if (tour) return;
            sfx.key();
            setAssist(nextAssist(assist));
            refocus();
          }}
          muted={muted}
          onToggleMute={() => {
            setMuted(!muted);
            refocus();
          }}
          dayLabel={dayKey().slice(5)}
          clockLabel={formatClock(shownMs)}
          streak={mode === 'daily' ? streak : 0}
          onNewGame={handleNewGame}
        />
      ) : (
      <header className="header">
        <div className="brand">
          <h1 className="logo">
            CRAQ
          </h1>
          <div className="mode-switch" role="group" aria-label="Game mode">
            <button type="button" className={mode === 'versus' ? 'on' : ''} aria-pressed={mode === 'versus'} onClick={() => switchMode('versus')}>
              PRACTICE
            </button>
            <button type="button" className={mode === 'daily' ? 'on' : ''} aria-pressed={mode === 'daily'} onClick={() => switchMode('daily')}>
              DAILY
            </button>
          </div>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className={`chip-btn${helpOpen ? ' on' : ''}`}
            aria-expanded={helpOpen}
            onClick={() => {
              sfx.key();
              toggleHelp();
              refocus();
            }}
          >
            HOW TO PLAY
          </button>
          {state.status === 'won' && !resultsOpen && (
            <button type="button" className="chip-btn results-btn" onClick={() => setResultsOpen(true)}>
              🏆 RESULTS
            </button>
          )}
          <AssistButton
            level={assist}
            cue={Boolean(assistWalk?.cueAssist)}
            onClick={() => {
              if (tour === 'assist') {
                if (!assistWalk?.cueAssist || !assistWalk.need) return;
                sfx.key();
                setAssist(assistWalk.need);
                refocus();
                return;
              }
              if (tour) return;
              sfx.key();
              setAssist(nextAssist(assist));
              refocus();
            }}
          />
          <button
            type="button"
            className={`chip-btn sound-btn${muted ? ' is-off' : ''}`}
            onClick={() => {
              setMuted(!muted);
              refocus();
            }}
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
              {dayKey().slice(5)} · <span className="daily-time">{formatClock(shownMs)}</span>
              {streak > 0 ? ` · ${streak}` : ''}
            </span>
          ) : (
            <button type="button" className="chip-btn hot" onClick={handleNewGame}>
              NEW GAME
            </button>
          )}
        </div>
      </header>
      )}

      <main className="main">
        {phone ? (
          <MobilePlay
            state={state}
            spectrum={spectrum}
            assist={assist}
            playing={playing}
            highlight={highlight}
            onHighlight={setHighlight}
            phase={phase}
            reject={reject}
            toast={toast}
            breach={breach}
            breachBefore={breachBefore}
            onDigit={(d) => {
              handleDigit(d);
              refocus();
            }}
            onSubmit={handleSubmit}
            onFocusSlot={handleFocusSlot}
            tour={tour}
            tourPlaying={tourPlaying}
            tourSlide={tourSlide}
            walk={walk}
            assistWalk={assistWalk}
            onTourNext={() => {
              sfx.key();
              if (!walk) return;
              if (tourSlide >= walk.slides.length - 1) setTourPlaying(true);
              else setTourSlide((n) => n + 1);
            }}
            onTourBack={() => {
              sfx.key();
              setTourSlide((n) => Math.max(0, n - 1));
            }}
            onTourSkip={() => endTour(true, true)}
            helpOpen={helpOpen}
            demoAvailable={demoAvailable}
            mode={mode}
            hasGuess={hasGuess}
            onPlayDemo={() => beginTour('unlock')}
            onTryGame={() => {
              closeHelp();
              refocus();
            }}
            onCloseHelp={() => {
              sfx.key();
              closeHelp();
              refocus();
            }}
            onAssistTour={() => beginTour('assist')}
            vaultRef={vaultRef}
          />
        ) : (
        <div className="play-area">
          <div className="vault-stage">
            <div
              className="rig"
              style={{
                width: RIG_W,
                height: RIG_H,
                ['--rig-w' as string]: `${RIG_W}px`,
                ['--rig-h' as string]: `${RIG_H}px`,
                ['--cx' as string]: `${CX}px`,
                ['--cy' as string]: `${CY}px`,
                ['--log-right' as string]: `${RIG_W - LOG_TIP_X - 2}px`,
                ['--log-top' as string]: `${LOG_TIP_Y - 16}px`,
              }}
            >
              {walk && !tourPlaying && !helpOpen && state.status === 'playing' && (
                <TourPopup
                  key={`${tour}-${state.history.length}-${assist}`}
                  slides={walk.slides}
                  index={tourSlide}
                  onNext={() => {
                    sfx.key();
                    if (tourSlide >= walk.slides.length - 1) setTourPlaying(true);
                    else setTourSlide((n) => n + 1);
                  }}
                  onBack={() => {
                    sfx.key();
                    setTourSlide((n) => Math.max(0, n - 1));
                  }}
                  onSkip={() => endTour(true, true)}
                />
              )}
              {helpOpen && (
                <aside className="panel how-to" aria-label="How to play">
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
                      <button type="button" className="how-demo" onClick={() => beginTour('unlock')}>
                        Play Demo
                      </button>
                      <p className="how-links">
                        <button
                          type="button"
                          className="how-try"
                          onClick={() => {
                            sfx.key();
                            setHelpOpen(false);
                            refocus();
                          }}
                        >
                          try game
                        </button>
                        <span className="how-dot" aria-hidden>
                          ·
                        </span>
                        <button type="button" className="how-assist-link" onClick={() => beginTour('assist')}>
                          how assist works
                        </button>
                      </p>
                    </div>
                  )}
                </aside>
              )}
              {armExtended && (
                <Ledger
                  docked
                  revealed={logShown}
                  concealed={helpOpen}
                  history={state.history}
                  draft={playing ? state.slots : null}
                  draftFocus={state.focusIndex}
                  highlight={highlight}
                  onHighlight={setHighlight}
                  showBarsHint={assist === 'medium' || assist === 'heavy'}
                />
              )}
              <VaultDoor
                ref={vaultRef}
                slots={state.slots}
                revealCode={playing ? null : state.secret}
                focusIndex={state.focusIndex}
                onFocusSlot={handleFocusSlot}
                submitTick={state.history.length}
                breach={breach}
                breachBefore={playing && state.history.length > 0 ? breachBefore : null}
                phase={phase}
                reject={reject}
                interactive={playing}
                cheer={toast}
                onPlayDemo={
                  demoAvailable && !tour && !helpOpen && playing && !hasGuess && mode !== 'daily'
                    ? () => beginTour('unlock')
                    : undefined
                }
              />
              <CoinBelt
                slots={state.slots}
                spectrum={spectrum}
                assist={assist}
                canSubmit={canSubmit(state)}
                disabled={!playing || Boolean(tour && !tourPlaying)}
                onDigit={(d) => {
                  handleDigit(d);
                  refocus();
                }}
                onSubmit={handleSubmit}
                open={armExtended}
                armToggle={hasGuess}
                onArmClick={() => hasGuess && setArmExtended((extended) => !extended)}
                armLabel={armExtended ? 'Fold the arm' : 'Swing the arm out'}
                hintDigits={tourPlaying && walk ? walk.play : []}
                digitTips={tour === 'unlock' ? tourDeadTips(walk?.dead ?? []) : undefined}
                forceDead={walk?.dead ?? assistWalk?.dead ?? []}
              />
            </div>
          </div>
        </div>
        )}
      </main>

      <ParticleBurst trigger={burst.trigger} origin={burst.origin} />

      {state.status === 'won' && resultsOpen && !heistListen && (
        <WinModal
          secret={state.secret}
          guesses={state.history.length}
          assist={peakAssist}
          timeLabel={mode === 'daily' ? formatClock(shownMs) : undefined}
          streakLabel={mode === 'daily' ? streakLine(streak) : undefined}
          againLabel={
            tour === 'unlock'
              ? 'PLAY ANOTHER GAME'
              : tour
                ? 'PRACTICE FREELY'
                : 'CRACK ANOTHER VAULT'
          }
          lead={tour === 'unlock' ? "Congrats!! You've just unlocked your first vault." : undefined}
          nextHint={tour === 'unlock' ? 'See how hints work:' : undefined}
          nextLabel={tour === 'unlock' ? 'TRY ASSIST' : undefined}
          onNext={tour === 'unlock' ? () => beginTour('assist') : undefined}
          tuneScores={mode === 'daily' ? state.history : undefined}
          sharePayload={
            tour
              ? undefined
              : {
                  history: state.history,
                  day: mode === 'daily' ? dayKey() : undefined,
                  clockLabel: mode === 'daily' ? formatClock(shownMs) : undefined,
                  assistName: ASSIST_NAMES[peakAssist],
                  listenUrl: mode === 'daily' ? heistListenUrl(state.history) : undefined,
                }
          }
          nextVault={mode === 'daily' && !tour}
          onPlayAgain={tour ? () => endTour(true, tour === 'unlock') : handleNewGame}
          onClose={() => {
            setResultsOpen(false);
            refocus();
          }}
        />
      )}

      {heistListen && (
        <HeistListen
          scores={heistListen}
          crackedToday={dailyCrackedToday() || (mode === 'daily' && state.status !== 'playing')}
          onClose={() => {
            setHeistListen(null);
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
          }}
          onPlayToday={() => {
            setHeistListen(null);
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
            if (mode !== 'daily') switchMode('daily');
          }}
        />
      )}
    </div>
  );
}
