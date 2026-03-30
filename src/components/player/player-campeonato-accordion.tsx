'use client';

import { Accordion } from '@base-ui/react/accordion';
import { ChevronDown } from 'lucide-react';
import type { TournamentPhase } from '@/types/database.types';

interface PlayerData {
  name: string;
  isStar: boolean;
  goals: number;
  assists: number;
}

interface TeamData {
  id: string;
  teamNumber: number;
  customName: string | null;
  players: PlayerData[];
}

interface StandingRow {
  rank: number;
  name: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalDiff: number;
  points: number;
}

interface MatchEntry {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  completed: boolean;
}

interface PhaseData {
  phase: TournamentPhase;
  label: string;
  matches: MatchEntry[];
}

interface Props {
  teamsData: TeamData[];
  standingsData: StandingRow[];
  matchesData: PhaseData[];
}

function AccordionCard({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Accordion.Root
      defaultValue={defaultOpen ? [title] : []}
      className="rounded-lg shadow-md bg-gray-50 overflow-hidden"
    >
      <Accordion.Item value={title}>
        <Accordion.Header>
          <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 border-b border-gray-200 hover:bg-gray-100 transition-colors [&[data-open]>svg]:rotate-180">
            <h2 className="font-semibold text-base">{title}</h2>
            <ChevronDown className="w-5 h-5 text-foreground transition-transform duration-200" />
          </Accordion.Trigger>
        </Accordion.Header>
        <Accordion.Panel>{children}</Accordion.Panel>
      </Accordion.Item>
    </Accordion.Root>
  );
}

export function PlayerCampeonatoAccordion({
  teamsData,
  standingsData,
  matchesData,
}: Props) {
  return (
    <div className="space-y-3">
      {/* Times */}
      {teamsData.length > 0 && (
        <Accordion.Root
          multiple
          defaultValue={teamsData.map(t => t.id)}
          className="space-y-2"
        >
          {teamsData.map(team => {
            const totalGoals = team.players.reduce((s, p) => s + p.goals, 0);
            const displayName = team.customName ?? `Time ${team.teamNumber}`;
            return (
              <Accordion.Item
                key={team.id}
                value={team.id}
                className="rounded-lg shadow-md bg-gray-50 overflow-hidden"
              >
                <Accordion.Header>
                  <Accordion.Trigger className="flex w-full items-center justify-between px-4 py-3 hover:bg-gray-100 transition-colors [&[data-open]>svg]:rotate-180">
                    <span className="font-semibold text-sm">{displayName}</span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {totalGoals} gol{totalGoals !== 1 ? 's' : ''}
                      </span>
                      <ChevronDown className="w-5 h-5 text-foreground transition-transform duration-200" />
                    </div>
                  </Accordion.Trigger>
                </Accordion.Header>
                <Accordion.Panel>
                  <ul className="divide-y divide-border">
                    {team.players.map((player, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between px-4 py-2.5 text-sm"
                      >
                        <span className="font-medium">
                          {player.isStar && <span className="mr-1">⭐</span>}
                          {player.name}
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {player.goals}G · {player.assists}A
                        </span>
                      </li>
                    ))}
                  </ul>
                </Accordion.Panel>
              </Accordion.Item>
            );
          })}
        </Accordion.Root>
      )}

      {/* Classificação */}
      {standingsData.length > 0 && standingsData.some(s => s.played > 0) && (
        <AccordionCard title="Classificação">
          <div className="px-4 py-3 overflow-x-auto">
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
                {standingsData.map(s => (
                  <tr key={s.rank}>
                    <td className="py-2 text-muted-foreground text-xs">
                      {s.rank}
                    </td>
                    <td className="py-2 font-medium">{s.name}</td>
                    <td className="py-2 text-center tabular-nums">
                      {s.played}
                    </td>
                    <td className="py-2 text-center tabular-nums">{s.wins}</td>
                    <td className="py-2 text-center tabular-nums">{s.draws}</td>
                    <td className="py-2 text-center tabular-nums">
                      {s.losses}
                    </td>
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
        </AccordionCard>
      )}

      {/* Fases */}
      {matchesData.map(({ phase, label, matches }) => (
        <AccordionCard key={phase} title={label}>
          <ul className="divide-y divide-border">
            {matches.map(m => (
              <li
                key={m.id}
                className="flex items-center gap-3 px-4 py-3 text-sm"
              >
                <span className="font-medium flex-1 text-right">
                  {m.homeTeam}
                </span>
                <span className="tabular-nums font-bold text-base shrink-0">
                  {m.completed
                    ? `${m.homeScore ?? 0} × ${m.awayScore ?? 0}`
                    : '— × —'}
                </span>
                <span className="font-medium flex-1">{m.awayTeam}</span>
                {!m.completed && (
                  <span className="text-xs text-muted-foreground shrink-0">
                    Pendente
                  </span>
                )}
              </li>
            ))}
          </ul>
        </AccordionCard>
      ))}
    </div>
  );
}
