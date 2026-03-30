'use server';

import { Resend } from 'resend';
import { createClient, createServiceClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSupportEmail(data: {
  type: 'bug' | 'suggestion' | 'complaint' | 'help';
  message: string;
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Sessão inválida.' };
  }

  const service = createServiceClient();
  const { data: admin } = await service
    .from('admins')
    .select('name, phone')
    .eq('user_id', user.id)
    .single();

  const typeLabel =
    data.type === 'bug'
      ? '🐛 Bug Report'
      : data.type === 'suggestion'
        ? '💡 Sugestão'
        : data.type === 'complaint'
          ? '😤 Reclamação'
          : '🙋 Ajuda';
  const subject = `[Suporte] ${typeLabel} — Clube do Bolinha`;

  const html = `
    <h2>${typeLabel}</h2>
    <p><strong>Admin:</strong> ${admin?.name ?? 'Desconhecido'}</p>
    <p><strong>Email:</strong> ${user.email}</p>
    <hr />
    <p>${data.message.replace(/\n/g, '<br />')}</p>
  `;

  const { error } = await resend.emails.send({
    from: 'suporte@clube-do-bolinha.app.br',
    to: process.env.SUPPORT_EMAIL!,
    replyTo: user.email,
    subject,
    html,
  });

  if (error) {
    return { error: 'Não foi possível enviar. Tente novamente.' };
  }

  return { success: true };
}
