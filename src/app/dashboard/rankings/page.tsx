import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { YearSelect } from "@/components/dashboard/year-select";

interface Props {
  searchParams: Promise<{ ano?: string }>;
}

interface PlayerRanking {
  playerId: string;
  name: string;
  goals: number;
  assists: number;
  gamesPlayed: number;
  attendanceRate: number;
}

function RankingTable({
  title,
  rows,
  sortKey,
  tieKey,
  label,
  tieLabel,
}: {
  title: string;
  rows: PlayerRanking[];
  sortKey: keyof PlayerRanking;
  tieKey: keyof PlayerRanking;
  label: string;
  tieLabel: string;
}) {
  const sorted = [...rows]
    .filter((r) => (r[sortKey] as number) > 0)
    .sort(
      (a, b) =>
        (b[sortKey] as number) - (a[sortKey] as number) ||
        (b[tieKey] as number) - (a[tieKey] as number)
    );

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2 bg-muted/50">
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs border-b border-border">
            <th className="text-left px-4 py-1.5 w-6">#</th>
            <th className="text-left px-4 py-1.5">Jogador</th>
            <th className="text-center px-2 py-1.5">{label}</th>
            <th className="text-center px-2 py-1.5 text-muted-foreground/70">
              {tieLabel}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((r, i) => (
            <tr key={r.playerId}>
              <td className="px-4 py-2 text-muted-foreground text-xs">
                {i + 1}
              </td>
              <td className="px-4 py-2 font-medium">{r.name}</td>
              <td className="px-2 py-2 text-center tabular-nums font-semibold">
                {r[sortKey] as number}
              </td>
              <td className="px-2 py-2 text-center tabular-nums text-muted-foreground">
                {r[tieKey] as number}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AttendanceTable({ rows }: { rows: PlayerRanking[] }) {
  const sorted = [...rows]
    .filter((r) => r.gamesPlayed > 0)
    .sort((a, b) => b.attendanceRate - a.attendanceRate);

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="px-4 py-2 bg-muted/50">
        <h2 className="font-semibold text-sm">Participação</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs border-b border-border">
            <th className="text-left px-4 py-1.5 w-6">#</th>
            <th className="text-left px-4 py-1.5">Jogador</th>
            <th className="text-center px-2 py-1.5">Jogos</th>
            <th className="text-center px-2 py-1.5">%</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {sorted.map((r, i) => (
            <tr key={r.playerId}>
              <td className="px-4 py-2 text-muted-foreground text-xs">
                {i + 1}
              </td>
              <td className="px-4 py-2 font-medium">{r.name}</td>
              <td className="px-2 py-2 text-center tabular-nums">
                {r.gamesPlayed}
              </td>
              <td className="px-2 py-2 text-center tabular-nums font-semibold">
                {r.attendanceRate}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RankingsPage({ searchParams }: Props) {
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

  const currentYear = new Date().getFullYear();
  const { ano } = await searchParams;
  const year = ano ? parseInt(ano, 10) : currentYear;

  // Busca dados para determinar anos disponíveis e stats do ano selecionado em paralelo
  const yearStart = `${year}-01-01T00:00:00.000Z`;
  const yearEnd = `${year + 1}-01-01T00:00:00.000Z`;

  const [
    { data: allFinishedGames },
    { data: allAdjustments },
    { data: players },
    { data: finishedGamesInYear },
  ] = await Promise.all([
    // Todos os jogos finalizados para extrair anos disponíveis
    service
      .from("games")
      .select("scheduled_at")
      .eq("team_id", team.id)
      .eq("status", "finished"),
    // Todos os lançamentos retroativos para extrair anos disponíveis
    service
      .from("player_stat_adjustments")
      .select("year, player_id")
      .in(
        "player_id",
        // subquery via join não disponível, buscamos todos e filtramos abaixo
        // placeholder: busca todos os jogadores da turma primeiro
        (
          await service
            .from("players")
            .select("id")
            .eq("team_id", team.id)
        ).data?.map((p) => p.id) ?? []
      ),
    // Jogadores da turma
    service
      .from("players")
      .select("id, name, created_at")
      .eq("team_id", team.id)
      .order("name"),
    // Jogos finalizados no ano selecionado
    service
      .from("games")
      .select("id, scheduled_at")
      .eq("team_id", team.id)
      .eq("status", "finished")
      .gte("scheduled_at", yearStart)
      .lt("scheduled_at", yearEnd),
  ]);

  // Anos disponíveis (union de jogos finalizados e lançamentos retroativos)
  const yearsSet = new Set<number>();
  yearsSet.add(currentYear);
  (allFinishedGames ?? []).forEach((g) =>
    yearsSet.add(new Date(g.scheduled_at).getFullYear())
  );
  (allAdjustments ?? []).forEach((a) => yearsSet.add(a.year));
  const availableYears = [...yearsSet].sort((a, b) => b - a);

  const teamPlayers = players ?? [];
  const playerIds = teamPlayers.map((p) => p.id);

  const finishedGameList = finishedGamesInYear ?? [];
  const finishedGameIds = finishedGameList.map((g) => g.id);
  const totalFinishedGames = finishedGameIds.length;

  // Busca stats reais dos jogos do ano
  let gtpRows: { player_id: string; goals: number; assists: number; game_team_id: string }[] = [];
  let gameTeamGameMap = new Map<string, string>(); // game_team_id → game_id

  if (finishedGameIds.length > 0) {
    const { data: gameTeams } = await service
      .from("game_teams")
      .select("id, game_id")
      .in("game_id", finishedGameIds);

    const gameTeamIds = (gameTeams ?? []).map((gt) => gt.id);
    gameTeamGameMap = new Map((gameTeams ?? []).map((gt) => [gt.id, gt.game_id]));

    if (gameTeamIds.length > 0) {
      const { data: gtp } = await service
        .from("game_team_players")
        .select("player_id, goals, assists, game_team_id")
        .in("game_team_id", gameTeamIds);
      gtpRows = gtp ?? [];
    }
  }

  // Confirmações (confirmed + waitlist) nos jogos finalizados do ano
  const confirmationsInYear =
    finishedGameIds.length > 0 && playerIds.length > 0
      ? (
          await service
            .from("game_confirmations")
            .select("player_id, game_id")
            .in("game_id", finishedGameIds)
            .in("player_id", playerIds)
            .in("status", ["confirmed", "waitlist"])
        ).data ?? []
      : [];

  // Lançamentos retroativos do ano selecionado para jogadores desta turma
  const adjustmentsInYear =
    playerIds.length > 0
      ? (
          await service
            .from("player_stat_adjustments")
            .select("player_id, goals, assists")
            .eq("year", year)
            .in("player_id", playerIds)
        ).data ?? []
      : [];

  // Computa stats por jogador
  const rankings: PlayerRanking[] = teamPlayers.map((player) => {
    const myGtp = gtpRows.filter((r) => r.player_id === player.id);
    const myAdj = adjustmentsInYear.filter((a) => a.player_id === player.id);

    const goals =
      myGtp.reduce((s, r) => s + r.goals, 0) +
      myAdj.reduce((s, a) => s + a.goals, 0);

    const assists =
      myGtp.reduce((s, r) => s + r.assists, 0) +
      myAdj.reduce((s, a) => s + a.assists, 0);

    // Presença: confirmações (confirmed/waitlist) ÷ jogos finalizados após cadastro do jogador
    const registeredAt = new Date(player.created_at);
    const eligibleGames = finishedGameList.filter(
      (g) => new Date(g.scheduled_at) >= registeredAt
    );
    const eligibleGameIds = new Set(eligibleGames.map((g) => g.id));
    const denominator = eligibleGames.length;
    const gamesPlayed = confirmationsInYear.filter(
      (c) => c.player_id === player.id && eligibleGameIds.has(c.game_id)
    ).length;
    const attendanceRate =
      denominator > 0 ? Math.round((gamesPlayed / denominator) * 100) : 0;

    return {
      playerId: player.id,
      name: player.name,
      goals,
      assists,
      gamesPlayed,
      attendanceRate,
    };
  });

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Rankings</h1>
        <YearSelect years={availableYears} current={year} />
      </div>

      {totalFinishedGames === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          Nenhum jogo finalizado em {year}.
        </p>
      ) : (
        <div className="space-y-4">
          <RankingTable
            title="Artilheiros"
            rows={rankings}
            sortKey="goals"
            tieKey="assists"
            label="Gols"
            tieLabel="Assists"
          />
          <RankingTable
            title="Assistências"
            rows={rankings}
            sortKey="assists"
            tieKey="goals"
            label="Assists"
            tieLabel="Gols"
          />
          <AttendanceTable rows={rankings} />
        </div>
      )}

      {totalFinishedGames === 0 && adjustmentsInYear.length > 0 && (
        <div className="space-y-4">
          <RankingTable
            title="Artilheiros (retroativo)"
            rows={rankings}
            sortKey="goals"
            tieKey="assists"
            label="Gols"
            tieLabel="Assists"
          />
          <RankingTable
            title="Assistências (retroativo)"
            rows={rankings}
            sortKey="assists"
            tieKey="goals"
            label="Assists"
            tieLabel="Gols"
          />
        </div>
      )}

    </div>
  );
}
