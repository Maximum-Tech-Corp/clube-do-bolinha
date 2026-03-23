'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function updateAccessCodePrefix(
  prefix: string,
): Promise<{ error?: string }> {
  const normalized = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '');

  if (normalized.length !== 4) {
    return {
      error: 'O prefixo deve ter exatamente 4 caracteres alfanuméricos.',
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Não autenticado.' };

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!admin) return { error: 'Admin não encontrado.' };

  const { data: team } = await supabase
    .from('teams')
    .select('id, access_code')
    .eq('admin_id', admin.id)
    .single();

  if (!team) return { error: 'Turma não encontrada.' };

  const suffix = team.access_code.split('-')[1];
  const newCode = `${normalized}-${suffix}`;

  // Verifica unicidade excluindo a própria turma
  const service = createServiceClient();
  const { data: existing } = await service
    .from('teams')
    .select('id')
    .eq('access_code', newCode)
    .neq('id', team.id)
    .maybeSingle();

  if (existing) {
    return { error: 'Este código já está em uso. Tente outro prefixo.' };
  }

  const { error } = await service
    .from('teams')
    .update({ access_code: newCode, access_code_prefix: normalized })
    .eq('id', team.id);

  if (error) return { error: 'Erro ao atualizar código.' };

  revalidatePath('/dashboard');
  return {};
}

export async function updateTeamSettings({
  matchDurationMinutes,
  teamName,
}: {
  matchDurationMinutes: number;
  teamName: string;
}): Promise<{ error?: string }> {
  const minutes = Math.max(1, Math.floor(matchDurationMinutes));
  const name = teamName.trim();

  if (!name) return { error: 'O nome da turma não pode ser vazio.' };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: 'Não autenticado.' };

  const { data: admin } = await supabase
    .from('admins')
    .select('id')
    .eq('user_id', user.id)
    .single();

  if (!admin) return { error: 'Admin não encontrado.' };

  const service = createServiceClient();
  const { error } = await service
    .from('teams')
    .update({ match_duration_minutes: minutes, name })
    .eq('admin_id', admin.id);

  if (error) return { error: 'Erro ao salvar configurações.' };

  revalidatePath('/dashboard');
  return {};
}
