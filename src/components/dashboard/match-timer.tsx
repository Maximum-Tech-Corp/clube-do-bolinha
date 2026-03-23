'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';

interface TimerState {
  /** Timestamp (ms) de quando o timer foi iniciado, já ajustado por pausas. */
  startedAt: number | null;
  /** Timestamp (ms) de quando foi pausado. null = rodando ou não iniciado. */
  pausedAt: number | null;
  /** Duração total configurada em ms. */
  durationMs: number;
}

interface Props {
  gameId: string;
  defaultMinutes: number;
}

const storageKey = (gameId: string) => `match_timer_${gameId}`;

function loadState(gameId: string, defaultMinutes: number): TimerState {
  try {
    const raw = localStorage.getItem(storageKey(gameId));
    if (raw) return JSON.parse(raw) as TimerState;
  } catch {
    // ignora erros de parse
  }
  return {
    startedAt: null,
    pausedAt: null,
    durationMs: defaultMinutes * 60_000,
  };
}

function saveState(gameId: string, state: TimerState) {
  localStorage.setItem(storageKey(gameId), JSON.stringify(state));
}

/** Calcula ms restantes a partir do estado atual. */
function computeRemaining(state: TimerState): number {
  if (state.startedAt === null) return state.durationMs;
  const reference = state.pausedAt ?? Date.now();
  return Math.max(0, state.durationMs - (reference - state.startedAt));
}

function formatTime(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function MatchTimer({ gameId, defaultMinutes }: Props) {
  const [timerState, setTimerState] = useState<TimerState>(() =>
    loadState(gameId, defaultMinutes),
  );
  const [remaining, setRemaining] = useState(() =>
    computeRemaining(loadState(gameId, defaultMinutes)),
  );
  const [blink, setBlink] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isRunning =
    timerState.startedAt !== null && timerState.pausedAt === null;
  const isFinished = remaining === 0 && timerState.startedAt !== null;

  // Atualiza o display a cada 250ms quando rodando
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        const r = computeRemaining(timerState);
        setRemaining(r);
        if (r === 0) {
          // Timer zerou: para o intervalo e inicia o piscar
          if (intervalRef.current) clearInterval(intervalRef.current);
        }
      }, 250);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning, timerState]);

  // Piscar quando zerar
  useEffect(() => {
    if (!isFinished) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBlink(false);
      return;
    }
    const blinkInterval = setInterval(() => setBlink(b => !b), 600);
    return () => clearInterval(blinkInterval);
  }, [isFinished]);

  const update = useCallback(
    (next: TimerState) => {
      setTimerState(next);
      setRemaining(computeRemaining(next));
      saveState(gameId, next);
    },
    [gameId],
  );

  function handlePlay() {
    if (isRunning) return;
    const next: TimerState =
      timerState.startedAt === null
        ? // Início do zero
          { ...timerState, startedAt: Date.now(), pausedAt: null }
        : // Resume de pausa: ajusta startedAt para descontar o tempo pausado
          {
            ...timerState,
            startedAt:
              Date.now() -
              (timerState.durationMs - computeRemaining(timerState)),
            pausedAt: null,
          };
    update(next);
  }

  function handlePause() {
    if (!isRunning) return;
    update({ ...timerState, pausedAt: Date.now() });
  }

  function handleReset() {
    const next: TimerState = {
      startedAt: null,
      pausedAt: null,
      durationMs: defaultMinutes * 60_000,
    };
    update(next);
  }

  const displayTime = formatTime(remaining);
  const isZeroed = timerState.startedAt === null;

  return (
    <div className="rounded-lg border border-border p-4 space-y-3">
      {/* Display */}
      <div className="flex items-center justify-center">
        <span
          className={[
            'font-mono font-bold tabular-nums transition-opacity',
            isFinished
              ? 'text-destructive text-5xl'
              : 'text-foreground text-5xl',
            isFinished && blink ? 'opacity-0' : 'opacity-100',
          ].join(' ')}
        >
          {displayTime}
        </span>
      </div>

      {isFinished && (
        <p className="text-center text-xs font-medium text-destructive">
          Tempo encerrado!
        </p>
      )}

      {/* Controles */}
      <div className="flex items-center justify-center gap-3">
        {isRunning ? (
          <button
            type="button"
            onClick={handlePause}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-muted hover:bg-muted/70 text-sm font-medium transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pausar
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePlay}
            disabled={isFinished}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Play className="w-4 h-4" />
            {isZeroed ? 'Iniciar' : 'Continuar'}
          </button>
        )}

        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border hover:bg-muted text-sm font-medium transition-colors text-muted-foreground"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </button>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {defaultMinutes} min · o timer continua ao navegar entre telas
      </p>
    </div>
  );
}
