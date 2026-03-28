# Supabase — O que é e o que faz

O Supabase é um **Backend-as-a-Service (BaaS)** — não é só um banco de dados. Ele é construído em cima do PostgreSQL e empacota vários serviços que você normalmente precisaria construir ou contratar separadamente.

---

## Por que o usuário aparece em dois lugares?

Quando um admin se cadastra, dois registros são criados:

1. **`auth.users`** (gerenciado pelo Supabase Auth) — armazena credenciais, email, senha hasheada, tokens de sessão. Você não acessa isso diretamente, o Supabase Auth cuida.
2. **`public.admins`** (sua tabela) — armazena dados de negócio: qual time pertence, status da assinatura, ID do Stripe.

São responsabilidades separadas: **autenticação vs. dados da aplicação**. A tabela `admins` tem uma chave estrangeira apontando para `auth.users.id`.

---

## O que o Supabase entrega

| Serviço                | O que faz                               | Sem Supabase                              |
| ---------------------- | --------------------------------------- | ----------------------------------------- |
| **PostgreSQL**         | Banco relacional completo               | Precisaria de RDS, Neon, etc.             |
| **Auth**               | Login, sessão, JWT, OAuth, magic link   | Precisaria de Auth0, Clerk, etc.          |
| **Email transacional** | Confirmação de cadastro, reset de senha | Precisaria de SendGrid, Resend, etc.      |
| **Storage**            | Armazenamento de arquivos (fotos, docs) | Precisaria de S3, Cloudflare R2           |
| **Realtime**           | WebSockets nativos via Postgres CDC     | Precisaria de Pusher, Ably                |
| **Edge Functions**     | Funções serverless (Deno)               | Precisaria de Lambda, Cloudflare Workers  |
| **RLS**                | Regras de acesso no nível do banco      | Precisaria implementar manualmente na API |
| **API automática**     | REST + GraphQL gerados automaticamente  | Precisaria construir uma API              |

---

## O que usamos no Clube do Bolinha

- **Auth** — login de admin
- **PostgreSQL** — todos os dados
- **Email** — reset de senha e confirmação de cadastro

Não precisamos de uma API customizada porque o Next.js com Server Actions + `createServiceClient()` acessa o banco diretamente no servidor — o Supabase vira só banco + auth.

---

## Edge Functions (Deno) — exemplo real

### Caso de uso: notificar jogadores quando o sorteio for feito

Hoje os jogadores não sabem quando o sorteio acontece. Uma Edge Function poderia enviar WhatsApp ou email para todos os confirmados automaticamente.

**`supabase/functions/notificar-sorteio/index.ts`**

```typescript
import { createClient } from 'jsr:@supabase/supabase-js@2';

Deno.serve(async req => {
  const { gameId } = await req.json();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: confirmations } = await supabase
    .from('game_confirmations')
    .select('players(name, phone)')
    .eq('game_id', gameId)
    .eq('status', 'confirmed');

  for (const confirmation of confirmations ?? []) {
    await fetch('https://api.twilio.com/...', {
      method: 'POST',
      body: `To=whatsapp:+55${confirmation.players.phone}&Body=O sorteio foi feito! Acesse o app para ver seu time.`,
      headers: { Authorization: `Basic ${btoa('SID:TOKEN')}` },
    });
  }

  return new Response(JSON.stringify({ ok: true }));
});
```

**Na Server Action, após o sorteio:**

```typescript
await supabase.functions.invoke('notificar-sorteio', {
  body: { gameId },
});
```

### Por que Edge Function e não Server Action?

|            | Server Action (Next.js)  | Edge Function (Supabase)                    |
| ---------- | ------------------------ | ------------------------------------------- |
| Roda em    | Vercel (junto com o app) | Deno Deploy (infraestrutura do Supabase)    |
| Timeout    | ~10s (Hobby plan Vercel) | 150s                                        |
| Ideal para | Operações rápidas de UI  | Processamento pesado, webhooks, integrações |

Para notificar 30+ jogadores em loop, o timeout da Vercel Hobby seria um problema real. A Edge Function resolve isso.

### Outros casos que se aplicariam ao projeto

- Webhook do Stripe — já temos em `/api/webhooks/stripe`, mas se o processamento fosse mais pesado, migraria para Edge Function
- Gerar PDF do resultado do torneio para compartilhar
- Lembrete automático 2h antes do jogo (combinado com `pg_cron` do Supabase)

---

## API Automática + RLS — exemplo real

### API Automática — quando precisaríamos

Hoje o app usa Server Actions, então a API automática fica em segundo plano. Mas se criássemos um **app mobile nativo (React Native)** para os jogadores, ele precisaria chamar uma API diretamente. Com o Supabase, essa API já existe sem escrever nenhum backend:

```
GET https://seu-projeto.supabase.co/rest/v1/games?team_id=eq.123&status=eq.open
```

### RLS — o problema que ele resolve

Sem RLS, qualquer jogador que soubesse o endpoint poderia buscar dados de **qualquer time**:

```
GET /rest/v1/players?team_id=eq.999  ← time de outro admin
```

Com RLS, uma política no banco bloqueia isso automaticamente:

```sql
-- Jogador só vê players do time dele
CREATE POLICY "jogador vê só seu time"
ON players
FOR SELECT
USING (
  team_id = (
    SELECT id FROM teams WHERE access_code = current_setting('app.team_code')
  )
);
```

O banco rejeita qualquer query fora do escopo — mesmo que o cliente mande a requisição errada.

### Por que usamos `createServiceClient()` e não `createClient()`

| Cliente                 | Onde roda           | RLS ativo | Usado para                  |
| ----------------------- | ------------------- | --------- | --------------------------- |
| `createClient()`        | Servidor ou cliente | Sim       | Verificar sessão do admin   |
| `createServiceClient()` | Só servidor         | Não       | Todas as operações de dados |

O service role key **bypassa o RLS** — o que é seguro porque o código roda no servidor (Server Actions), nunca exposto ao cliente. Se um dia expuséssemos dados diretamente ao cliente (app mobile, JS no browser), precisaríamos ativar RLS em todas as tabelas.

## Limites do Supabase no plano gratuito (Free)

Relevantes para o Clube do Bolinha especificamente:

---

### ⚠️ Email built-in vs SMTP customizado — a diferença crítica

O aviso amarelo que aparece em Authentication → Email ("You're using the built-in email service") existe porque os dois modos têm limites completamente diferentes:

| | Email built-in (padrão) | SMTP customizado |
|---|---|---|
| **Rate limit total/hora** | ~4 emails (projeto inteiro) | 360 verificações/hora |
| **Novos cadastros/hora** | Muito limitado | 30/hora |
| **Remetente** | `noreply@mail.supabase.io` | Seu domínio / serviço |
| **Indicado para** | Testes locais apenas | Produção |

> O email built-in **não deve ser usado em produção**. É suficiente para desenvolvimento e E2E, mas não para usuários reais.

**Como resolver:** Authentication → SMTP Settings → configurar Resend ou Brevo (ambos têm plano gratuito generoso e são triviais de conectar).

---

### Auth

| Limite | Valor | Impacto |
|---|---|---|
| **MAU (usuários ativos/mês)** | 50.000 | Sem impacto — poucos admins |
| **Verificações/hora** (com SMTP) | 360 | Suficiente para escalar |
| **Refresh de tokens/hora** | 1.800 | Sem impacto |
| **Sessões simultâneas** | Ilimitadas | OK |

---

### Banco de dados

| Limite | Valor | Impacto |
|---|---|---|
| **Tamanho do banco** | 500 MB | Tranquilo para dados de pelada |
| **Conexões simultâneas** | 60 (via pooler) | OK para o volume atual |
| **Pausa por inatividade** | Após 7 dias sem acesso | ⚠️ Relevante (ver abaixo) |

> A pausa por inatividade é o limite mais traiçoeiro do plano free. Se nenhum usuário acessar o app por 7 dias, o banco "dorme" e a primeira requisição leva ~5-10s para acordar. Isso pode parecer um bug para um novo usuário.

---

### Storage

| Limite | Valor |
|---|---|
| **Espaço** | 1 GB |
| **Banda** | 2 GB/mês |

Não usamos Storage hoje — irrelevante.

---

### Edge Functions

| Limite | Valor |
|---|---|
| **Invocações/mês** | 500.000 |
| **Tempo de execução** | 150s |

Não usamos hoje — sem impacto.

---

### O que muda ao ir para o Pro ($25/mês)

- Pausa por inatividade: **removida completamente** — o mais importante para produção
- Banco: **8 GB**
- Suporte a **PITR** (Point-in-Time Recovery) quando banco > 4 GB
- SLA e suporte prioritário

> O Pro não remove os rate limits de Auth — esses já são resolvidos configurando SMTP customizado, independente do plano.

---

### Recomendações de prioridade

**Imediato (antes de ir para produção):**
- Configurar SMTP customizado — Authentication → SMTP Settings
- Usar **Resend** (gratuito até 3.000 emails/mês) ou **Brevo** (300/dia grátis)
- Habilitar MFA na conta do Supabase (Settings → Account)

**Quando tiver os primeiros clientes pagantes:**
- Migrar para o Pro — elimina a pausa por inatividade e garante que o banco nunca "duerma"
- ~1-2 admins pagantes já cobrem o custo do Pro ($25/mês)

**Monitoramento:**
- Supabase Dashboard → Reports mostra consumo em tempo real

---

### Quando vale migrar para o Pro?

O ponto de virada é quando o **primeiro cliente real se cadastrar**. A pausa por inatividade é inaceitável em produção com usuários pagantes — e o Pro elimina isso. Configurar SMTP antes disso resolve o problema imediato de emails sem custo adicional.
