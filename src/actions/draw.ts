'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getEffectiveTeamId } from '@/lib/admin-context';
import { revalidatePath } from 'next/cache';
import { runDraw, getDrawInfo } from '@/lib/draw-algorithm';
import { buildGroupMatchOrder } from '@/lib/tournament-utils';
import type { StaminaLevel } from '@/types/database.types';

export async function executeDraw(
  gameId: string,
  isTournament: boolean,
): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();

  const { data: game } = await service
    .from('games')
    .select('id, status, draw_done')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };
  if (game.status !== 'open') return { error: 'Jogo não está aberto.' };
  if (game.draw_done) return { error: 'Sorteio já realizado.' };

  // Busca jogadores confirmados
  const { data: confirmations } = await service
    .from('game_confirmations')
    .select('player_id')
    .eq('game_id', gameId)
    .eq('status', 'confirmed');

  const playerIds = (confirmations ?? []).map(c => c.player_id);
  if (playerIds.length === 0) return { error: 'Nenhum jogador confirmado.' };

  const { data: playersData } = await service
    .from('players')
    .select('id, name, weight_kg, stamina, is_star')
    .in('id', playerIds);

  if (!playersData || playersData.length === 0) {
    return { error: 'Erro ao buscar dados dos jogadores.' };
  }

  // Valida se pode sortear
  const { canDraw, message } = getDrawInfo(playersData.length);
  if (!canDraw) return { error: message ?? 'Sorteio inválido.' };

  // Executa o algoritmo de sorteio
  const teams = runDraw(
    playersData.map(p => ({
      id: p.id,
      name: p.name,
      weight_kg: p.weight_kg,
      stamina: p.stamina as StaminaLevel,
      is_star: p.is_star,
    })),
  );

  // Persiste os times e jogadores no banco
  for (let i = 0; i < teams.length; i++) {
    const { data: gameTeam, error: teamError } = await service
      .from('game_teams')
      .insert({ game_id: gameId, team_number: i + 1 })
      .select('id')
      .single();

    if (teamError || !gameTeam) return { error: 'Erro ao salvar time.' };

    for (const player of teams[i]) {
      const { error: playerError } = await service
        .from('game_team_players')
        .insert({ game_team_id: gameTeam.id, player_id: player.id });

      if (playerError) return { error: 'Erro ao salvar jogador no time.' };
    }
  }

  // Marca o sorteio como realizado e define modo campeonato
  await service
    .from('games')
    .update({ draw_done: true, is_tournament: isTournament })
    .eq('id', gameId);

  // Gera partidas da fase de grupos para o campeonato
  if (isTournament) {
    const { data: gameTeams } = await service
      .from('game_teams')
      .select('id')
      .eq('game_id', gameId)
      .order('team_number');

    // Verifica se já existem partidas de grupo antes de inserir (guard anti-duplicata)
    const { data: existingGroupMatches } = await service
      .from('tournament_matches')
      .select('id')
      .eq('game_id', gameId)
      .eq('phase', 'group')
      .limit(1);

    if (!existingGroupMatches || existingGroupMatches.length === 0) {
      const ids = (gameTeams ?? []).map(t => t.id);
      const pairs = buildGroupMatchOrder(ids);
      const matchInserts = pairs.map(([home, away], idx) => ({
        game_id: gameId,
        phase: 'group' as const,
        home_team_id: home,
        away_team_id: away,
        match_order: idx + 1,
      }));

      if (matchInserts.length > 0) {
        await service.from('tournament_matches').insert(matchInserts);
      }
    }
  }

  revalidatePath(`/dashboard/jogos/${gameId}`);
  return {};
}

export async function resetDraw(gameId: string): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();

  const { data: game } = await service
    .from('games')
    .select('id, status, draw_done')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };
  if (game.status !== 'open') return { error: 'Jogo não está aberto.' };
  if (!game.draw_done) return { error: 'Nenhum sorteio para resetar.' };

  const { data: gameTeams } = await service
    .from('game_teams')
    .select('id')
    .eq('game_id', gameId);

  const teamIds = (gameTeams ?? []).map(t => t.id);

  if (teamIds.length > 0) {
    // Safety guard: block if any stat was recorded (UI hides the button, but defense in depth)
    const { data: statsCheck } = await service
      .from('game_team_players')
      .select('id')
      .in('game_team_id', teamIds)
      .or('goals.gt.0,assists.gt.0')
      .limit(1);

    if (statsCheck && statsCheck.length > 0) {
      return { error: 'Não é possível re-sortear após registrar placares.' };
    }

    // Also block if any tournament match score has been recorded
    const { data: tournamentScoreCheck } = await service
      .from('tournament_matches')
      .select('id')
      .eq('game_id', gameId)
      .not('home_score', 'is', null)
      .limit(1);

    if (tournamentScoreCheck && tournamentScoreCheck.length > 0) {
      return { error: 'Não é possível re-sortear após registrar placares.' };
    }

    // Delete in order to respect foreign key dependencies
    await service.from('tournament_matches').delete().eq('game_id', gameId);
    await service
      .from('game_team_players')
      .delete()
      .in('game_team_id', teamIds);
    await service.from('game_teams').delete().eq('game_id', gameId);
  }

  await service
    .from('games')
    .update({ draw_done: false, is_tournament: false })
    .eq('id', gameId);

  revalidatePath(`/dashboard/jogos/${gameId}`);
  return {};
}
