import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin-context';
import { YearSelect } from '@/components/dashboard/year-select';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';

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
  championships: number;
  vices: number;
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
    .filter(r => (r[sortKey] as number) > 0)
    .sort(
      (a, b) =>
        (b[sortKey] as number) - (a[sortKey] as number) ||
        (b[tieKey] as number) - (a[tieKey] as number),
    );

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-lg shadow-md bg-gray-50 overflow-hidden">
      <div className="px-4 py-2 bg-primary/10">
        <h2 className="font-semibold text-sm text-primary">{title}</h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs border-b border-gray-200">
            <th className="text-left px-4 py-1.5 w-6">#</th>
            <th className="text-left px-4 py-1.5">Jogador</th>
            <th className="text-center px-2 py-1.5">{label}</th>
            <th className="text-center px-2 py-1.5 text-muted-foreground/70">
              {tieLabel}
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
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

function GeneralStatsTable({ rows }: { rows: PlayerRanking[] }) {
  const sorted = [...rows]
    .filter(r => r.gamesPlayed > 0)
    .sort((a, b) => b.gamesPlayed - a.gamesPlayed);

  if (sorted.length === 0) return null;

  return (
    <div className="rounded-lg shadow-md bg-gray-50 overflow-hidden">
      <div className="px-4 py-2 bg-primary/10">
        <h2 className="font-semibold text-sm text-primary">
          Estatísticas Gerais
        </h2>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-muted-foreground text-xs border-b border-gray-200">
            <th className="text-left px-4 py-1.5 w-6">#</th>
            <th className="text-left px-4 py-1.5">Jogador</th>
            <th className="text-center px-2 py-1.5">Qtd. Jogos</th>
            <th className="text-center px-2 py-1.5">Campeão</th>
            <th className="text-center px-2 py-1.5">Vice</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
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
                {r.championships}
              </td>
              <td className="px-2 py-2 text-center tabular-nums">{r.vices}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function RankingsPage({ searchParams }: Props) {
  const ctx = await getAdminContext();
  if (!ctx) redirect('/login');

  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id')
    .eq('admin_id', ctx.effectiveAdminId)
    .single();
  if (!team) redirect('/login');

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
      .from('games')
      .select('scheduled_at')
      .eq('team_id', team.id)
      .eq('status', 'finished'),
    // Todos os lançamentos retroativos para extrair anos disponíveis
    service
      .from('player_stat_adjustments')
      .select('year, player_id')
      .in(
        'player_id',
        // subquery via join não disponível, buscamos todos e filtramos abaixo
        // placeholder: busca todos os jogadores da turma primeiro
        (
          await service.from('players').select('id').eq('team_id', team.id)
        ).data?.map(p => p.id) ?? [],
      ),
    // Jogadores da turma
    service
      .from('players')
      .select('id, name, created_at')
      .eq('team_id', team.id)
      .order('name'),
    // Jogos finalizados no ano selecionado
    service
      .from('games')
      .select('id, scheduled_at, is_tournament')
      .eq('team_id', team.id)
      .eq('status', 'finished')
      .gte('scheduled_at', yearStart)
      .lt('scheduled_at', yearEnd),
  ]);

  // Anos disponíveis (union de jogos finalizados e lançamentos retroativos)
  const yearsSet = new Set<number>();
  yearsSet.add(currentYear);
  (allFinishedGames ?? []).forEach(g =>
    yearsSet.add(new Date(g.scheduled_at).getFullYear()),
  );
  (allAdjustments ?? []).forEach(a => yearsSet.add(a.year));
  const availableYears = [...yearsSet].sort((a, b) => b - a);

  const teamPlayers = players ?? [];
  const playerIds = teamPlayers.map(p => p.id);

  const finishedGameList = finishedGamesInYear ?? [];
  const finishedGameIds = finishedGameList.map(g => g.id);
  const totalFinishedGames = finishedGameIds.length;

  // Busca stats reais dos jogos do ano
  let gtpRows: {
    player_id: string;
    goals: number;
    assists: number;
    game_team_id: string;
  }[] = [];
  const championTeamIds = new Set<string>();
  const viceTeamIds = new Set<string>();

  if (finishedGameIds.length > 0) {
    const { data: gameTeams } = await service
      .from('game_teams')
      .select('id, game_id')
      .in('game_id', finishedGameIds);

    const gameTeamIds = (gameTeams ?? []).map(gt => gt.id);

    // Busca finais dos torneios concluídos para calcular campeão/vice
    const tournamentGameIds = finishedGameList
      .filter(g => g.is_tournament)
      .map(g => g.id);

    if (tournamentGameIds.length > 0) {
      const { data: finals } = await service
        .from('tournament_matches')
        .select('home_team_id, away_team_id, home_score, away_score')
        .in('game_id', tournamentGameIds)
        .eq('phase', 'final')
        .eq('completed', true);

      (finals ?? [])
        .filter(
          f =>
            f.home_score !== null &&
            f.away_score !== null &&
            f.home_score !== f.away_score,
        )
        .forEach(f => {
          const homeWon = (f.home_score ?? 0) > (f.away_score ?? 0);
          championTeamIds.add(homeWon ? f.home_team_id : f.away_team_id);
          viceTeamIds.add(homeWon ? f.away_team_id : f.home_team_id);
        });
    }

    if (gameTeamIds.length > 0) {
      const { data: gtp } = await service
        .from('game_team_players')
        .select('player_id, goals, assists, game_team_id')
        .in('game_team_id', gameTeamIds);
      gtpRows = gtp ?? [];
    }
  }

  // Confirmações (confirmed + waitlist) nos jogos finalizados do ano
  const confirmationsInYear =
    finishedGameIds.length > 0 && playerIds.length > 0
      ? ((
          await service
            .from('game_confirmations')
            .select('player_id, game_id')
            .in('game_id', finishedGameIds)
            .in('player_id', playerIds)
            .in('status', ['confirmed', 'waitlist'])
        ).data ?? [])
      : [];

  // Lançamentos retroativos do ano selecionado para jogadores desta turma
  const adjustmentsInYear =
    playerIds.length > 0
      ? ((
          await service
            .from('player_stat_adjustments')
            .select('player_id, goals, assists')
            .eq('year', year)
            .in('player_id', playerIds)
        ).data ?? [])
      : [];

  // Computa stats por jogador
  const rankings: PlayerRanking[] = teamPlayers.map(player => {
    const myGtp = gtpRows.filter(r => r.player_id === player.id);
    const myAdj = adjustmentsInYear.filter(a => a.player_id === player.id);

    const goals =
      myGtp.reduce((s, r) => s + r.goals, 0) +
      myAdj.reduce((s, a) => s + a.goals, 0);

    const assists =
      myGtp.reduce((s, r) => s + r.assists, 0) +
      myAdj.reduce((s, a) => s + a.assists, 0);

    // Presença: confirmações (confirmed/waitlist) ÷ jogos finalizados após cadastro do jogador
    const registeredAt = new Date(player.created_at);
    const eligibleGames = finishedGameList.filter(
      g => new Date(g.scheduled_at) >= registeredAt,
    );
    const eligibleGameIds = new Set(eligibleGames.map(g => g.id));
    const denominator = eligibleGames.length;
    const gamesPlayed = confirmationsInYear.filter(
      c => c.player_id === player.id && eligibleGameIds.has(c.game_id),
    ).length;
    const attendanceRate =
      denominator > 0 ? Math.round((gamesPlayed / denominator) * 100) : 0;

    const championships = myGtp.filter(r =>
      championTeamIds.has(r.game_team_id),
    ).length;
    const vices = myGtp.filter(r => viceTeamIds.has(r.game_team_id)).length;

    return {
      playerId: player.id,
      name: player.name,
      goals,
      assists,
      gamesPlayed,
      attendanceRate,
      championships,
      vices,
    };
  });

  return (
    <>
      <AdminPageHeader title="Rankings" />
      <div className="max-w-2xl mx-auto p-4 space-y-4">
        <div className="flex justify-center">
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
            <GeneralStatsTable rows={rankings} />
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
    </>
  );
}
