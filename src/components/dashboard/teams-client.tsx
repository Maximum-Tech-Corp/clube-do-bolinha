'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Check, X } from 'lucide-react';
import { updateStat, finishGame, renameGameTeam } from '@/actions/game-stats';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  customName: string | null;
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
  onRename,
}: {
  team: TeamData;
  stats: Map<string, { goals: number; assists: number }>;
  isFinished: boolean;
  onUpdate: (gtpId: string, field: 'goals' | 'assists', delta: 1 | -1) => void;
  onRename: (teamId: string, name: string) => Promise<{ error?: string }>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const totalGoals = team.players.reduce(
    (sum, p) => sum + (stats.get(p.gameTeamPlayerId)?.goals ?? p.goals),
    0,
  );

  function handleEditStart() {
    setDraft(team.customName ?? '');
    setRenameError(null);
    setEditing(true);
  }

  function handleCancel() {
    setEditing(false);
    setRenameError(null);
  }

  async function handleSave() {
    if (draft.trim() === '') {
      setEditing(false);
      return;
    }
    setRenaming(true);
    const result = await onRename(team.id, draft);
    setRenaming(false);
    if (result.error) {
      setRenameError(result.error);
    } else {
      setEditing(false);
    }
  }

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {editing ? (
            <input
              className="text-sm font-semibold bg-transparent border-b border-border focus:outline-none w-1/2"
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') handleCancel();
              }}
              autoFocus
              disabled={renaming}
              aria-label="Nome do time"
            />
          ) : (
            <h2 className="font-semibold text-sm truncate">
              {team.customName ?? `Time ${team.teamNumber}`}
            </h2>
          )}

          {!isFinished && !editing && (
            <button
              onClick={handleEditStart}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 font-bold"
              aria-label="Renomear time"
            >
              <Pencil className="w-4 h-4" strokeWidth={2.5} />
            </button>
          )}

          {editing && (
            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={handleSave}
                disabled={renaming}
                className="text-green-600 hover:text-green-700 disabled:opacity-40 transition-colors font-bold"
                aria-label="Salvar nome"
              >
                <Check className="w-6 h-6" strokeWidth={2.5} />
              </button>
              <button
                onClick={handleCancel}
                disabled={renaming}
                className="text-destructive hover:text-destructive/80 disabled:opacity-40 transition-colors font-bold"
                aria-label="Cancelar"
              >
                <X className="w-6 h-6" strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>

        <span className="text-xs text-muted-foreground ml-2 shrink-0">
          {totalGoals} gol{totalGoals !== 1 ? 's' : ''}
        </span>
      </div>

      {renameError && (
        <p className="px-4 py-1 text-xs text-destructive">{renameError}</p>
      )}

      <ul className="divide-y divide-border">
        {team.players.map(player => {
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
                    onUpdate(player.gameTeamPlayerId, 'goals', 1)
                  }
                  onDecrement={() =>
                    onUpdate(player.gameTeamPlayerId, 'goals', -1)
                  }
                  disabled={isFinished}
                />
                <StatCounter
                  label="Assists"
                  value={current.assists}
                  onIncrement={() =>
                    onUpdate(player.gameTeamPlayerId, 'assists', 1)
                  }
                  onDecrement={() =>
                    onUpdate(player.gameTeamPlayerId, 'assists', -1)
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

  // Mapa local de nomes customizados para atualização otimista
  const [localNames, setLocalNames] = useState<Map<string, string | null>>(
    new Map(teams.map(t => [t.id, t.customName])),
  );

  const [error, setError] = useState<string | null>(null);
  const [finishDialogOpen, setFinishDialogOpen] = useState(false);
  const [finishPending, startFinishTransition] = useTransition();
  const router = useRouter();

  function handleUpdate(
    gtpId: string,
    field: 'goals' | 'assists',
    delta: 1 | -1,
  ) {
    // Busca valor atual (local ou original)
    const player = teams
      .flatMap(t => t.players)
      .find(p => p.gameTeamPlayerId === gtpId);
    /* v8 ignore next */
    if (!player) return;

    const current = localStats.get(gtpId) ?? {
      goals: player.goals,
      assists: player.assists,
    };
    const currentValue = field === 'goals' ? current.goals : current.assists;
    const newValue = Math.max(0, currentValue + delta);

    // Atualização otimista
    setLocalStats(prev => {
      const next = new Map(prev);
      next.set(gtpId, { ...current, [field]: newValue });
      return next;
    });

    // Persiste no banco (fire and forget — erros são silenciosos pois o
    // reload do servidor sincroniza caso haja inconsistência)
    updateStat(gtpId, field, delta).then(result => {
      if (result.error) {
        // Reverte em caso de erro
        setLocalStats(prev => {
          const next = new Map(prev);
          next.set(gtpId, { ...current });
          return next;
        });
        setError(result.error);
      }
    });
  }

  async function handleRename(
    teamId: string,
    name: string,
  ): Promise<{ error?: string }> {
    const result = await renameGameTeam(teamId, name);
    if (!result.error) {
      const trimmed = name.trim();
      setLocalNames(prev => {
        const next = new Map(prev);
        next.set(teamId, trimmed.length > 0 ? trimmed : null);
        return next;
      });
    }
    return result;
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
      ? 'Finalize o campeonato antes de encerrar o jogo.'
      : null;

  const teamsWithNames = teams.map(t => ({
    ...t,
    customName: localNames.get(t.id) ?? t.customName,
  }));

  return (
    <div className="space-y-4">
      {isFinished && (
        <p className="text-sm text-muted-foreground rounded-lg border border-border p-3">
          Este jogo foi finalizado. Os dados são somente leitura.
        </p>
      )}

      {/* Times */}
      {teamsWithNames.map(team => (
        <TeamCard
          key={team.id}
          team={team}
          stats={localStats}
          isFinished={isFinished}
          onUpdate={handleUpdate}
          onRename={handleRename}
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
              {finishPending ? 'Finalizando...' : 'Confirmar'}
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
