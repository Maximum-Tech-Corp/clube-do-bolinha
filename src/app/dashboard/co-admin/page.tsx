import { redirect } from 'next/navigation';
import { getAdminContext } from '@/lib/admin-context';
import { getCoAdmin } from '@/actions/co-admin';
import { CoAdminForm } from '@/components/dashboard/co-admin-form';
import { AdminPageHeader } from '@/components/dashboard/admin-page-header';

export default async function CoAdminPage() {
  const ctx = await getAdminContext();
  if (!ctx) redirect('/login');
  if (ctx.isCoAdmin) redirect('/dashboard');

  const coAdmin = await getCoAdmin();

  return (
    <>
      <AdminPageHeader title="Co-admin" backHref="/dashboard" />
      <div className="flex-1 w-full max-w-sm mx-auto px-6 pt-8">
        <CoAdminForm initialEmail={coAdmin?.email ?? null} />
      </div>
    </>
  );
}
