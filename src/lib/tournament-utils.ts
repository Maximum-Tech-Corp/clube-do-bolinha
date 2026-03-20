import type { TournamentPhase } from "@/types/database.types";

/**
 * Retorna os pares de partidas da fase de grupos na ordem de exibição,
 * garantindo que nenhum time jogue duas partidas consecutivas.
 *
 * 4 times: T1×T2, T3×T4, T1×T3, T2×T4, T1×T4, T2×T3
 * 5 times: sequência que garante pelo menos 1 partida de descanso entre jogos
 *          T1×T2, T3×T4, T1×T5, T2×T3, T4×T5, T1×T3, T2×T4, T3×T5, T1×T4, T2×T5
 */
export function buildGroupMatchOrder(
  teamIds: string[] // ordenado por team_number ASC
): [string, string][] {
  const n = teamIds.length;

  if (n === 4) {
    const [a, b, c, d] = teamIds;
    return [
      [a, b], [c, d],
      [a, c], [b, d],
      [a, d], [b, c],
    ];
  }

  if (n === 5) {
    const [a, b, c, d, e] = teamIds;
    return [
      [a, b], [c, d],
      [a, e], [b, c],
      [d, e], [a, c],
      [b, d], [c, e],
      [a, d], [b, e],
    ];
  }

  // fallback para outros tamanhos: todas as combinações C(n,2)
  const pairs: [string, string][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      pairs.push([teamIds[i], teamIds[j]]);
    }
  }
  return pairs;
}

export type MatchRow = {
  id: string;
  phase: TournamentPhase;
  home_team_id: string;
  away_team_id: string;
  home_score: number | null;
  away_score: number | null;
  match_order: number;
  completed: boolean;
};

export type StandingRow = {
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
};

/**
 * Computes group-phase standings from a list of matches.
 * Sort order: Points DESC → Wins DESC → Goal diff DESC → Goals for DESC.
 */
export function computeStandings(
  matches: MatchRow[],
  teamMap: Map<string, number> // teamId → teamNumber
): StandingRow[] {
  const stats = new Map<
    string,
    Omit<StandingRow, "teamId" | "teamNumber">
  >();

  for (const [teamId] of teamMap) {
    stats.set(teamId, {
      played: 0,
      wins: 0,
      draws: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDiff: 0,
      points: 0,
    });
  }

  for (const match of matches) {
    if (
      !match.completed ||
      match.home_score === null ||
      match.away_score === null
    )
      continue;

    const home = stats.get(match.home_team_id);
    const away = stats.get(match.away_team_id);
    if (!home || !away) continue;

    home.played++;
    away.played++;
    home.goalsFor += match.home_score;
    home.goalsAgainst += match.away_score;
    away.goalsFor += match.away_score;
    away.goalsAgainst += match.home_score;

    if (match.home_score > match.away_score) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (match.home_score < match.away_score) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      home.points++;
      away.draws++;
      away.points++;
    }

    home.goalDiff = home.goalsFor - home.goalsAgainst;
    away.goalDiff = away.goalsFor - away.goalsAgainst;
  }

  return [...stats.entries()]
    .map(([teamId, s]) => ({
      teamId,
      teamNumber: teamMap.get(teamId)!,
      ...s,
    }))
    .sort(
      (a, b) =>
        b.points - a.points ||
        b.wins - a.wins ||
        b.goalDiff - a.goalDiff ||
        b.goalsFor - a.goalsFor
    );
}
