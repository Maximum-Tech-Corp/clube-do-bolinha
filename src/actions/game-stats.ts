'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getEffectiveTeamId } from '@/lib/admin-context';
import { revalidatePath } from 'next/cache';

/**
 * Incrementa ou decrementa gols/assistências de um jogador no jogo.
 * Retorna o novo valor salvo no banco.
 */
export async function updateStat(
  gameTeamPlayerId: string,
  field: 'goals' | 'assists',
  delta: 1 | -1,
): Promise<{ error?: string; newValue?: number }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();

  // Verifica posse: game_team_players → game_teams → games → team_id
  const { data: gtp } = await service
    .from('game_team_players')
    .select('id, goals, assists, game_team_id')
    .eq('id', gameTeamPlayerId)
    .single();

  if (!gtp) return { error: 'Registro não encontrado.' };

  const { data: gt } = await service
    .from('game_teams')
    .select('game_id')
    .eq('id', gtp.game_team_id)
    .single();

  if (!gt) return { error: 'Time não encontrado.' };

  const { data: game } = await service
    .from('games')
    .select('id, status')
    .eq('id', gt.game_id)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };
  if (game.status === 'finished') return { error: 'Jogo já finalizado.' };

  const current = field === 'goals' ? gtp.goals : gtp.assists;
  const newValue = Math.max(0, current + delta);

  const { error } = await service
    .from('game_team_players')
    .update({ [field]: newValue })
    .eq('id', gameTeamPlayerId);

  if (error) return { error: 'Erro ao atualizar.' };

  return { newValue };
}

export async function finishGame(gameId: string): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();

  const { data: game } = await service
    .from('games')
    .select('id, status, draw_done, is_tournament')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };
  if (game.status !== 'open') return { error: 'Jogo não está aberto.' };
  if (!game.draw_done) return { error: 'Sorteio ainda não foi realizado.' };

  // Se campeonato ativo, verifica se todas as partidas foram finalizadas
  if (game.is_tournament) {
    const { count: total } = await service
      .from('tournament_matches')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    const { count: completed } = await service
      .from('tournament_matches')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .eq('completed', true);

    if ((total ?? 0) === 0 || completed !== total) {
      return { error: 'Finalize o campeonato antes de encerrar o jogo.' };
    }
  }

  const { error } = await service
    .from('games')
    .update({ status: 'finished', finished_at: new Date().toISOString() })
    .eq('id', gameId);

  if (error) return { error: 'Erro ao finalizar jogo.' };

  revalidatePath(`/dashboard/jogos/${gameId}/times`);
  revalidatePath(`/dashboard/jogos/${gameId}`);
  revalidatePath('/dashboard/jogos');
  return {};
}

export async function renameGameTeam(
  gameTeamId: string,
  customName: string,
): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();

  const { data: gt } = await service
    .from('game_teams')
    .select('game_id')
    .eq('id', gameTeamId)
    .single();

  if (!gt) return { error: 'Time não encontrado.' };

  const { data: game } = await service
    .from('games')
    .select('id, status')
    .eq('id', gt.game_id)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };
  if (game.status === 'finished') return { error: 'Jogo já finalizado.' };

  const trimmed = customName.trim();

  const { error } = await service
    .from('game_teams')
    .update({ custom_name: trimmed.length > 0 ? trimmed : null })
    .eq('id', gameTeamId);

  if (error) return { error: 'Erro ao renomear time.' };

  revalidatePath(`/dashboard/jogos/${gt.game_id}/times`);
  return {};
}
