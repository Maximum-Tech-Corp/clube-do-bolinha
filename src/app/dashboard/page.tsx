import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AccessCodeCard } from '@/components/dashboard/access-code-card';
import { DashboardMenu } from '@/components/dashboard/dashboard-menu';
import { AppLogo } from '@/components/app-logo';

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: admin } = await supabase
    .from('admins')
    .select('id, name')
    .eq('user_id', user.id)
    .single();

  if (!admin) redirect('/login');

  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('name, access_code, match_duration_minutes')
    .eq('admin_id', admin.id)
    .single();

  if (!team) redirect('/login');

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  return (
    <div className="max-w-md mx-auto p-4 pt-8 space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex flex-col items-center gap-1 flex-1">
          <AppLogo size="sm" />
          <p className="text-sm font-semibold text-foreground">{team.name}</p>
          <p className="text-xs text-muted-foreground">
            Olá, <span className="font-medium">{admin.name}</span>!
          </p>
        </div>
        <DashboardMenu
          appUrl={appUrl}
          teamName={team.name}
          matchDurationMinutes={team.match_duration_minutes ?? 10}
        />
      </div>

      <AccessCodeCard
        teamName={team.name}
        accessCode={team.access_code}
        appUrl={appUrl}
      />
    </div>
  );
}
