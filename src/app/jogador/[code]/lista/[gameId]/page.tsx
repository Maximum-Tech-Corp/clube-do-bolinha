import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { createServiceClient } from "@/lib/supabase/server";
import { PlayerBottomNav } from "@/components/player/player-bottom-nav";

interface Props {
  params: Promise<{ code: string; gameId: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
  });
}

export default async function PlayerListaPage({ params }: Props) {
  const { code, gameId } = await params;
  const upperCode = code.toUpperCase();

  const service = createServiceClient();

  const { data: team } = await service
    .from("teams")
    .select("id, name")
    .eq("access_code", upperCode)
    .maybeSingle();

  if (!team) notFound();

  const { data: game } = await service
    .from("games")
    .select("id, scheduled_at, location, status, draw_done")
    .eq("id", gameId)
    .eq("team_id", team.id)
    .maybeSingle();

  // Só disponível para jogos abertos sem sorteio
  if (!game || game.draw_done || game.status !== "open") notFound();

  const { data: confirmationsRaw } = await service
    .from("game_confirmations")
    .select("player_id, status")
    .eq("game_id", gameId)
    .eq("status", "confirmed");

  const playerIds = (confirmationsRaw ?? []).map((c) => c.player_id);

  const { data: playersRaw } = playerIds.length > 0
    ? await service
        .from("players")
        .select("id, name")
        .in("id", playerIds)
        .order("name")
    : { data: [] };

  const players = playersRaw ?? [];

  return (
    <div className="max-w-md mx-auto p-4 pb-24 space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={`/jogador/${upperCode}`}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Lista de confirmados</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formatDate(game.scheduled_at)}
            {game.location ? ` · ${game.location}` : ""}
          </p>
        </div>
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">
          Nenhum jogador confirmado ainda.
        </p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <div className="px-4 py-2 bg-muted/50">
            <p className="text-sm font-semibold">
              {players.length} confirmado{players.length !== 1 ? "s" : ""}
            </p>
          </div>
          <ul className="divide-y divide-border">
            {players.map((player) => (
              <li key={player.id} className="px-4 py-2.5 text-sm font-medium">
                {player.name}
              </li>
            ))}
          </ul>
        </div>
      )}

      <PlayerBottomNav teamCode={upperCode} />
    </div>
  );
}
