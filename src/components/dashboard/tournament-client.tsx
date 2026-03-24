'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  saveMatchResult,
  reopenMatch,
  generateNextPhase,
} from '@/actions/tournament';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { TournamentPhase } from '@/types/database.types';

// ── Types ─────────────────────────────────────────────────────────────────────

interface TeamInfo {
  id: string;
  teamNumber: number;
  customName: string | null;
}

interface MatchData {
  id: string;
  phase: TournamentPhase;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
  matchOrder: number;
  completed: boolean;
}

interface StandingData {
  teamId: string;
  teamNumber: number;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
}

interface Props {
  gameId: string;
  nTeams: number;
  teams: TeamInfo[];
  matches: MatchData[];
  standings: StandingData[];
  isFinished: boolean;
}

// ── Standings table ───────────────────────────────────────────────────────────

function StandingsTable({
  standings,
  nameMap,
}: {
  standings: StandingData[];
  nameMap: Map<string, string>;
}) {
  if (standings.every(s => s.played === 0)) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs border-b border-border">
            <th className="text-left py-1.5 w-6">#</th>
            <th className="text-left py-1.5">Time</th>
            <th className="text-center py-1.5 w-8">J</th>
            <th className="text-center py-1.5 w-8">V</th>
            <th className="text-center py-1.5 w-8">E</th>
            <th className="text-center py-1.5 w-8">D</th>
            <th className="text-center py-1.5 w-10">SG</th>
            <th className="text-center py-1.5 w-8 font-semibold">Pts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {standings.map((s, i) => (
            <tr key={s.teamId} className="text-sm">
              <td className="py-2 text-muted-foreground text-xs">{i + 1}</td>
              <td className="py-2 font-medium">
                {nameMap.get(s.teamId) ?? `Time ${s.teamNumber}`}
              </td>
              <td className="py-2 text-center tabular-nums">{s.played}</td>
              <td className="py-2 text-center tabular-nums">{s.wins}</td>
              <td className="py-2 text-center tabular-nums">{s.draws}</td>
              <td className="py-2 text-center tabular-nums">{s.losses}</td>
              <td className="py-2 text-center tabular-nums">
                {s.goalDiff > 0 ? `+${s.goalDiff}` : s.goalDiff}
              </td>
              <td className="py-2 text-center tabular-nums font-semibold">
                {s.points}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Match card ────────────────────────────────────────────────────────────────

function MatchCard({
  match,
  nameMap,
  isFinished,
  onSave,
  onReopen,
  saving,
}: {
  match: MatchData;
  nameMap: Map<string, string>;
  isFinished: boolean;
  onSave: (matchId: string, home: number, away: number) => void;
  onReopen: (matchId: string) => void;
  saving: boolean;
}) {
  const homeLabel = nameMap.get(match.homeTeamId) ?? '?';
  const awayLabel = nameMap.get(match.awayTeamId) ?? '?';

  const [homeInput, setHomeInput] = useState(
    match.homeScore !== null ? String(match.homeScore) : '',
  );
  const [awayInput, setAwayInput] = useState(
    match.awayScore !== null ? String(match.awayScore) : '',
  );

  function handleSubmit() {
    const h = parseInt(homeInput, 10);
    const a = parseInt(awayInput, 10);
    if (isNaN(h) || isNaN(a) || h < 0 || a < 0) return;
    onSave(match.id, h, a);
  }

  if (match.completed) {
    return (
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3 text-sm">
          <span className="font-medium">{homeLabel}</span>
          <span className="tabular-nums font-bold text-base">
            {match.homeScore} × {match.awayScore}
          </span>
          <span className="font-medium">{awayLabel}</span>
        </div>
        {!isFinished && (
          <button
            onClick={() => onReopen(match.id)}
            disabled={saving}
            className="text-xs text-muted-foreground underline disabled:opacity-50"
          >
            Reabrir
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="px-4 py-3 space-y-2">
      <p className="text-sm font-medium">
        {homeLabel} × {awayLabel}
      </p>
      {!isFinished && (
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            value={homeInput}
            onChange={e => setHomeInput(e.target.value)}
            placeholder="0"
            className="w-14 h-8 rounded border border-border text-center text-sm tabular-nums bg-background"
          />
          <span className="text-muted-foreground text-xs">×</span>
          <input
            type="number"
            min={0}
            value={awayInput}
            onChange={e => setAwayInput(e.target.value)}
            placeholder="0"
            className="w-14 h-8 rounded border border-border text-center text-sm tabular-nums bg-background"
          />
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || homeInput === '' || awayInput === ''}
          >
            Confirmar
          </Button>
        </div>
      )}
    </div>
  );
}

// ── Phase section ─────────────────────────────────────────────────────────────

function PhaseSection({
  title,
  matches,
  nameMap,
  isFinished,
  onSave,
  onReopen,
  saving,
}: {
  title: string;
  matches: MatchData[];
  nameMap: Map<string, string>;
  isFinished: boolean;
  onSave: (matchId: string, home: number, away: number) => void;
  onReopen: (matchId: string) => void;
  saving: boolean;
}) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2 bg-muted/50">
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <ul className="divide-y divide-border">
        {matches.map(m => (
          <li key={m.id}>
            <MatchCard
              match={m}
              nameMap={nameMap}
              isFinished={isFinished}
              onSave={onSave}
              onReopen={onReopen}
              saving={saving}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function TournamentClient({
  gameId,
  nTeams,
  teams,
  matches,
  standings,
  isFinished,
}: Props) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const nameMap = new Map(
    teams.map(t => [t.id, t.customName ?? `Time ${t.teamNumber}`]),
  );

  const groupMatches = matches
    .filter(m => m.phase === 'group')
    .sort((a, b) => a.matchOrder - b.matchOrder);
  const semiMatches = matches
    .filter(m => m.phase === 'semi')
    .sort((a, b) => a.matchOrder - b.matchOrder);
  const finalMatches = matches
    .filter(m => m.phase === 'final')
    .sort((a, b) => a.matchOrder - b.matchOrder);

  const groupComplete =
    groupMatches.length > 0 && groupMatches.every(m => m.completed);
  const semiComplete =
    semiMatches.length > 0 && semiMatches.every(m => m.completed);

  // Quando gerar próxima fase:
  // 4 times: grupo done → gera semi | semi done → gera final
  // 5 times: grupo done → gera final
  const showGenerateNext =
    !isFinished &&
    ((groupComplete && semiMatches.length === 0 && finalMatches.length === 0) ||
      (nTeams === 4 && semiComplete && finalMatches.length === 0));

  const generateLabel =
    nTeams === 4 && semiMatches.length === 0
      ? 'Gerar Semifinais'
      : 'Gerar Final';

  function handleSave(matchId: string, home: number, away: number) {
    setError(null);
    startTransition(async () => {
      const result = await saveMatchResult(matchId, home, away);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleReopen(matchId: string) {
    setError(null);
    startTransition(async () => {
      const result = await reopenMatch(matchId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleGenerateNext() {
    setError(null);
    startTransition(async () => {
      const result = await generateNextPhase(gameId);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Tabela de classificação */}
      {groupMatches.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/50">
            <h2 className="font-semibold text-sm">Classificação</h2>
          </div>
          <div className="px-4 py-3">
            <StandingsTable standings={standings} nameMap={nameMap} />
          </div>
        </div>
      )}

      {/* Fase de grupos */}
      {groupMatches.length > 0 ? (
        <PhaseSection
          title="Fase de Grupos"
          matches={groupMatches}
          nameMap={nameMap}
          isFinished={isFinished}
          onSave={handleSave}
          onReopen={handleReopen}
          saving={pending}
        />
      ) : (
        <p className="text-sm text-muted-foreground rounded-lg border border-border p-3">
          Nenhuma partida encontrada.
        </p>
      )}

      {/* Semifinais */}
      {semiMatches.length > 0 && (
        <PhaseSection
          title="Semifinais"
          matches={semiMatches}
          nameMap={nameMap}
          isFinished={isFinished}
          onSave={handleSave}
          onReopen={handleReopen}
          saving={pending}
        />
      )}

      {/* Final */}
      {finalMatches.length > 0 && (
        <PhaseSection
          title="Final"
          matches={finalMatches}
          nameMap={nameMap}
          isFinished={isFinished}
          onSave={handleSave}
          onReopen={handleReopen}
          saving={pending}
        />
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {/* Gerar próxima fase */}
      {showGenerateNext && (
        <>
          <Separator />
          <Button
            className="w-full"
            onClick={handleGenerateNext}
            disabled={pending}
          >
            {pending ? 'Gerando...' : generateLabel}
          </Button>
        </>
      )}
    </div>
  );
}
