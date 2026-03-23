'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { computeStandings } from '@/lib/tournament-utils';
import type { MatchRow } from '@/lib/tournament-utils';

async function getAdminTeamId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: admin } = await service
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .single();
  if (!admin) return null;

  const { data: team } = await service
    .from('teams')
    .select('id')
    .eq('admin_id', admin.id)
    .single();

  return team?.id ?? null;
}

/** Verifica posse do jogo via match_id → game_id → team_id */
async function getMatchGameId(matchId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data } = await service
    .from('tournament_matches')
    .select('game_id')
    .eq('id', matchId)
    .single();
  return data?.game_id ?? null;
}

async function assertOwnership(
  gameId: string,
  teamId: string,
): Promise<boolean> {
  const service = createServiceClient();
  const { data } = await service
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();
  return !!data;
}

/**
 * Salva o resultado de uma partida (qualquer fase).
 * Apenas partidas não concluídas podem ser salvas.
 */
export async function saveMatchResult(
  matchId: string,
  homeScore: number,
  awayScore: number,
): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const gameId = await getMatchGameId(matchId);
  if (!gameId) return { error: 'Partida não encontrada.' };

  if (!(await assertOwnership(gameId, teamId)))
    return { error: 'Não autorizado.' };

  const service = createServiceClient();

  const { data: match } = await service
    .from('tournament_matches')
    .select('id, completed')
    .eq('id', matchId)
    .single();

  if (!match) return { error: 'Partida não encontrada.' };
  if (match.completed) return { error: 'Partida já finalizada.' };

  const { error } = await service
    .from('tournament_matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      completed: true,
    })
    .eq('id', matchId);

  if (error) return { error: 'Erro ao salvar resultado.' };

  revalidatePath(`/dashboard/jogos/${gameId}/campeonato`);
  revalidatePath(`/dashboard/jogos/${gameId}/times`);
  return {};
}

/**
 * Reabre uma partida (apaga resultado e marca como não concluída).
 */
export async function reopenMatch(
  matchId: string,
): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const gameId = await getMatchGameId(matchId);
  if (!gameId) return { error: 'Partida não encontrada.' };

  if (!(await assertOwnership(gameId, teamId)))
    return { error: 'Não autorizado.' };

  const service = createServiceClient();

  const { error } = await service
    .from('tournament_matches')
    .update({ home_score: null, away_score: null, completed: false })
    .eq('id', matchId);

  if (error) return { error: 'Erro ao reabrir partida.' };

  revalidatePath(`/dashboard/jogos/${gameId}/campeonato`);
  revalidatePath(`/dashboard/jogos/${gameId}/times`);
  return {};
}

/**
 * Gera a próxima fase do campeonato com base no estado atual:
 *   4 times: grupo → semifinal → final
 *   5 times: grupo → final
 */
export async function generateNextPhase(
  gameId: string,
): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  if (!(await assertOwnership(gameId, teamId)))
    return { error: 'Não autorizado.' };

  const service = createServiceClient();

  // Busca todos os times e partidas do jogo
  const [{ data: gameTeamsRaw }, { data: matchesRaw }] = await Promise.all([
    service
      .from('game_teams')
      .select('id, team_number')
      .eq('game_id', gameId)
      .order('team_number'),
    service
      .from('tournament_matches')
      .select('*')
      .eq('game_id', gameId)
      .order('match_order'),
  ]);

  const gameTeams = gameTeamsRaw ?? [];
  const matches = (matchesRaw ?? []) as MatchRow[];
  const nTeams = gameTeams.length;

  if (nTeams !== 4 && nTeams !== 5) {
    return { error: 'Campeonato requer 4 ou 5 times.' };
  }

  const teamMap = new Map(gameTeams.map(t => [t.id, t.team_number]));

  const groupMatches = matches.filter(m => m.phase === 'group');
  const semiMatches = matches.filter(m => m.phase === 'semi');
  const finalMatches = matches.filter(m => m.phase === 'final');

  const groupComplete =
    groupMatches.length > 0 && groupMatches.every(m => m.completed);
  const semiComplete =
    semiMatches.length > 0 && semiMatches.every(m => m.completed);

  // --- 5 times: grupo → final (top 2) ---
  if (nTeams === 5) {
    if (!groupComplete) return { error: 'Fase de grupos não concluída.' };
    if (finalMatches.length > 0) return { error: 'Final já gerada.' };

    const standings = computeStandings(groupMatches, teamMap);
    const first = standings[0];
    const second = standings[1];

    await service.from('tournament_matches').insert({
      game_id: gameId,
      phase: 'final',
      home_team_id: first.teamId,
      away_team_id: second.teamId,
      match_order: 1,
    });

    revalidatePath(`/dashboard/jogos/${gameId}/campeonato`);
    revalidatePath(`/dashboard/jogos/${gameId}/times`);
    return {};
  }

  // --- 4 times: grupo → semifinal ---
  if (!groupComplete) return { error: 'Fase de grupos não concluída.' };

  if (semiMatches.length === 0) {
    const standings = computeStandings(groupMatches, teamMap);
    const [first, second, third, fourth] = standings;

    await service.from('tournament_matches').insert([
      {
        game_id: gameId,
        phase: 'semi',
        home_team_id: first.teamId,
        away_team_id: fourth.teamId,
        match_order: 1,
      },
      {
        game_id: gameId,
        phase: 'semi',
        home_team_id: second.teamId,
        away_team_id: third.teamId,
        match_order: 2,
      },
    ]);

    revalidatePath(`/dashboard/jogos/${gameId}/campeonato`);
    revalidatePath(`/dashboard/jogos/${gameId}/times`);
    return {};
  }

  // --- 4 times: semifinal → final ---
  if (!semiComplete) return { error: 'Semifinais não concluídas.' };
  if (finalMatches.length > 0) return { error: 'Final já gerada.' };

  // Vencedor de cada semi: em empate, avança o home_team (melhor classificado)
  const semi1 = semiMatches.find(m => m.match_order === 1)!;
  const semi2 = semiMatches.find(m => m.match_order === 2)!;

  const winner1 =
    (semi1.home_score ?? 0) >= (semi1.away_score ?? 0)
      ? semi1.home_team_id
      : semi1.away_team_id;

  const winner2 =
    (semi2.home_score ?? 0) >= (semi2.away_score ?? 0)
      ? semi2.home_team_id
      : semi2.away_team_id;

  await service.from('tournament_matches').insert({
    game_id: gameId,
    phase: 'final',
    home_team_id: winner1,
    away_team_id: winner2,
    match_order: 1,
  });

  revalidatePath(`/dashboard/jogos/${gameId}/campeonato`);
  revalidatePath(`/dashboard/jogos/${gameId}/times`);
  return {};
}
