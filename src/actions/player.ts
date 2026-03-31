'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { StaminaLevel, PlayerPosition } from '@/types/database.types';

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
}

type IdentifyPlayerResult =
  | { identified: true }
  | { needsRegistration: true }
  | { banned: true }
  | { suspended: true; until: string; reason: string | null }
  | { error: string };

export async function identifyPlayer(params: {
  teamId: string;
  phone: string;
}): Promise<IdentifyPlayerResult> {
  const { teamId, phone } = params;
  const service = createServiceClient();

  const { data: player } = await service
    .from('players')
    .select('id, is_banned, suspended_until, suspension_reason')
    .eq('team_id', teamId)
    .eq('phone', phone)
    .maybeSingle();

  if (!player) return { needsRegistration: true };

  if (player.is_banned) return { banned: true };

  if (player.suspended_until && new Date(player.suspended_until) > new Date()) {
    return {
      suspended: true,
      until: player.suspended_until,
      reason: player.suspension_reason,
    };
  }

  const cookieStore = await cookies();
  cookieStore.set(`player_${teamId}`, phone, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return { identified: true };
}

export async function registerPlayer(params: {
  teamId: string;
  phone: string;
  name: string;
  weight_kg: number;
  stamina: StaminaLevel;
}): Promise<{ success: true } | { error: string }> {
  const { teamId, phone, name, weight_kg, stamina } = params;
  const service = createServiceClient();

  // Guard against race condition: phone registered from another device
  const { data: existing } = await service
    .from('players')
    .select('id')
    .eq('team_id', teamId)
    .eq('phone', phone)
    .maybeSingle();

  if (!existing) {
    const { error } = await service.from('players').insert({
      team_id: teamId,
      name,
      phone,
      weight_kg,
      stamina,
    });
    if (error) return { error: 'Erro ao registrar. Tente novamente.' };
  }

  const cookieStore = await cookies();
  cookieStore.set(`player_${teamId}`, phone, {
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  return { success: true };
}

export async function updatePlayerSelf(
  teamId: string,
  params: {
    name: string;
    weight_kg: number;
    stamina: StaminaLevel;
    position: PlayerPosition | null;
    is_star: boolean;
  },
): Promise<{ error?: string }> {
  const cookieStore = await cookies();
  const phone = cookieStore.get(`player_${teamId}`)?.value;
  if (!phone) return { error: 'Não identificado.' };

  const service = createServiceClient();

  const { data: player } = await service
    .from('players')
    .select('id')
    .eq('team_id', teamId)
    .eq('phone', phone)
    .maybeSingle();

  if (!player) return { error: 'Jogador não encontrado.' };

  const { error } = await service
    .from('players')
    .update({
      name: params.name,
      weight_kg: params.weight_kg,
      stamina: params.stamina,
      position: params.position,
      is_star: params.is_star,
    })
    .eq('id', player.id);

  if (error) return { error: 'Erro ao salvar dados.' };

  revalidatePath(`/jogador/[code]`, 'page');
  return {};
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

export async function saveLastTeamCode(code: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('last_team_code', code, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    httpOnly: false,
    sameSite: 'lax',
  });
}

export async function clearLastTeamCode(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('last_team_code');
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
