'use server';

import { createServiceClient } from '@/lib/supabase/server';
import { getAdminContext } from '@/lib/admin-context';
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

  const ctx = await getAdminContext();
  if (!ctx) return { error: 'Não autenticado.' };

  const service = createServiceClient();

  const { data: team } = await service
    .from('teams')
    .select('id, access_code')
    .eq('admin_id', ctx.effectiveAdminId)
    .single();

  if (!team) return { error: 'Turma não encontrada.' };

  const suffix = team.access_code.split('-')[1];
  const newCode = `${normalized}-${suffix}`;

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

  const ctx = await getAdminContext();
  if (!ctx) return { error: 'Não autenticado.' };

  const service = createServiceClient();
  const { error } = await service
    .from('teams')
    .update({ match_duration_minutes: minutes, name })
    .eq('admin_id', ctx.effectiveAdminId);

  if (error) return { error: 'Erro ao salvar configurações.' };

  revalidatePath('/dashboard');
  return {};
}
