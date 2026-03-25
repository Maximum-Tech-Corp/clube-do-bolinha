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
          />
        </div>
        <AppLogo size="md" />
        <p className="text-lg font-semibold mt-3 text-white">{team.name}</p>
        <p className="text-sm text-white mt-0.5">
          Olá, <span className="font-medium">{admin.name}</span>!
        </p>
      </div>

      <div className="flex-1 w-full max-w-sm mx-auto px-6 pt-8">
        <AccessCodeCard
          teamName={team.name}
          accessCode={team.access_code}
          appUrl={appUrl}
        />
      </div>
    </div>
  );
}
