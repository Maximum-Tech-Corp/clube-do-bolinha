'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { StaminaLevel } from '@/types/database.types';

export async function cancelPresence(params: {
  gameId: string;
  teamId: string;
}): Promise<{ success: true } | { error: string }> {
  const { gameId, teamId } = params;
  const cookieStore = await cookies();
  const phone = cookieStore.get(`player_${teamId}`)?.value;

  if (!phone) return { error: 'Jogador não identificado.' };

  const service = createServiceClient();

  const { data: player } = await service
    .from('players')
    .select('id')
    .eq('team_id', teamId)
    .eq('phone', phone)
    .maybeSingle();

  if (!player) return { error: 'Jogador não encontrado.' };

  const { error } = await service
    .from('game_confirmations')
    .delete()
    .eq('game_id', gameId)
    .eq('player_id', player.id);

  if (error) return { error: 'Erro ao cancelar presença.' };

  revalidatePath(`/jogador/[code]`, 'page');
  return { success: true };
}

export async function clearPlayerCookie(teamId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(`player_${teamId}`);
  revalidatePath(`/jogador`);
}

export async function validateTeamCode(
  code: string,
): Promise<{ valid: boolean }> {
  const service = createServiceClient();
  const { data } = await service
    .from('teams')
    .select('id')
    .eq('access_code', code.toUpperCase())
    .maybeSingle();
  return { valid: !!data };
}

type ConfirmPresenceResult =
  | { needsRegistration: true }
  | { gameFull: true }
  | { alreadyConfirmed: true; currentStatus: 'confirmed' | 'waitlist' }
  | { status: 'confirmed' | 'waitlist' }
  | { banned: true }
  | { suspended: true; until: string; reason: string | null }
  | { error: string };

export async function confirmPresence(params: {
  gameId: string;
  teamId: string;
  phone: string;
  newPlayer?: { name: string; weight_kg: number; stamina: StaminaLevel };
  joinWaitlist?: boolean;
}): Promise<ConfirmPresenceResult> {
  const { gameId, teamId, phone, newPlayer, joinWaitlist = false } = params;
  const service = createServiceClient();

  // Busca jogador pelo telefone na turma (inclui campos de ban/suspensão)
  const { data: existingPlayer } = await service
    .from('players')
    .select('id, is_banned, suspended_until, suspension_reason')
    .eq('team_id', teamId)
    .eq('phone', phone)
    .maybeSingle();

  // Verifica ban/suspensão antes de prosseguir
  if (existingPlayer) {
    if (existingPlayer.is_banned) return { banned: true };

    if (existingPlayer.suspended_until) {
      const until = new Date(existingPlayer.suspended_until);
      if (until > new Date()) {
        return {
          suspended: true,
          until: existingPlayer.suspended_until,
          reason: existingPlayer.suspension_reason,
        };
      }
    }
  }

  // Telefone não cadastrado e sem dados de registro fornecidos
  if (!existingPlayer && !newPlayer) {
    return { needsRegistration: true };
  }

  let playerId: string;

  if (!existingPlayer && newPlayer) {
    const { data: created, error } = await service
      .from('players')
      .insert({
        team_id: teamId,
        name: newPlayer.name,
        phone,
        weight_kg: newPlayer.weight_kg,
        stamina: newPlayer.stamina,
      })
      .select('id')
      .single();

    if (error || !created) return { error: 'Erro ao registrar jogador.' };
    playerId = created.id;
  } else {
    playerId = existingPlayer!.id;
  }

  // Verifica se já confirmou
  const { data: existing } = await service
    .from('game_confirmations')
    .select('status')
    .eq('game_id', gameId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (existing) {
    return {
      alreadyConfirmed: true,
      currentStatus: existing.status as 'confirmed' | 'waitlist',
    };
  }

  // Conta confirmados
  const { count: confirmedCount } = await service
    .from('game_confirmations')
    .select('*', { count: 'exact', head: true })
    .eq('game_id', gameId)
    .eq('status', 'confirmed');

  const isFull = (confirmedCount ?? 0) >= 25;

  // Jogo lotado — aguarda confirmação do jogador para entrar na fila
  if (isFull && !joinWaitlist) {
    return { gameFull: true };
  }

  const status = isFull ? 'waitlist' : 'confirmed';
  let waitlistPosition: number | null = null;

  if (status === 'waitlist') {
    const { count: waitlistCount } = await service
      .from('game_confirmations')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId)
      .eq('status', 'waitlist');
    waitlistPosition = (waitlistCount ?? 0) + 1;
  }

  const { error } = await service.from('game_confirmations').insert({
    game_id: gameId,
    player_id: playerId,
    status,
    waitlist_position: waitlistPosition,
  });

  if (error) return { error: 'Erro ao confirmar presença.' };

  // Salva telefone em cookie para "Meus dados"
  const cookieStore = await cookies();
  cookieStore.set(`player_${teamId}`, phone, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  revalidatePath(`/jogador/[code]`, 'page');
  return { status };
}
