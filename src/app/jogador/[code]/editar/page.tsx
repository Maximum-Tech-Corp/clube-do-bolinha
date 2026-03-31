import { notFound, redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createServiceClient } from '@/lib/supabase/server';
import { PlayerBottomNav } from '@/components/player/player-bottom-nav';
import { PlayerSelfEditForm } from '@/components/player/player-self-edit-form';

interface Props {
  params: Promise<{ code: string }>;
}

export default async function EditarDadosPage({ params }: Props) {
  const { code } = await params;
  const upperCode = code.toUpperCase();
  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id')
    .eq('access_code', upperCode)
    .maybeSingle();

  if (!team) notFound();

  const cookieStore = await cookies();
  const playerPhone = cookieStore.get(`player_${team.id}`)?.value;
  if (!playerPhone) redirect(`/jogador/${upperCode}/entrar`);

  const { data: player } = await service
    .from('players')
    .select('id, name, phone, weight_kg, stamina, position, is_star')
    .eq('team_id', team.id)
    .eq('phone', playerPhone)
    .maybeSingle();

  if (!player) redirect(`/jogador/${upperCode}/entrar`);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="w-full" style={{ backgroundColor: '#fed015' }}>
        <div className="flex items-center gap-3 px-4 py-4 max-w-2xl mx-auto">
          <Link href={`/jogador/${upperCode}`} aria-label="Voltar" className="shrink-0">
            <ArrowLeft className="w-5 h-5" style={{ color: '#002776' }} />
          </Link>
          <h1 className="text-lg font-bold flex-1" style={{ color: '#002776' }}>
            Editar meus dados
          </h1>
        </div>
      </div>

      <div className="flex-1 w-full max-w-sm mx-auto px-6 pt-8 pb-24">
        <PlayerSelfEditForm player={player} teamId={team.id} />
      </div>

      <PlayerBottomNav teamCode={upperCode} />
    </div>
  );
}
