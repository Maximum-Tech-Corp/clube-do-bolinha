import { createClient, createServiceClient } from '@/lib/supabase/server';

export interface AdminContext {
  userId: string;
  adminId: string;
  effectiveAdminId: string;
  adminName: string;
  isCoAdmin: boolean;
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const service = createServiceClient();

  const { data: admin } = await service
    .from('admins')
    .select('id, name, co_admin_of')
    .eq('user_id', user.id)
    .single();

  if (!admin) return null;

  return {
    userId: user.id,
    adminId: admin.id,
    effectiveAdminId: admin.co_admin_of ?? admin.id,
    adminName: admin.name,
    isCoAdmin: !!admin.co_admin_of,
  };
}

export async function getEffectiveTeamId(): Promise<string | null> {
  const ctx = await getAdminContext();
  if (!ctx) return null;

  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id')
    .eq('admin_id', ctx.effectiveAdminId)
    .single();

  return team?.id ?? null;
}
