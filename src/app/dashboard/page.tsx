import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin-context';
import { AccessCodeCard } from '@/components/dashboard/access-code-card';
import { DashboardMenu } from '@/components/dashboard/dashboard-menu';
import { AppLogo } from '@/components/app-logo';
import {
  AttendanceChart,
  type GameAttendance,
} from '@/components/dashboard/attendance-chart';

export default async function DashboardPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect('/login');

  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id, name, access_code, match_duration_minutes')
    .eq('admin_id', ctx.effectiveAdminId)
    .single();

  if (!team) redirect('/login');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { data: recentGames } = await service
    .from('games')
    .select('id, scheduled_at')
    .eq('team_id', team.id)
    .eq('status', 'finished')
    .order('scheduled_at', { ascending: false })
    .limit(8);

  let chartData: GameAttendance[] = [];
  if (recentGames && recentGames.length > 0) {
    const gameIds = recentGames.map(g => g.id);
    const { data: confirmations } = await service
      .from('game_confirmations')
      .select('game_id, status')
      .in('game_id', gameIds)
      .in('status', ['confirmed', 'waitlist']);

    const confirmedByGame = new Map<string, number>();
    const waitlistByGame = new Map<string, number>();
    for (const c of confirmations ?? []) {
      if (c.status === 'confirmed') {
        confirmedByGame.set(
          c.game_id,
          (confirmedByGame.get(c.game_id) ?? 0) + 1,
        );
      } else {
        waitlistByGame.set(c.game_id, (waitlistByGame.get(c.game_id) ?? 0) + 1);
      }
    }

    chartData = recentGames
      .map(g => ({
        gameId: g.id,
        date: new Date(g.scheduled_at),
        confirmed: confirmedByGame.get(g.id) ?? 0,
        waitlist: waitlistByGame.get(g.id) ?? 0,
      }))
      .reverse();
  }

  return (
    <div className="flex flex-col bg-background">
      <div
        className="relative w-full flex flex-col items-center pt-12 pb-10 px-8"
        style={{ backgroundColor: '#fed015' }}
      >
        <div className="absolute top-4 right-4">
          <DashboardMenu
            appUrl={appUrl}
            teamName={team.name}
            matchDurationMinutes={team.match_duration_minutes ?? 10}
            isCoAdmin={ctx.isCoAdmin}
          />
        </div>
        <AppLogo size="md" />
        <p className="text-lg font-semibold mt-3" style={{ color: '#002776' }}>
          {team.name}
        </p>
        <p className="text-sm mt-0.5" style={{ color: '#002776' }}>
          Olá, <span className="font-medium">{ctx.adminName}</span>!
        </p>
      </div>

      <div className="flex-1 w-full max-w-sm mx-auto px-6 pt-8">
        <AccessCodeCard
          teamName={team.name}
          accessCode={team.access_code}
          appUrl={appUrl}
        />
      </div>

      {chartData.length > 0 && (
        <div className="w-full max-w-sm mx-auto px-6 pt-6 pb-8">
          <p className="font-semibold text-base">Confirmações por jogo</p>
          <p className="text-sm text-muted-foreground mb-4">
            Últimos {chartData.length} jogos finalizados
          </p>
          <AttendanceChart data={chartData} />
        </div>
      )}
    </div>
  );
}
