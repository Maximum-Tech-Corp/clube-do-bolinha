# Plano — Resend (SMTP) + Funcionalidade de Suporte

> Guia step-by-step para configurar o Resend como provedor de email em produção
> e implementar o modal de suporte no dashboard do admin.
>
> **Legenda:** 🌐 Interação externa (navegador/painel) · 💻 Implementação no código

---

## Parte 1 — Configurar Resend como SMTP do Supabase

### STEP 1 — Criar conta no Resend

🌐 **Resend Dashboard**

1. Acesse [resend.com](https://resend.com) e crie uma conta (login com GitHub funciona normalmente)
2. O onboarding exibe uma tela "Send your first email" com um campo "Add an API Key" — **ignore esse fluxo**
3. Vá direto pelo menu lateral em **"Domains"** para iniciar pela verificação do domínio

---

### STEP 2 — Adicionar e verificar o domínio

🌐 **Resend Dashboard → Domains → Add Domain**

1. Informe o domínio do app: `clube-do-bolinha.app.br`
2. Escolha o modo **"Manual"** (o domínio está no Registro.br, mas os nameservers apontam para a Vercel)
3. O Resend exibirá 4 registros DNS para adicionar (DKIM, MX, SPF, DMARC)
4. **Os registros DNS são gerenciados na Vercel**, não no Registro.br — porque os nameservers do domínio são `ns1.vercel-dns.com` e `ns2.vercel-dns.com`
5. Para acessar o gerenciador de DNS da Vercel: **Vercel → projeto → Settings → Domains → clique em "Edit" no domínio `www.clube-do-bolinha.app.br` → "View DNS Records & More for clube-do-bolinha.app.br →"**
6. Nessa tela há uma seção **"DNS Records"** com os campos Name, Type, Value, TTL, Priority — adicione os 4 registros:

   | Name | Type | Value | Priority |
   |---|---|---|---|
   | `resend._domainkey` | `TXT` | `p=MIGfMA0G...` (valor gerado pelo Resend) | — |
   | `send` | `MX` | `feedback-smtp.sa-east-1.amazonses.com` | `10` |
   | `send` | `TXT` | `v=spf1 include:amazonses.com ~all` | — |
   | `_dmarc` | `TXT` | `v=DMARC1; p=none;` | — |

7. Volte no Resend e clique em **"Verify DNS Records"**
8. Aguarde a propagação (pode levar de 1 min a 1 hora)

---

### STEP 3 — Gerar API Key do Resend

🌐 **Resend Dashboard → API Keys → Create API Key**

1. Dê um nome descritivo: `clube-do-bolinha-supabase-smtp`
2. Permissão: **"Sending access"** (não precisa de full access)
3. Domain: selecione `clube-do-bolinha.app.br` (vincula a key ao domínio verificado)
4. Copie a key gerada — ela só aparece uma vez, começa com `re_`
5. Guarde em local seguro (vai para as variáveis de ambiente)

---

### STEP 4 — Configurar SMTP no Supabase de Produção

🌐 **Supabase Dashboard (projeto de produção) → Authentication → SMTP Settings**

Preencha com as seguintes credenciais do Resend:

| Campo | Valor |
|---|---|
| **Enable Custom SMTP** | ✅ Ativado |
| **Host** | `smtp.resend.com` |
| **Port** | `465` |
| **Username** | `resend` |
| **Password** | A API Key gerada no STEP 3 |
| **Sender email** | `noreply@clube-do-bolinha.app.br` |
| **Sender name** | `Clube do Bolinha` |

Clique em **"Save"**.

---

### STEP 5 — Personalizar os templates de email

🌐 **Supabase Dashboard → Authentication → Email Templates**

Personalize os dois templates que usamos:

**Confirm signup** (enviado ao cadastrar novo admin):

```
Assunto: Confirme seu cadastro — Clube do Bolinha
```
```html
<h2>Bem-vindo ao Clube do Bolinha!</h2>
<p>Clique no link abaixo para confirmar seu endereço de email e ativar sua conta:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar email</a></p>
<p>Se você não criou uma conta, ignore este email.</p>
<p>— Clube do Bolinha</p>
```

**Reset Password** (enviado ao usar "Esqueci a senha"):

```
Assunto: Redefinição de senha — Clube do Bolinha
```
```html
<h2>Redefinir senha</h2>
<p>Você solicitou a redefinição de senha da sua conta no <strong>Clube do Bolinha</strong>.</p>
<p><a href="{{ .ConfirmationURL }}">Redefinir senha</a></p>
<p>Se você não solicitou isso, ignore este email.</p>
<p>— Clube do Bolinha</p>
```

---

### STEP 6 — Verificar na Vercel (variáveis de ambiente)

💻 **Vercel Dashboard → seu projeto → Settings → Environment Variables**

Adicione a variável:

```
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
```

> Essa variável ainda não é usada pelo código agora — mas já deixa preparado para a Parte 2.

Após adicionar, faça **Redeploy** para as variáveis entrarem em vigor.

---

### STEP 7 — Testar o fluxo completo

🌐 **App em produção**

1. Acesse `/cadastro` e crie uma conta de teste com um email real
2. Verifique se o email de confirmação chegou com remetente `Clube do Bolinha` e não `Supabase`
3. Acesse `/esqueci-senha` e solicite o reset para o mesmo email
4. Verifique se o email de reset chegou formatado corretamente
5. Clique no link e confirme que o fluxo de redefinição funciona

🌐 **Resend Dashboard → Emails**

- Todos os envios aparecem aqui com status (delivered, bounced, etc.)
- Útil para debugar caso algum email não chegue

**Verificar antes de avançar:**
- Email de confirmação de cadastro chegando com nome e layout corretos
- Email de reset de senha chegando e link funcionando
- Sem erros no Resend Dashboard → Emails

---

## Parte 2 — Funcionalidade de Suporte no Dashboard

### STEP 8 — Instalar o SDK do Resend

💻 **Terminal**

```bash
npm install resend
```

---

### STEP 9 — Criar a Server Action de suporte

💻 **`src/actions/support.ts`** (arquivo novo)

```typescript
'use server';

import { Resend } from 'resend';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendSupportEmail(data: {
  type: 'bug' | 'suggestion';
  message: string;
}): Promise<{ error: string } | { success: true }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Sessão inválida.' };
  }

  const service = createServiceClient();
  const { data: admin } = await service
    .from('admins')
    .select('name, phone')
    .eq('user_id', user.id)
    .single();

  const typeLabel = data.type === 'bug' ? '🐛 Bug Report' : '💡 Sugestão';
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
```

---

### STEP 10 — Adicionar variável de ambiente

💻 **`.env.local`** e **Vercel → Environment Variables**

```
SUPPORT_EMAIL=seu@email.com
```

Essa é a caixa onde você receberá os emails de suporte.

---

### STEP 11 — Adicionar opção "Suporte" no dropdown

💻 **`src/components/dashboard/dashboard-menu.tsx`**

- Importar ícone `LifeBuoy` do lucide-react
- Importar `sendSupportEmail` de `@/actions/support`
- Adicionar estado para controlar o modal de suporte
- Adicionar botão "Suporte" no menu dropdown (abaixo de "Trocar Senha")
- Adicionar o `<Dialog>` do modal de suporte

**Campos do modal:**
- `<select>` com opções: "Reportar bug" e "Sugestão"
- `<textarea>` para a mensagem
- Botão "Enviar"
- Estados: enviando / enviado / erro

---

### STEP 12 — Escrever os testes

💻 **`src/actions/__tests__/support.test.ts`** (arquivo novo)

Cobrir:
- Retorna `{ success: true }` quando email é enviado
- Retorna `{ error }` quando usuário não está autenticado
- Retorna `{ error }` quando o Resend falha
- Subject contém `Bug Report` quando `type === 'bug'`
- Subject contém `Sugestão` quando `type === 'suggestion'`

💻 **`src/components/dashboard/__tests__/dashboard-menu.test.tsx`**

Adicionar ao bloco existente:
- Botão "Suporte" aparece no menu
- Abre modal com select e textarea
- Chama `sendSupportEmail` com os dados corretos ao submeter
- Mostra loading durante envio
- Mostra confirmação de sucesso
- Mostra erro se action falhar
- Fecha modal ao sucesso (após timeout)

---

### STEP 13 — Testar end-to-end em produção

🌐 **App em produção**

1. Logar como admin
2. Abrir o menu (3 pontinhos) → clicar em "Suporte"
3. Selecionar "Reportar bug", preencher a mensagem e enviar
4. Verificar se o email chegou na caixa de suporte com:
   - Assunto: `[Suporte] 🐛 Bug Report — Clube do Bolinha`
   - Nome e email do admin no corpo
   - `Reply-To` configurado para o email do admin (responder vai direto para ele)
5. Repetir para "Sugestão"

---

## Resumo dos steps

| # | Tipo | O que fazer |
|---|---|---|
| 1 | 🌐 | Criar conta no Resend |
| 2 | 🌐 | Adicionar e verificar domínio |
| 3 | 🌐 | Gerar API Key |
| 4 | 🌐 | Configurar SMTP no Supabase de produção |
| 5 | 🌐 | Personalizar templates de email |
| 6 | 🌐 | Adicionar `RESEND_API_KEY` na Vercel |
| 7 | 🌐 | Testar fluxo completo de emails |
| 8 | 💻 | `npm install resend` |
| 9 | 💻 | Criar `src/actions/support.ts` |
| 10 | 💻 | Adicionar `SUPPORT_EMAIL` no env |
| 11 | 💻 | Atualizar `dashboard-menu.tsx` com modal de Suporte |
| 12 | 💻 | Escrever testes |
| 13 | 🌐 | Testar end-to-end em produção |
