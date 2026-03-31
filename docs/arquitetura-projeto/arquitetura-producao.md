# Arquitetura de Produção — Clube do Bolinha

> Documento vivo. Cada seção representa um momento no tempo. Mudanças de arquitetura geram uma nova seção — a anterior permanece como registro histórico.

---

## Março de 2026

### Visão geral

**Lançamento em produção: 29 de março de 2026.**

Estratégia: custo zero enquanto não há clientes pagantes, mitigando riscos do free tier com ferramentas alternativas.

| Camada | Serviço | Plano |
|---|---|---|
| Frontend + backend | Next.js 16 (App Router + Server Actions) | — |
| Hosting | Vercel | Hobby (gratuito) |
| Banco + Auth | Supabase | Free |
| Email transacional | Resend | Free |
| Keep-alive | cron-job.org | Free |
| Pagamentos | Stripe | — |

---

### Next.js 16 (App Router)

Não há separação de repositórios frontend/backend — um único deploy cobre tudo.

- **Server Components** — padrão em todas as páginas; HTML renderiza no servidor.
- **Client Components** — apenas onde há interatividade local (modais, formulários com estado). Marcados com `'use client'`.
- **Server Actions** (`src/actions/`) — toda mutação de dados roda no servidor; secrets nunca chegam ao browser.
- **`src/proxy.ts`** — guarda de autenticação; protege `/dashboard/*` e redireciona admins logados para fora do `/login`.
- Jogadores acessam sem login — identidade resolvida por cookie `player_{teamId}` no servidor.
- **Gráficos via SVG inline** — o gráfico de confirmações do dashboard (`AttendanceChart`) é um Server Component com SVG puro, sem biblioteca de charting, para não adicionar peso ao bundle do cliente.

---

### Supabase (Free)

Usamos: **PostgreSQL** (todos os dados), **Auth** (admins via email/senha), **SMTP via Resend** (não usamos o email built-in em produção).

Não usamos: Storage, Edge Functions, Realtime.

**Riscos do Free:**

- **Pausa por inatividade** — projeto congela após 7 dias sem acesso; primeira requisição leva 5–10s. Mitigado com cron-job.org.
- **Sem backup automático** — Free não tem backup diário. Uma exclusão acidental ou corrupção de dados é irrecuperável. Mitigação parcial: exportar dump manualmente de tempos em tempos.
- **Sem SLA** — sem garantia contratual de uptime.

**Quando migrar para o Pro ($25/mês):** no primeiro admin pagante real. O Pro remove a pausa por inatividade e inclui backup diário automático. Com 2 assinantes o Pro já está pago.

> ⚠️ **Ao migrar para o Pro:** ativar **Authentication → Sign In / Up → Prevent use of leaked passwords** — recurso indisponível no Free que bloqueia cadastros com senhas vazadas.

---

### Resend (Free)

Provedor SMTP externo. Configurado no Supabase (Authentication → SMTP Settings) para emails de auth, e via SDK (`RESEND_API_KEY`) para o modal de suporte do dashboard.

Cobre: confirmação de cadastro, reset de senha, emails de suporte.

**Riscos do Free:**

- **Limite de 3.000 emails/mês e 100/dia** — improvável estourar no volume atual, mas qualquer uso anômalo (spam, loop de erro) pode bloquear o envio do dia.
- **Ponto único de falha no fluxo de auth** — se o Resend cair ou suspender a conta, admins não conseguem confirmar cadastro nem resetar senha.

---

### cron-job.org (Free)

Dispara um ping HTTP para a URL do app a cada **5 dias**, impedindo que o Supabase atinja os 7 dias de inatividade e pause.

**Riscos do Free:**

- **Sem garantia de execução** — no free tier os jobs têm prioridade mais baixa e podem atrasar ou falhar silenciosamente.
- **Dependência de serviço externo** — se o cron-job.org sair do ar por alguns dias, o Supabase pode pausar.
- Mitigação: monitorar o histórico de execuções no painel do cron-job.org periodicamente.

---

### Vercel (Hobby — gratuito)

Hospeda o Next.js como funções serverless. Mantemos o Hobby enquanto não houver clientes pagantes.

O que o Hobby já oferece sem custo: preview deployments por PR, domínio customizado, analytics básico, logs em tempo real, builds ilimitados.

**Riscos do Hobby:**

- **Timeout de funções: 10 segundos** — operações atuais (queries simples, sorteio) ficam bem abaixo disso. Vira problema se adicionarmos operações em batch (ex: notificar 30+ jogadores). Nesse caso, delegar ao Supabase Edge Functions (timeout de 150s).
- **Sem SLA** — sem garantia contratual de uptime. Aceitável na fase atual.
- **1 membro de equipe** — se um segundo dev entrar no projeto, o upgrade para Pro ($20/mês) é obrigatório.

**Quando migrar para Vercel Pro ($20/mês):** ao redor de 5 assinantes, quando o risco de downtime sem SLA passa a ter peso real para o negócio — ou antes, se um segundo dev entrar.

---

### Stripe

O Stripe não tem plano free/paid — é **pay-per-use desde o primeiro centavo**. Não há upgrade a fazer; você paga uma taxa sobre cada cobrança processada. O módulo de assinaturas recorrentes (Stripe Billing) cobra uma taxa adicional em percentual sobre o MRR gerenciado — o valor exato está no dashboard do Stripe e muda periodicamente.

**Riscos:**

- **Taxa alta em volume baixo** — os percentuais pesam mais quando o MRR ainda é pequeno. É esperado na fase inicial, mas vale monitorar quanto do MRR vai para o Stripe conforme cresce.
- **Sem negociação de taxa** — taxas customizadas (menores) só são oferecidas pelo Stripe a volumes muito altos (~R$ 5M+/ano processado). Antes disso, você paga a tabela padrão sem alternativa.
- **Stripe Billing corrói margem em escala** — o percentual do Billing sobre assinaturas some discretamente do MRR. Em escala média isso pode justificar avaliar alternativas.

**Quando reavaliar o Stripe:** não há gatilho de "plano a pagar", mas quando o volume processado tornar as taxas um custo relevante no P&L, vale comparar com alternativas brasileiras (Pagar.me, Iugu, Asaas) que podem ter taxas menores para o mercado local.

---

### Diagrama da arquitetura atual

```
                    ┌─────────────────────────────────────┐
                    │           Vercel (Hobby)             │
                    │                                      │
 Admin / Player ───►│   Next.js 16 (App Router)           │
                    │   Server Actions                     │
                    │   src/proxy.ts (auth guard)          │
                    └───────┬──────────────┬───────────────┘
                            │              │
                   ┌────────▼───────┐  ┌───▼──────────────┐
                   │  Supabase      │  │  Stripe           │
                   │  Free tier     │  │                   │
                   │  - PostgreSQL  │  │  - Checkout       │
                   │  - Auth (JWT)  │  │  - Webhooks       │
                   │  - SMTP via    │  └───────────────────┘
                   │    Resend ─────┼──► Resend (Free)
                   └────────────────┘   3.000 emails/mês

 cron-job.org ────► Vercel URL (ping a cada 5 dias → Supabase não pausa)
```

---

### Gatilhos para revisitar essa arquitetura

| Evento | O que fazer |
|---|---|
| Primeiro admin pagante | Migrar para Supabase Pro — backup diário + sem pausa |
| 2+ admins pagantes | Supabase Pro está pago; manter |
| ~5 admins pagantes | Avaliar Vercel Pro — SLA e timeout maior |
| Segundo dev no time | Vercel Pro obrigatório (limite de 1 membro no Hobby) |
| Banco chegando em 400 MB | Supabase Pro antes de atingir o limite de 500 MB |
| Operações batch necessárias | Supabase Edge Functions (150s de timeout) |
