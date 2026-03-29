# Plano de Vulnerabilidades — Antes da Produção

Auditoria realizada em 2026-03-28. Este documento lista as vulnerabilidades reais identificadas, descarta falsos positivos, e detalha o passo a passo de implementação de cada correção.

---

## Falsos positivos (não são problemas)

- **`.env.local` exposto** — está no `.gitignore` (`/.env*`). Nunca vai para o repositório.
- **Webhook Stripe confia no `admin_id` do metadata** — o evento passa por verificação de assinatura (`constructEvent`). Um atacante não consegue forjar um evento Stripe. O `admin_id` é gerado pelo próprio servidor na criação da sessão.
- **CSRF** — Next.js Server Actions têm proteção nativa contra CSRF.
- **SQL injection** — O cliente Supabase usa queries parametrizadas internamente.

---

## Vulnerabilidades reais

### [CRÍTICO] Flood de confirmações via bot — `confirmPresence`

**Arquivo:** `src/actions/player.ts:151`

**O ataque:** A action `confirmPresence` aceita novos jogadores inline. Um bot que conhece o `teamId` e o `gameId` (ambos visíveis na URL) pode fazer requisições em loop com telefones diferentes, criando jogadores fantasmas a cada chamada. O jogo tem limite de 25 confirmados — em 25 requests, o bot lota o jogo inteiro e nenhum jogador real consegue confirmar.

```
confirmPresence({
  gameId: "uuid-visível-na-url",
  teamId: "uuid-visível-na-url",
  phone: "11999990001",  // muda a cada request
  newPlayer: { name: "Fake", weight_kg: 70, stamina: "medium" }
})
```

**Por que o código atual não impede:**
- A guarda `alreadyConfirmed` só bloqueia o mesmo `player_id` — cada telefone diferente é um player novo
- Nenhum rate limiting por IP
- Nenhum CAPTCHA
- `gameId` e `teamId` são públicos na URL

**Decisão:** Implementar rate limiting por IP com Upstash Ratelimit.

**Passo a passo de implementação:**

1. Criar conta em [upstash.com](https://upstash.com) (plano free suporta 10.000 requests/dia)
2. Criar um banco Redis no Upstash (região mais próxima: `us-east-1` ou `sa-east-1`)
3. Copiar `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` do dashboard
4. Adicionar as variáveis no `.env.local` e no painel do Vercel
5. Instalar dependências:
   ```bash
   npm install @upstash/ratelimit @upstash/redis
   ```
6. Criar o helper de rate limiting em `src/lib/ratelimit.ts`:
   ```ts
   import { Ratelimit } from '@upstash/ratelimit';
   import { Redis } from '@upstash/redis';

   export const confirmPresenceRatelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(3, '1 h'),
     prefix: 'rl:confirm',
   });
   ```
7. No início da action `confirmPresence` (antes de qualquer acesso ao banco), adicionar:
   ```ts
   import { headers } from 'next/headers';
   import { confirmPresenceRatelimit } from '@/lib/ratelimit';

   const ip = (await headers()).get('x-forwarded-for') ?? 'unknown';
   const { success } = await confirmPresenceRatelimit.limit(ip);
   if (!success) return { error: 'Muitas tentativas. Aguarde antes de tentar novamente.' };
   ```
   - O limite de `3 por hora` permite que um mesmo IP registre até 3 jogadores diferentes em uma hora — caso real legítimo improvável, mas cobre dispositivos compartilhados.
   - Apenas chamadas com `newPlayer` precisariam do limite, mas é mais simples e seguro aplicar a todas as confirmações.

---

### [HIGH] Sem rate limiting nas rotas de autenticação

**Arquivos:** `src/actions/auth.ts` — functions `login`, `signup`, `requestPasswordReset`

**O risco:** Sem limite de tentativas, bots podem fazer força bruta de senha contra qualquer e-mail, ou fazer spam de e-mails de redefinição de senha. O Supabase tem rate limiting interno, mas é opaco e não deve ser a única barreira.

**Passo a passo de implementação:**

1. Seguir os passos 1–5 da vulnerabilidade anterior (Upstash já estará configurado)
2. Adicionar limiters específicos em `src/lib/ratelimit.ts`:
   ```ts
   export const loginRatelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(5, '15 m'),
     prefix: 'rl:login',
   });

   export const signupRatelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(3, '1 h'),
     prefix: 'rl:signup',
   });

   export const passwordResetRatelimit = new Ratelimit({
     redis: Redis.fromEnv(),
     limiter: Ratelimit.slidingWindow(3, '1 h'),
     prefix: 'rl:pwreset',
   });
   ```
3. Aplicar no início de cada action em `src/actions/auth.ts`:
   - `login`: `loginRatelimit.limit(ip)` — bloqueia após 5 tentativas em 15 minutos
   - `signup`: `signupRatelimit.limit(ip)` — bloqueia após 3 cadastros por hora
   - `requestPasswordReset`: `passwordResetRatelimit.limit(ip)` — bloqueia após 3 resets por hora
4. Em caso de bloqueio, retornar `{ error: 'Muitas tentativas. Tente novamente em alguns minutos.' }`

---

### [MEDIUM] Headers de segurança HTTP ausentes

**Arquivo:** `next.config.ts`

**O risco:** Sem os headers corretos, o browser não aplica proteções nativas contra clickjacking, MIME sniffing e downgrade de HTTPS.

**Passo a passo de implementação:**

1. Abrir `next.config.ts`
2. Adicionar um bloco `source: '/(.*)'` (aplica a todas as rotas) dentro do array retornado por `headers()`:
   ```ts
   {
     source: '/(.*)',
     headers: [
       { key: 'X-Frame-Options', value: 'DENY' },
       { key: 'X-Content-Type-Options', value: 'nosniff' },
       { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
       { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
       { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
     ],
   }
   ```
3. **CSP (Content-Security-Policy):** Deixar para uma segunda etapa. Mal configurado quebra a aplicação. Requer teste extensivo com Supabase, Stripe e assets externos.

---

### [MEDIUM] Página `checkout/sucesso` não valida o dono da sessão

**Arquivo:** `src/app/checkout/sucesso/page.tsx:29-41`

**O risco:** A página recebe qualquer `session_id` pela URL e ativa o plano do `admin_id` que está no metadata da sessão, sem verificar se o admin logado é o mesmo. Na prática o risco é baixo (session IDs do Stripe são unguessáveis), mas o fix é simples.

**Passo a passo de implementação:**

1. Após recuperar a sessão Stripe (`stripe.checkout.sessions.retrieve(session_id)`), buscar o admin logado via `getAdminContext()`
2. Comparar `session.metadata?.admin_id` com `ctx.adminId`
3. Se diferente, redirecionar para `/dashboard` sem atualizar nada:
   ```ts
   const ctx = await getAdminContext();
   if (!ctx || session.metadata?.admin_id !== ctx.adminId) {
     redirect('/dashboard');
   }
   ```

---

### [LOW] Senha mínima de 6 caracteres

**Arquivo:** `src/components/auth/cadastro-form.tsx`

**O risco:** 6 caracteres é abaixo do padrão para contas de admin com acesso a dados de jogadores e assinatura ativa.

**Passo a passo de implementação:**

1. Localizar o schema Zod no cadastro-form
2. Alterar `z.string().min(6, ...)` para:
   ```ts
   z.string()
     .min(8, 'Mínimo 8 caracteres')
     .regex(/[0-9]/, 'Deve conter ao menos um número')
   ```
3. Atualizar a mensagem de hint no formulário se houver

---

### [LOW — design consciente] `access_code` é o único controle de acesso do jogador

**Contexto:** `src/app/jogador/[code]/...`

Qualquer pessoa com o código pode ver a lista de jogadores, nomes, e resultados dos jogos. Se um código vazar, não há como revogar o acesso de uma pessoa específica — apenas trocar o código inteiro, afetando todos.

Isso é uma decisão de design consciente. O admin deve ser informado desse comportamento. Não requer implementação no lançamento.

---

## Resumo de prioridade

| # | Item | Esforço | Impacto | Status |
|---|---|---|---|---|
| 1 | Rate limiting em `confirmPresence` (bots lotando jogos) | Médio | **Crítico** | Pendente |
| 2 | Rate limiting em auth (login, signup, reset) | Médio | Alto | Pendente |
| 3 | Headers HTTP de segurança | Baixo | Médio-Alto | Pendente |
| 4 | Validação do dono da sessão no checkout | Baixo | Médio | Pendente |
| 5 | Senha mínima 6 → 8+ | Baixíssimo | Baixo-Médio | Pendente |
| 6 | Informar admin sobre risco do `access_code` | — | Informativo | Pendente |

---

## Ordem de execução recomendada

1. Configurar Upstash Redis (pré-requisito para itens 1 e 2)
2. Implementar rate limiting em `confirmPresence` (item 1 — maior risco operacional)
3. Implementar rate limiting em auth (item 2 — mesma infra, baixo custo adicional)
4. Adicionar headers HTTP no `next.config.ts` (item 3 — 5 minutos de trabalho)
5. Corrigir validação do checkout (item 4 — 3 linhas de código)
6. Ajustar senha mínima (item 5 — 1 linha de código)
