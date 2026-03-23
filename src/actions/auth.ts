'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { generateAccessCode } from '@/lib/access-code';
import { redirect } from 'next/navigation';

export async function signup(data: {
  name: string;
  email: string;
  phone: string;
  teamName: string;
  password: string;
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Erro ao criar conta.' };
  }

  const service = createServiceClient();

  const { data: admin, error: adminError } = await service
    .from('admins')
    .insert({ user_id: authData.user.id, name: data.name, phone: data.phone })
    .select('id')
    .single();

  if (adminError || !admin) {
    return { error: 'Erro ao criar perfil. Tente novamente.' };
  }

  // Gera código único com até 10 tentativas para evitar colisão
  let code = generateAccessCode();
  for (let i = 0; i < 10; i++) {
    const { data: existing } = await service
      .from('teams')
      .select('id')
      .eq('access_code', code.full)
      .maybeSingle();
    if (!existing) break;
    code = generateAccessCode();
  }

  const { error: teamError } = await service.from('teams').insert({
    admin_id: admin.id,
    name: data.teamName,
    access_code: code.full,
    access_code_prefix: code.prefix,
  });

  if (teamError) {
    return { error: 'Erro ao criar turma. Tente novamente.' };
  }

  return { success: true };
}

export async function login(data: {
  email: string;
  password: string;
}): Promise<{ error: string } | never> {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) {
    return { error: 'E-mail ou senha inválidos.' };
  }

  redirect('/dashboard');
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
