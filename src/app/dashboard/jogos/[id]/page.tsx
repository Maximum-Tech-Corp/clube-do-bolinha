import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { GameDetailClient } from "@/components/dashboard/game-detail-client";
import { TournamentToggle } from "@/components/dashboard/tournament-toggle";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ id: string }>;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function GameDetailPage({ params }: Props) {
  const { id: gameId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const service = createServiceClient();

  const { data: admin } = await service
    .from("admins")
    .select("id")
    .eq("user_id", user.id)
    .single();
  if (!admin) redirect("/login");

  const { data: team } = await service
    .from("teams")
    .select("id")
    .eq("admin_id", admin.id)
    .single();
  if (!team) redirect("/login");

  const { data: game } = await service
    .from("games")
    .select("id, location, scheduled_at, status, draw_done, is_tournament")
    .eq("id", gameId)
    .eq("team_id", team.id)
    .maybeSingle();

  if (!game) notFound();

  // Busca confirmações (confirmed + waitlist)
  const { data: confirmations } = await service
    .from("game_confirmations")
    .select("id, player_id, status, waitlist_position")
    .eq("game_id", gameId)
    .in("status", ["confirmed", "waitlist"])
    .order("waitlist_position", { ascending: true });

  const confirmedRows = (confirmations ?? []).filter((c) => c.status === "confirmed");
  const waitlistRows = (confirmations ?? []).filter((c) => c.status === "waitlist");

  const allPlayerIds = (confirmations ?? []).map((c) => c.player_id);

  // Busca detalhes dos jogadores já na lista
  const [playersInGameResult, availablePlayersResult] = await Promise.all([
    allPlayerIds.length > 0
      ? service
          .from("players")
          .select("id, name, phone")
          .in("id", allPlayerIds)
      : Promise.resolve({ data: [] }),

    // Jogadores da turma que ainda não estão no jogo
    service
      .from("players")
      .select("id, name")
      .eq("team_id", team.id)
      .not(
        "id",
        "in",
        allPlayerIds.length > 0 ? `(${allPlayerIds.join(",")})` : "(00000000-0000-0000-0000-000000000000)"
      )
      .order("name"),
  ]);

  const playerMap = new Map(
    (playersInGameResult.data ?? []).map((p) => [p.id, p])
  );

  const confirmed = confirmedRows.map((c) => ({
    confirmationId: c.id,
    player: playerMap.get(c.player_id) ?? { id: c.player_id, name: "—", phone: "" },
  }));

  const waitlist = waitlistRows.map((c) => ({
    confirmationId: c.id,
    position: c.waitlist_position ?? 0,
    player: playerMap.get(c.player_id) ?? { id: c.player_id, name: "—", phone: "" },
  }));

  const availablePlayers = (availablePlayersResult.data ?? []) as { id: string; name: string }[];

  const statusLabel = {
    open: "Aberto",
    cancelled: "Cancelado",
    finished: "Finalizado",
  } as const;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold leading-tight">
            {formatDate(game.scheduled_at)}
          </h1>
          <Badge
            variant={
              game.status === "open"
                ? "default"
                : game.status === "cancelled"
                ? "outline"
                : "secondary"
            }
          >
            {statusLabel[game.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {game.location ?? "Local não definido"}
          {game.is_tournament && " · Campeonato"}
        </p>
      </div>

      {game.draw_done && game.status !== "cancelled" && (
        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-sm text-muted-foreground">Sorteio realizado.</p>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/jogos/${gameId}/times`}
              className="flex-1 inline-flex items-center justify-center rounded-lg border border-border bg-background text-sm font-medium h-9 hover:bg-muted/50 transition-colors"
            >
              Ver times
            </Link>
            {game.is_tournament && (
              <Link
                href={`/dashboard/jogos/${gameId}/campeonato`}
                className="flex-1 inline-flex items-center justify-center rounded-lg border border-primary/40 bg-primary/5 text-primary text-sm font-medium h-9 hover:bg-primary/10 transition-colors"
              >
                Ver campeonato
              </Link>
            )}
          </div>
          {game.status === "open" && (
            <TournamentToggle gameId={gameId} isTournament={game.is_tournament} />
          )}
        </div>
      )}

      {game.status === "cancelled" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground rounded-lg border border-border p-3">
            Este jogo foi cancelado.
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">
              Jogadores que haviam confirmado ({confirmed.length}):
            </p>
            {confirmed.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Nenhuma confirmação registrada.
              </p>
            ) : (
              <ul className="space-y-1">
                {confirmed.map(({ confirmationId, player }) => (
                  <li
                    key={confirmationId}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
                  >
                    <span className="font-medium">{player.name}</span>
                    <span className="text-muted-foreground text-xs">{player.phone}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Área interativa: apenas para jogos abertos */}
      {game.status === "open" && (
        <GameDetailClient
          gameId={gameId}
          drawDone={game.draw_done}
          confirmed={confirmed}
          waitlist={waitlist}
          availablePlayers={availablePlayers}
        />
      )}

    </div>
  );
}
