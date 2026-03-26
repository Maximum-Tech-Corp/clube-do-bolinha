'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin-context';
import { revalidatePath } from 'next/cache';

export async function getCoAdmin(): Promise<{ email: string } | null> {
  const ctx = await getAdminContext();
  if (!ctx || ctx.isCoAdmin) return null;

  const service = createServiceClient();

  const { data: coAdmin } = await service
    .from('admins')
    .select('id, user_id')
    .eq('co_admin_of', ctx.adminId)
    .maybeSingle();

  if (!coAdmin) return null;

  const { data: authData } = await service.auth.admin.getUserById(
    coAdmin.user_id,
  );
  if (!authData.user?.email) return null;

  return { email: authData.user.email };
}

export async function setCoAdmin(
  email: string,
  password: string,
): Promise<{ error?: string }> {
  const ctx = await getAdminContext();
  if (!ctx) return { error: 'Não autorizado.' };
  if (ctx.isCoAdmin)
    return { error: 'Co-admins não podem definir outro co-admin.' };

  const service = createServiceClient();

  const { data: existing } = await service
    .from('admins')
    .select('id')
    .eq('co_admin_of', ctx.adminId)
    .maybeSingle();

  if (existing) return { error: 'Já existe um co-admin definido.' };

  const { data: authData, error: authError } =
    await service.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (authError || !authData.user) {
    const isEmailTaken =
      authError?.message?.toLowerCase().includes('already') ||
      authError?.status === 422;
    return {
      error: isEmailTaken
        ? 'Este e-mail já está vinculado a outra turma de futebol.'
        : (authError?.message ?? 'Erro ao criar conta do co-admin.'),
    };
  }

  const emailPrefix = email.split('@')[0] ?? email;

  const { error: adminError } = await service.from('admins').insert({
    user_id: authData.user.id,
    name: emailPrefix,
    phone: '',
    subscription_status: 'active',
    co_admin_of: ctx.adminId,
  });

  if (adminError) {
    await service.auth.admin.deleteUser(authData.user.id);
    return { error: 'Erro ao configurar co-admin.' };
  }

  revalidatePath('/dashboard/co-admin');
  return {};
}

export async function removeCoAdmin(): Promise<{ error?: string }> {
  const ctx = await getAdminContext();
  if (!ctx) return { error: 'Não autorizado.' };
  if (ctx.isCoAdmin)
    return { error: 'Co-admins não podem remover o co-admin.' };

  const service = createServiceClient();

  const { data: coAdmin } = await service
    .from('admins')
    .select('id, user_id')
    .eq('co_admin_of', ctx.adminId)
    .maybeSingle();

  if (!coAdmin) return {};

  const { error } = await service.auth.admin.deleteUser(coAdmin.user_id);
  if (error) return { error: 'Erro ao remover co-admin.' };

  revalidatePath('/dashboard/co-admin');
  return {};
}
