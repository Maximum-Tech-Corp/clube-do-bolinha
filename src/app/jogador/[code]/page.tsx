import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createServiceClient } from "@/lib/supabase/server";
import { GameCard } from "@/components/player/game-card";
import { PlayerDataSection } from "@/components/player/player-data-section";
import Link from "next/link";

interface Props {
  params: Promise<{ code: string }>;
}

export default async function TeamPage({ params }: Props) {
  const { code } = await params;
  const service = createServiceClient();

  const { data: team } = await service
    .from("teams")
    .select("id, name")
    .eq("access_code", code.toUpperCase())
    .maybeSingle();

  if (!team) notFound();

  // Jogos nos próximos 7 dias (inclui cancelados para mostrar status)
  const now = new Date();
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const { data: games } = await service
    .from("games")
    .select("id, location, scheduled_at, status, is_tournament")
    .eq("team_id", team.id)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", sevenDaysLater.toISOString())
    .order("scheduled_at", { ascending: true });

  const gameList = games ?? [];

  // Lê telefone do cookie (jogador que já confirmou antes)
  const cookieStore = await cookies();
  const playerPhone = cookieStore.get(`player_${team.id}`)?.value ?? undefined;

  // Busca dados do jogador e confirmaçoes em paralelo
  const [playerResult, confirmationsResult] = await Promise.all([
    playerPhone
      ? service
          .from("players")
          .select("id, name, phone, weight_kg, stamina, is_star, is_banned, suspended_until, suspension_reason")
          .eq("team_id", team.id)
          .eq("phone", playerPhone)
          .maybeSingle()
      : Promise.resolve({ data: null }),

    gameList.length > 0
      ? service
          .from("game_confirmations")
          .select("game_id, player_id, status")
          .in(
            "game_id",
            gameList.map((g) => g.id)
          )
          .in("status", ["confirmed", "waitlist"])
      : Promise.resolve({ data: [] }),
  ]);

  const playerData = playerResult.data;
  const confirmations = confirmationsResult.data ?? [];

  // Monta mapa de contagens e status do jogador por jogo
  const gameStats: Record<
    string,
    { confirmedCount: number; playerStatus: string | null }
  > = {};

  for (const game of gameList) {
    const gameConfirmations = confirmations.filter(
      (c) => c.game_id === game.id
    );
    const confirmedCount = gameConfirmations.filter(
      (c) => c.status === "confirmed"
    ).length;
    const playerConfirmation = playerData
      ? gameConfirmations.find((c) => c.player_id === playerData.id)
      : null;

    gameStats[game.id] = {
      confirmedCount,
      playerStatus: playerConfirmation?.status ?? null,
    };
  }

  // Verifica se o jogador identificado pelo cookie está banido ou suspenso
  const isBanned = playerData?.is_banned === true;
  const isActivelySuspended =
    !!playerData?.suspended_until &&
    new Date(playerData.suspended_until) > new Date();

  return (
    <div className="max-w-md mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{team.name}</h1>
          <p className="text-sm text-muted-foreground">Próximos 7 dias</p>
        </div>
        <Link
          href="/jogador"
          className="text-sm text-muted-foreground underline"
        >
          Trocar turma
        </Link>
      </div>

      {isBanned && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm space-y-1">
          <p className="font-semibold text-destructive">Acesso bloqueado</p>
          <p className="text-muted-foreground">
            Você foi banido desta turma e não pode confirmar presença nos jogos.
            Em caso de dúvidas, entre em contato com o organizador.
          </p>
        </div>
      )}

      {!isBanned && isActivelySuspended && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 text-sm space-y-1">
          <p className="font-semibold text-destructive">
            Suspenso até{" "}
            {new Date(playerData!.suspended_until!).toLocaleDateString(
              "pt-BR",
              { day: "2-digit", month: "2-digit", year: "numeric" }
            )}
          </p>
          {playerData?.suspension_reason && (
            <p className="text-muted-foreground">
              {playerData.suspension_reason}
            </p>
          )}
          <p className="text-muted-foreground">
            Você não pode confirmar presença durante este período.
          </p>
        </div>
      )}

      {gameList.length === 0 ? (
        <p className="text-muted-foreground text-sm text-center py-12">
          Nenhum jogo marcado para os próximos 7 dias.
        </p>
      ) : (
        <div className="space-y-3">
          {gameList.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              teamId={team.id}
              confirmedCount={gameStats[game.id].confirmedCount}
              playerStatus={gameStats[game.id].playerStatus}
              defaultPhone={playerPhone}
            />
          ))}
        </div>
      )}

      {playerData && <PlayerDataSection player={playerData} />}
    </div>
  );
}
