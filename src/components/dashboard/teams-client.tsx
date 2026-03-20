"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateStat, finishGame } from "@/actions/game-stats";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PlayerStat {
  gameTeamPlayerId: string;
  playerId: string;
  name: string;
  isStar: boolean;
  goals: number;
  assists: number;
}

interface TeamData {
  id: string;
  teamNumber: number;
  players: PlayerStat[];
}

interface Props {
  gameId: string;
  teams: TeamData[];
  isFinished: boolean;
  isTournament: boolean;
  tournamentCompleted: boolean;
}

// ── Controle de stat por jogador ─────────────────────────────────────────────

function StatCounter({
  label,
  value,
  onIncrement,
  onDecrement,
  disabled,
}: {
  label: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-xs text-muted-foreground w-12">{label}</span>
      <button
        onClick={onDecrement}
        disabled={disabled || value === 0}
        className="w-7 h-7 rounded border border-border text-sm font-bold disabled:opacity-30 hover:bg-muted transition-colors"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        onClick={onIncrement}
        disabled={disabled}
        className="w-7 h-7 rounded border border-border text-sm font-bold disabled:opacity-30 hover:bg-muted transition-colors"
      >
        +
      </button>
    </div>
  );
}

// ── Time individual ──────────────────────────────────────────────────────────

function TeamCard({
  team,
  stats,
  isFinished,
  onUpdate,
}: {
  team: TeamData;
  stats: Map<string, { goals: number; assists: number }>;
  isFinished: boolean;
  onUpdate: (gtpId: string, field: "goals" | "assists", delta: 1 | -1) => void;
}) {
  const totalGoals = team.players.reduce(
    (sum, p) => sum + (stats.get(p.gameTeamPlayerId)?.goals ?? p.goals),
    0
  );

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
        <h2 className="font-semibold text-sm">Time {team.teamNumber}</h2>
        <span className="text-xs text-muted-foreground">
          {totalGoals} gol{totalGoals !== 1 ? "s" : ""}
        </span>
      </div>

      <ul className="divide-y divide-border">
        {team.players.map((player) => {
          const current = stats.get(player.gameTeamPlayerId) ?? {
            goals: player.goals,
            assists: player.assists,
          };

          return (
            <li key={player.gameTeamPlayerId} className="px-4 py-3 space-y-2">
              <p className="text-sm font-medium">
                {player.isStar && <span className="mr-1">⭐</span>}
                {player.name}
              </p>
              <div className="flex flex-col gap-1.5">
                <StatCounter
                  label="Gols"
                  value={current.goals}
                  onIncrement={() =>
                    onUpdate(player.gameTeamPlayerId, "goals", 1)
                  }
                  onDecrement={() =>
                    onUpdate(player.gameTeamPlayerId, "goals", -1)
                  }
                  disabled={isFinished}
                />
                <StatCounter
                  label="Assists"
                  value={current.assists}
                  onIncrement={() =>
                    onUpdate(player.gameTeamPlayerId, "assists", 1)
                  }
                  onDecrement={() =>
                    onUpdate(player.gameTeamPlayerId, "assists", -1)
                  }
                  disabled={isFinished}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Componente principal ─────────────────────────────────────────────────────

export function TeamsClient({
  gameId,
  teams,
  isFinished,
  isTournament,
  tournamentCompleted,
}: Props) {
  // Mapa local de stats para atualização otimista
  const [localStats, setLocalStats] = useState<
    Map<string, { goals: number; assists: number }>
  >(new Map());

  const [error, setError] = useState<string | null>(null);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [finishPending, startFinishTransition] = useTransition();
  const router = useRouter();

  function handleUpdate(
    gtpId: string,
    field: "goals" | "assists",
    delta: 1 | -1
  ) {
    // Busca valor atual (local ou original)
    const player = teams
      .flatMap((t) => t.players)
      .find((p) => p.gameTeamPlayerId === gtpId);
    if (!player) return;

    const current = localStats.get(gtpId) ?? {
      goals: player.goals,
      assists: player.assists,
    };
    const currentValue = field === "goals" ? current.goals : current.assists;
    const newValue = Math.max(0, currentValue + delta);

    // Atualização otimista
    setLocalStats((prev) => {
      const next = new Map(prev);
      next.set(gtpId, { ...current, [field]: newValue });
      return next;
    });

    // Persiste no banco (fire and forget — erros são silenciosos pois o
    // reload do servidor sincroniza caso haja inconsistência)
    updateStat(gtpId, field, delta).then((result) => {
      if (result.error) {
        // Reverte em caso de erro
        setLocalStats((prev) => {
          const next = new Map(prev);
          next.set(gtpId, { ...current });
          return next;
        });
        setError(result.error);
      }
    });
  }

  function handleFinish() {
    setError(null);
    startFinishTransition(async () => {
      const result = await finishGame(gameId);
      if (result.error) {
        setError(result.error);
        setFinishDialogOpen(false);
        return;
      }
      setFinishDialogOpen(false);
      router.refresh();
    });
  }

  const canFinish = !isTournament || tournamentCompleted;
  const finishBlockedReason =
    isTournament && !tournamentCompleted
      ? "Finalize o campeonato antes de encerrar o jogo."
      : null;

  return (
    <div className="space-y-4">
      {isFinished && (
        <p className="text-sm text-muted-foreground rounded-lg border border-border p-3">
          Este jogo foi finalizado. Os dados são somente leitura.
        </p>
      )}

      {/* Times */}
      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          stats={localStats}
          isFinished={isFinished}
          onUpdate={handleUpdate}
        />
      ))}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Finalizar jogo */}
      {!isFinished && (
        <div className="space-y-1 pt-2">
          <Button
            className="w-full"
            disabled={!canFinish}
            onClick={() => setFinishDialogOpen(true)}
          >
            Finalizar jogo
          </Button>
          {finishBlockedReason && (
            <p className="text-xs text-muted-foreground text-center">
              {finishBlockedReason}
            </p>
          )}
        </div>
      )}

      {/* Dialog de confirmação */}
      <Dialog open={finishDialogOpen} onOpenChange={setFinishDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Finalizar jogo?</DialogTitle>
            <DialogDescription>
              Os placares ficam salvos e não poderão mais ser editados.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={handleFinish}
              disabled={finishPending}
            >
              {finishPending ? "Finalizando..." : "Confirmar"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setFinishDialogOpen(false)}
            >
              Cancelar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
