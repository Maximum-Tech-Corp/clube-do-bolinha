'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Accordion } from '@base-ui/react/accordion';
import { Pencil, Check, X, ChevronDown } from 'lucide-react';
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
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground w-20">{label}</span>
      <button
        onClick={onDecrement}
        disabled={disabled || value === 0}
        className="w-11 h-11 rounded border border-border text-base font-bold disabled:opacity-30 hover:bg-muted transition-colors"
      >
        −
      </button>
      <span className="w-6 text-center text-sm font-medium tabular-nums">
        {value}
      </span>
      <button
        onClick={onIncrement}
        disabled={disabled}
        className="w-11 h-11 rounded border border-border text-base font-bold disabled:opacity-30 hover:bg-muted transition-colors"
      >
        +
      </button>
    </div>
  );
}

// ── Item do accordion (time individual) ──────────────────────────────────────

function TeamAccordionItem({
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

  function handleEditStart(e: React.MouseEvent) {
    e.stopPropagation();
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

  const displayName = team.customName ?? `Time ${team.teamNumber}`;

  return (
    <Accordion.Item
      value={team.id}
      className="rounded-lg shadow-md bg-gray-50 overflow-hidden"
    >
      <Accordion.Header className="flex">
        <Accordion.Trigger className="flex flex-1 items-center justify-between px-4 py-3 text-left hover:bg-gray-100 transition-colors [&[data-open]>svg]:rotate-180">
          <span className="font-semibold text-sm">{displayName}</span>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-muted-foreground">
              {totalGoals} gol{totalGoals !== 1 ? 's' : ''}
            </span>
            <ChevronDown className="w-5 h-5 text-foreground transition-transform duration-200" />
          </div>
        </Accordion.Trigger>
      </Accordion.Header>

      <Accordion.Panel className="px-4 pb-4 space-y-3">
        {/* Renomear time */}
        {!isFinished && (
          <div className="pt-3 border-t border-border">
            {editing ? (
              <div className="space-y-2">
                <input
                  className="w-full text-sm bg-transparent border-b border-border focus:outline-none py-1"
                  value={draft}
                  onChange={e => setDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                  autoFocus
                  disabled={renaming}
                  aria-label="Nome do time"
                  placeholder="Nome do time"
                />
                {renameError && (
                  <p className="text-xs text-destructive">{renameError}</p>
                )}
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    disabled={renaming}
                    className="text-green-600 hover:text-green-700 disabled:opacity-40 transition-colors"
                    aria-label="Salvar nome"
                  >
                    <Check className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={renaming}
                    className="text-destructive hover:text-destructive/80 disabled:opacity-40 transition-colors"
                    aria-label="Cancelar"
                  >
                    <X className="w-5 h-5" strokeWidth={2.5} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={handleEditStart}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Pencil className="w-4 h-4" strokeWidth={2.5} />
                Mudar nome do time
              </button>
            )}
          </div>
        )}

        {/* Lista de jogadores */}
        <ul className="space-y-3">
          {team.players.map(player => {
            const current = stats.get(player.gameTeamPlayerId) ?? {
              goals: player.goals,
              assists: player.assists,
            };

            return (
              <li key={player.gameTeamPlayerId} className="space-y-2">
                <p className="text-sm font-medium">
                  {player.isStar && <span className="mr-1">⭐</span>}
                  {player.name}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1.5">
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
                    label="Assistências"
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
      </Accordion.Panel>
    </Accordion.Item>
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
  const [localStats, setLocalStats] = useState<
    Map<string, { goals: number; assists: number }>
  >(new Map());

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

    setLocalStats(prev => {
      const next = new Map(prev);
      next.set(gtpId, { ...current, [field]: newValue });
      return next;
    });

    updateStat(gtpId, field, delta).then(result => {
      if (result.error) {
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
      router.push('/dashboard/jogos');
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
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
          <span className="mt-px shrink-0 font-bold">i</span>
          <span>Este jogo foi finalizado. Os dados são somente leitura.</span>
        </div>
      )}

      <Accordion.Root className="space-y-2">
        {teamsWithNames.map(team => (
          <TeamAccordionItem
            key={team.id}
            team={team}
            stats={localStats}
            isFinished={isFinished}
            onUpdate={handleUpdate}
            onRename={handleRename}
          />
        ))}
      </Accordion.Root>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!isFinished && (
        <div className="space-y-1 pt-2">
          <Button
            className="w-full py-5"
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
              className="flex-1 py-5"
              onClick={handleFinish}
              disabled={finishPending}
            >
              {finishPending ? 'Finalizando...' : 'Confirmar'}
            </Button>
            <Button
              variant="outline"
              className="flex-1 py-5 border-primary text-primary hover:bg-primary/5 hover:text-primary"
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
