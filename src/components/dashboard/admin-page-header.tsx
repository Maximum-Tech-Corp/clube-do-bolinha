import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { redirect } from 'next/navigation';
import { createServiceClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin-context';
import { DashboardMenu } from './dashboard-menu';

interface Props {
  title: string;
  backHref?: string;
}

export async function AdminPageHeader({ title, backHref }: Props) {
  const ctx = await getAdminContext();
  if (!ctx) redirect('/login');

  const service = createServiceClient();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const { data: team } = await service
    .from('teams')
    .select('name, match_duration_minutes')
    .eq('admin_id', ctx.effectiveAdminId)
    .single();

  if (!team) redirect('/login');

  return (
    <div className="w-full" style={{ backgroundColor: '#fed015' }}>
      <div className="flex items-center gap-3 px-4 py-4 max-w-2xl mx-auto">
        {backHref && (
          <Link href={backHref} aria-label="Voltar" className="shrink-0">
            <ArrowLeft className="w-5 h-5" style={{ color: '#002776' }} />
          </Link>
        )}
        <h1 className="text-lg font-bold flex-1" style={{ color: '#002776' }}>
          {title}
        </h1>
        <DashboardMenu
          appUrl={appUrl}
          teamName={team.name}
          matchDurationMinutes={team.match_duration_minutes ?? 10}
          isCoAdmin={ctx.isCoAdmin}
        />
      </div>
    </div>
  );
}
