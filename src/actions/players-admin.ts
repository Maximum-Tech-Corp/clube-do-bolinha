"use server";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { StaminaLevel } from "@/types/database.types";

// Retorna o team_id do admin autenticado
async function getAdminTeamId(): Promise<string | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const service = createServiceClient();
  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!admin) return null;

  const { data: team } = await service
    .from("teams")
    .select("id")
    .eq("admin_id", admin.id)
    .single();

  return team?.id ?? null;
}

export async function listPlayers() {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: "Não autorizado", players: [] };

  const service = createServiceClient();

  // Busca jogadores com contagem de presenças confirmadas
  const { data: players, error } = await service
    .from("players")
    .select("id, name, phone, weight_kg, stamina, is_star, created_at")
    .eq("team_id", teamId)
    .order("name", { ascending: true });

  if (error) return { error: "Erro ao buscar jogadores.", players: [] };

  const playerIds = players.map((p) => p.id);

  // Busca jogos finalizados com data para filtrar por cadastro do jogador
  const { data: finishedGames } = await service
    .from("games")
    .select("id, scheduled_at")
    .eq("team_id", teamId)
    .eq("status", "finished");

  const finishedGameList = finishedGames ?? [];
  const finishedGameIds = finishedGameList.map((g) => g.id);

  // Busca confirmações (confirmed + waitlist) nos jogos finalizados
  const { data: confirmationsRaw } = finishedGameIds.length > 0 && playerIds.length > 0
    ? await service
        .from("game_confirmations")
        .select("player_id, game_id")
        .in("game_id", finishedGameIds)
        .in("player_id", playerIds)
        .in("status", ["confirmed", "waitlist"])
    : { data: [] };

  const confirmations = confirmationsRaw ?? [];

  // Por jogador:
  // denominador = jogos finalizados ocorridos após o cadastro do jogador
  // numerador = confirmações (confirmed ou waitlist) nesses jogos
  const enriched = players.map((p) => {
    const registeredAt = new Date(p.created_at);
    const eligibleGames = finishedGameList.filter(
      (g) => new Date(g.scheduled_at) >= registeredAt
    );
    const eligibleGameIds = new Set(eligibleGames.map((g) => g.id));
    const denominator = eligibleGames.length;

    const numerator = confirmations.filter(
      (c) => c.player_id === p.id && eligibleGameIds.has(c.game_id)
    ).length;

    return {
      ...p,
      attendanceCount: numerator,
      attendanceRate: denominator > 0 ? Math.round((numerator / denominator) * 100) : null,
    };
  });

  return { players: enriched };
}

export async function getPlayer(playerId: string) {
  const teamId = await getAdminTeamId();
  if (!teamId) return null;

  const service = createServiceClient();
  const { data } = await service
    .from("players")
    .select("id, name, phone, weight_kg, stamina, is_star, is_banned, suspended_until, suspension_reason")
    .eq("id", playerId)
    .eq("team_id", teamId)
    .single();

  return data;
}

async function assertPlayerOwnership(
  playerId: string,
  teamId: string
): Promise<boolean> {
  const service = createServiceClient();
  const { data } = await service
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("team_id", teamId)
    .maybeSingle();
  return !!data;
}

export async function banPlayer(
  playerId: string
): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: "Não autorizado." };
  if (!(await assertPlayerOwnership(playerId, teamId)))
    return { error: "Jogador não encontrado." };

  const service = createServiceClient();
  const { error } = await service
    .from("players")
    .update({ is_banned: true })
    .eq("id", playerId);

  if (error) return { error: "Erro ao banir jogador." };
  revalidatePath(`/dashboard/jogadores/${playerId}`);
  return {};
}

export async function unbanPlayer(
  playerId: string
): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: "Não autorizado." };
  if (!(await assertPlayerOwnership(playerId, teamId)))
    return { error: "Jogador não encontrado." };

  const service = createServiceClient();
  const { error } = await service
    .from("players")
    .update({ is_banned: false })
    .eq("id", playerId);

  if (error) return { error: "Erro ao remover banimento." };
  revalidatePath(`/dashboard/jogadores/${playerId}`);
  return {};
}

export async function suspendPlayer(
  playerId: string,
  suspendedUntil: string,
  reason: string
): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: "Não autorizado." };
  if (!(await assertPlayerOwnership(playerId, teamId)))
    return { error: "Jogador não encontrado." };

  if (new Date(suspendedUntil) <= new Date())
    return { error: "A data de encerramento deve ser futura." };

  const service = createServiceClient();
  const { error } = await service
    .from("players")
    .update({
      suspended_until: suspendedUntil,
      suspension_reason: reason.trim() || null,
    })
    .eq("id", playerId);

  if (error) return { error: "Erro ao suspender jogador." };
  revalidatePath(`/dashboard/jogadores/${playerId}`);
  return {};
}

export async function removeSuspension(
  playerId: string
): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: "Não autorizado." };
  if (!(await assertPlayerOwnership(playerId, teamId)))
    return { error: "Jogador não encontrado." };

  const service = createServiceClient();
  const { error } = await service
    .from("players")
    .update({ suspended_until: null, suspension_reason: null })
    .eq("id", playerId);

  if (error) return { error: "Erro ao remover suspensão." };
  revalidatePath(`/dashboard/jogadores/${playerId}`);
  return {};
}

export async function createPlayer(params: {
  name: string;
  phone: string;
  weight_kg: number;
  stamina: StaminaLevel;
}): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: "Não autorizado." };

  const service = createServiceClient();

  // Verifica unicidade do telefone na turma
  const { data: existing } = await service
    .from("players")
    .select("id")
    .eq("team_id", teamId)
    .eq("phone", params.phone)
    .maybeSingle();

  if (existing) return { error: "Já existe um jogador com este telefone nesta turma." };

  const { error } = await service.from("players").insert({
    team_id: teamId,
    name: params.name,
    phone: params.phone,
    weight_kg: params.weight_kg,
    stamina: params.stamina,
  });

  if (error) return { error: "Erro ao criar jogador." };

  revalidatePath("/dashboard/jogadores");
  return {};
}

export async function updatePlayer(
  playerId: string,
  params: {
    name: string;
    weight_kg: number;
    stamina: StaminaLevel;
    is_star: boolean;
  }
): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: "Não autorizado." };

  const service = createServiceClient();

  // Confirma que o jogador pertence à turma do admin
  const { data: player } = await service
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!player) return { error: "Jogador não encontrado." };

  const { error } = await service
    .from("players")
    .update({
      name: params.name,
      weight_kg: params.weight_kg,
      stamina: params.stamina,
      is_star: params.is_star,
    })
    .eq("id", playerId);

  if (error) return { error: "Erro ao atualizar jogador." };

  revalidatePath("/dashboard/jogadores");
  revalidatePath(`/dashboard/jogadores/${playerId}`);
  return {};
}

export async function getPlayerStats(playerId: string) {
  const teamId = await getAdminTeamId();
  if (!teamId) return [];

  const service = createServiceClient();
  const { data } = await service
    .from("player_stat_adjustments")
    .select("id, year, goals, assists, created_at")
    .eq("player_id", playerId)
    .order("year", { ascending: false });

  return data ?? [];
}

export async function addRetroactiveStat(params: {
  playerId: string;
  goals: number;
  assists: number;
  year: number;
}): Promise<{ error?: string }> {
  const teamId = await getAdminTeamId();
  if (!teamId) return { error: "Não autorizado." };

  const service = createServiceClient();

  // Confirma posse
  const { data: player } = await service
    .from("players")
    .select("id")
    .eq("id", params.playerId)
    .eq("team_id", teamId)
    .maybeSingle();

  if (!player) return { error: "Jogador não encontrado." };

  const { error } = await service.from("player_stat_adjustments").insert({
    player_id: params.playerId,
    year: params.year,
    goals: params.goals,
    assists: params.assists,
  });

  if (error) return { error: "Erro ao salvar estatísticas." };

  revalidatePath(`/dashboard/jogadores/${params.playerId}`);
  return {};
}
