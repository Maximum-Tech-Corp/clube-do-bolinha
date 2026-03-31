import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { TeamCodeForm } from './team-code-form';

export default async function JogadorPage() {
  const cookieStore = await cookies();
  const lastCode = cookieStore.get('last_team_code')?.value;
  if (lastCode) redirect(`/jogador/${lastCode}`);

  return <TeamCodeForm />;
}
