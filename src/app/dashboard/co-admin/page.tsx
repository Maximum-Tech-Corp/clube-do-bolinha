import { redirect } from 'next/navigation';
import { AppLogo } from '@/components/app-logo';
import { getAdminContext } from '@/lib/admin-context';
import { getCoAdmin } from '@/actions/co-admin';
import { CoAdminForm } from '@/components/dashboard/co-admin-form';

export default async function CoAdminPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect('/login');
  if (ctx.isCoAdmin) redirect('/dashboard');

  const coAdmin = await getCoAdmin();

  return (
    <div className="flex flex-col bg-background">
      <div
        className="w-full flex flex-col items-center pt-12 pb-10 px-8"
        style={{ backgroundColor: '#fed015' }}
      >
        <AppLogo size="md" />
        <p className="text-sm mt-4 font-bold" style={{ color: '#002776' }}>
          Defina o Co-admin
        </p>
      </div>

      <div className="flex-1 w-full max-w-sm mx-auto px-6 pt-8">
        <CoAdminForm initialEmail={coAdmin?.email ?? null} />
      </div>
    </div>
  );
}
