'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getEffectiveTeamId } from '@/lib/admin-context';
import { revalidatePath } from 'next/cache';
import type { StaminaLevel } from '@/types/database.types';

export async function listGames() {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { upcoming: [], past: [] };

  const service = createServiceClient();
  const now = new Date().toISOString();

  const [upcomingResult, pastResult] = await Promise.all([
    service
      .from('games')
      .select('id, location, scheduled_at, status, draw_done, is_tournament')
      .eq('team_id', teamId)
      .eq('status', 'open')
      .gte('scheduled_at', now)
      .order('scheduled_at', { ascending: true }),

    service
      .from('games')
      .select('id, location, scheduled_at, status, draw_done, is_tournament')
      .eq('team_id', teamId)
      .or(`scheduled_at.lt.${now},status.in.(finished,cancelled)`)
      .order('scheduled_at', { ascending: false })
      .limit(5),
  ]);

  return {
    upcoming: upcomingResult.data ?? [],
    past: pastResult.data ?? [],
  };
}

export async function createGame(params: {
  location: string;
  scheduled_at: string;
}): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  if (new Date(params.scheduled_at) <= new Date()) {
    return { error: 'A data e hora devem ser no futuro.' };
  }

  const service = createServiceClient();
  const { error } = await service.from('games').insert({
    team_id: teamId,
    location: params.location || null,
    scheduled_at: params.scheduled_at,
  });

  if (error) return { error: 'Erro ao criar jogo.' };

  revalidatePath('/dashboard/jogos');
  return {};
}

export async function cancelGame(gameId: string): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();
  const { data: game } = await service
    .from('games')
    .select('id, status')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };
  if (game.status !== 'open')
    return { error: 'Apenas jogos abertos podem ser cancelados.' };

  const { error } = await service
    .from('games')
    .update({ status: 'cancelled' })
    .eq('id', gameId);

  if (error) return { error: 'Erro ao cancelar jogo.' };

  revalidatePath(`/dashboard/jogos/${gameId}`);
  revalidatePath('/dashboard/jogos');
  return {};
}

export async function toggleTournament(
  gameId: string,
  isTournament: boolean,
): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();
  const { data: game } = await service
    .from('games')
    .select('id, draw_done, status')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };
  if (!game.draw_done) return { error: 'O sorteio ainda não foi realizado.' };
  if (game.status === 'cancelled') return { error: 'Jogo cancelado.' };

  // TODO (Step 11/12): ao desmarcar, verificar se já existem placares registrados
  // em game_team_players. Se sim, avisar que os placares serão perdidos ou bloquear.

  const { error } = await service
    .from('games')
    .update({ is_tournament: isTournament })
    .eq('id', gameId);

  if (error) return { error: 'Erro ao atualizar modo campeonato.' };

  revalidatePath(`/dashboard/jogos/${gameId}`);
  return {};
}

export async function removeConfirmedPlayer(
  gameId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();
  const { data: game } = await service
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };

  // Marca como removido
  await service
    .from('game_confirmations')
    .update({ status: 'removed', waitlist_position: null })
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .eq('status', 'confirmed');

  // Só promove da fila se após a remoção o total de confirmados ficou abaixo de 25
  const { count: confirmedAfter } = await service
    .from('game_confirmations')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('status', 'confirmed');

  if ((confirmedAfter ?? 0) < 25) {
    const { data: first } = await service
      .from('game_confirmations')
      .select('id')
      .eq('game_id', gameId)
      .eq('status', 'waitlist')
      .order('waitlist_position', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (first) {
      await service
        .from('game_confirmations')
        .update({ status: 'confirmed', waitlist_position: null })
        .eq('id', first.id);
    }
  }

  revalidatePath(`/dashboard/jogos/${gameId}`);
  return {};
}

export async function promoteWaitlistPlayer(
  confirmationId: string,
  gameId: string,
): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();
  const { data: game } = await service
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };

  const { error } = await service
    .from('game_confirmations')
    .update({ status: 'confirmed', waitlist_position: null })
    .eq('id', confirmationId)
    .eq('status', 'waitlist');

  if (error) return { error: 'Erro ao promover jogador.' };

  revalidatePath(`/dashboard/jogos/${gameId}`);
  return {};
}

export async function addPlayerToGame(
  gameId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();
  const { data: game } = await service
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };

  const { count: confirmedCount } = await service
    .from('game_confirmations')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('status', 'confirmed');

  const isFull = (confirmedCount ?? 0) >= 25;
  let waitlistPosition: number | null = null;

  if (isFull) {
    const { data: maxRow } = await service
      .from('game_confirmations')
      .select('waitlist_position')
      .eq('game_id', gameId)
      .eq('status', 'waitlist')
      .order('waitlist_position', { ascending: false })
      .limit(1)
      .maybeSingle();
    waitlistPosition = (maxRow?.waitlist_position ?? 0) + 1;
  }

  // Upsert para cobrir o caso de jogador removido anteriormente
  const { error } = await service.from('game_confirmations').upsert(
    {
      game_id: gameId,
      player_id: playerId,
      status: isFull ? 'waitlist' : 'confirmed',
      waitlist_position: waitlistPosition,
    },
    { onConflict: 'game_id,player_id' },
  );

  if (error) return { error: 'Erro ao adicionar jogador.' };

  revalidatePath(`/dashboard/jogos/${gameId}`);
  return {};
}

export async function createAndAddPlayer(
  gameId: string,
  params: {
    name: string;
    phone: string;
    weight_kg: number;
    stamina: StaminaLevel;
  },
): Promise<{ error?: string }> {
  const teamId = await getEffectiveTeamId();
  if (!teamId) return { error: 'Não autorizado.' };

  const service = createServiceClient();
  const { data: game } = await service
    .from('games')
    .select('id')
    .eq('id', gameId)
    .eq('team_id', teamId)
    .maybeSingle();

  if (!game) return { error: 'Jogo não encontrado.' };

  // Verifica unicidade do telefone na turma
  const { data: existing } = await service
    .from('players')
    .select('id')
    .eq('team_id', teamId)
    .eq('phone', params.phone)
    .maybeSingle();

  if (existing)
    return { error: 'Já existe um jogador com este telefone nesta turma.' };

  const { data: created, error: createError } = await service
    .from('players')
    .insert({
      team_id: teamId,
      name: params.name,
      phone: params.phone,
      weight_kg: params.weight_kg,
      stamina: params.stamina,
    })
    .select('id')
    .single();

  if (createError || !created) return { error: 'Erro ao cadastrar jogador.' };

  const addResult = await addPlayerToGame(gameId, created.id);
  return addResult;
}
