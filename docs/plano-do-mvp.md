# PLAN — Clube do Bolinha

> Guia de implementação step-by-step para uso com Claude Code.
> A cada step concluído, pausar para revisão antes de avançar.

---

## Como usar este plano

1. Diga ao Claude Code: *"vamos trabalhar o step X"*
2. O Claude implementa apenas aquele step
3. Você revisa o código e aprova, corrige ou melhora
4. Só então avança para o próximo step

---

## Visão da Stack

```
Next.js (App Router) — PWA
  ├─ Server Actions       → lógica de negócio e acesso ao banco
  ├─ Route Handlers       → webhooks (Stripe) e endpoints públicos
  └─ Middleware           → proteção de rotas

shadcn/ui + Tailwind CSS
  └─ Componentes de UI prontos, mobile-first

Supabase
  ├─ Auth                 → autenticação do admin
  ├─ PostgreSQL           → banco de dados principal
  └─ RLS Policies         → segurança por linha

Stripe
  └─ Checkout + Webhooks  → assinatura mensal do admin

Vercel
  └─ Deploy + Edge Network
```

> **PWA:** O app é um Progressive Web App — instalável no celular via browser, sem App Store/Play Store.
> A configuração de PWA (manifest, service worker, ícones) é feita no **Step 14**.

---

## Steps de Implementação

---

### STEP 1 — Setup do Projeto Next.js

**Objetivo:** Projeto rodando localmente com a estrutura base.

**O que fazer:**
- Criar projeto com `create-next-app` (TypeScript, App Router, Tailwind, ESLint)
- Configurar aliases de path (`@/` apontando para `src/`)
- Estruturar pastas:
  ```
  src/
  ├─ app/              → rotas (pages e layouts)
  ├─ components/       → componentes reutilizáveis
  ├─ lib/              → utilitários, clientes (supabase, stripe)
  ├─ actions/          → Server Actions organizadas por domínio
  └─ types/            → tipos TypeScript globais
  ```
- Remover arquivos de boilerplate do Next.js (SVGs do public/, page.tsx padrão, etc.)
- Configurar `.env.local` com as variáveis necessárias (template sem valores)
- Instalar dependências base: `@supabase/supabase-js`, `@supabase/ssr`, `stripe`, `@stripe/stripe-js`
- Instalar e configurar **shadcn/ui** (`npx shadcn@latest init`)
- Alinhar variável de fonte com o tema do shadcn (`--font-sans`)

**Verificar antes de avançar:**
- `npm run dev` sobe sem erros
- Estrutura de pastas criada
- `.env.local.example` commitado (sem valores reais)

---

### STEP 2 — Modelagem do Banco de Dados (Supabase)

**Objetivo:** Schema completo do banco definido e aplicado.

**Tabelas:**

```sql
admins
  id, user_id (auth.users), name, email, phone,
  stripe_customer_id, stripe_subscription_id,
  subscription_status (active | inactive | trialing),
  created_at

teams
  id, admin_id, name, access_code (unique, imutable),
  access_code_prefix (editável pelo admin),
  created_at

players
  id, team_id, name, phone (unique por team_id), weight_kg,
  stamina (1 | 2 | 3 | 4plus), is_star (bool),
  extra_goals (retroativo), extra_assists (retroativo),
  extra_stats_year (ano dos lançamentos retroativos),
  created_at

games
  id, team_id, location, scheduled_at, status (open | cancelled | finished),
  is_tournament (bool), draw_done (bool), created_at, finished_at

game_confirmations
  id, game_id, player_id, confirmed_at, status (confirmed | waitlist | removed)
  waitlist_position (nullable)

game_teams
  id, game_id, team_number, created_at

game_team_players
  id, game_team_id, player_id, goals, assists

tournament_matches
  id, game_id, phase (group | semi | final),
  home_team_id, away_team_id,
  home_score, away_score, match_order, completed (bool)
```

**O que fazer:**
- Criar projeto no Supabase
- Escrever migrations SQL para cada tabela
- Configurar **RLS (Row Level Security):**
  - Admin só acessa dados da própria turma
  - Jogador lê dados públicos da turma via código (sem auth)
- Configurar cliente Supabase em `src/lib/supabase/` (server e client)
- Criar tipos TypeScript gerados a partir do schema (`database.types.ts`)

**Verificar antes de avançar:**
- Todas as tabelas criadas no Supabase
- RLS habilitado e testado manualmente
- Tipos TypeScript refletindo o schema

---

### STEP 3 — CLAUDE.md

**Objetivo:** Estabelecer as diretrizes de desenvolvimento para o Claude Code.

**O que fazer:**
- Criar `CLAUDE.md` na raiz do projeto com as seguintes diretrizes:

```markdown
# CLAUDE.md — Diretrizes de Desenvolvimento

## Testes
- Não criar testes unitários

## Código
- Seguir boas práticas de programação e clean code
- Priorizar performance (evitar re-renders desnecessários, queries N+1, etc.)
- Comentar apenas métodos/funções com lógica complexa (algoritmos, regras de negócio não óbvias)
- Código autoexplicativo: nomes claros dispensam comentários óbvios

## TypeScript
- Sempre tipado — sem `any`
- Usar types do Supabase gerados automaticamente

## Next.js
- Preferir Server Components e Server Actions
- Client Components apenas quando necessário (interatividade, estado local)
- Nunca expor chaves secretas no client
```

**Verificar antes de avançar:**
- Arquivo criado e conteúdo revisado pelo dev

---

### STEP 4 — Autenticação do Admin (Supabase Auth)

**Objetivo:** Admin consegue se cadastrar e fazer login.

**Rotas a criar:**
```
/cadastro       → formulário de registro do admin
/login          → formulário de login
/dashboard      → página protegida (redireciona se não autenticado)
```

**O que fazer:**
- Tela de cadastro com campos: nome, e-mail, celular, nome da turma, senha
- Server Action para criar usuário no Supabase Auth + inserir na tabela `admins` + criar registro em `teams`
- Tela de login (e-mail + senha)
- Middleware Next.js protegendo rotas `/dashboard/**` e `/admin/**`
- Redirecionamento pós-login para verificação de assinatura
- Logout funcional

**Verificar antes de avançar:**
- Cadastro cria usuário no Supabase Auth e tabelas corretas
- Login/logout funcionando
- Middleware bloqueando rotas protegidas corretamente

---

### STEP 5 — Integração Stripe (Assinatura do Admin)

**Objetivo:** Admin paga assinatura após cadastro para ativar conta.

**O que fazer:**
- Criar produto e preço no Stripe (assinatura mensal)
- Ao finalizar cadastro → redirecionar para Stripe Checkout
- Route Handler `/api/webhooks/stripe` para processar eventos:
  - `checkout.session.completed` → ativa conta (`subscription_status = active`)
  - `invoice.payment_failed` → marca como `inactive`
  - `customer.subscription.deleted` → marca como `inactive`
- Middleware verificar `subscription_status` — se inativo, redirecionar para página de pagamento pendente
- Tela `/pagamento-pendente` com botão para retomar o checkout

**Verificar antes de avançar:**
- Fluxo completo de cadastro → Stripe → webhook → conta ativa
- Conta bloqueada se assinatura inativa
- Testar com cartão de teste do Stripe

---

### STEP 6 — Código de Acesso da Turma

**Objetivo:** Geração, exibição e compartilhamento do código da turma.

**Lógica do código:**
- Gerado automaticamente no cadastro: prefixo alfanumérico aleatório (4 chars) + sufixo fixo aleatório (6 chars) = ex: `BOLA-X7K2P9`
- Unicidade garantida via constraint `UNIQUE` no banco + verificação antes de inserir
- Admin pode editar apenas o **prefixo** (antes do hífen)
- O sufixo é imutável e nunca muda
- Código completo nunca se repete no sistema

**O que fazer:**
- Função utilitária de geração de código com verificação de unicidade
- Tela no dashboard do admin mostrando o código da turma
- Formulário para editar o prefixo (com validação de unicidade em tempo real)
- Botão "Compartilhar via WhatsApp" — abre link `https://wa.me/?text=...` com mensagem pré-formatada contendo o código

**Verificar antes de avançar:**
- Código gerado automaticamente no cadastro
- Edição de prefixo funciona e mantém unicidade
- Link do WhatsApp abre corretamente no mobile

---

### STEP 7 — Fluxo do Jogador (Acesso via Código)

**Objetivo:** Jogador acessa a turma, vê jogos e confirma presença.

**Rotas a criar:**
```
/                   → tela inicial com botão "Acesso Jogador"
/jogador            → campo para informar o código da turma
/jogador/[code]     → tela da turma (jogos, meus dados)
```

**O que fazer:**
- Tela inicial com acesso admin (→ `/login`) e acesso jogador (→ `/jogador`)
- Tela `/jogador`: campo de texto para o código, botão entrar, validação se código existe
- Tela `/jogador/[code]`:
  - Lista de jogos nos **próximos 7 dias** com status (aberto / cancelado)
  - Por jogo: contador de confirmações ("X confirmados") sem revelar nomes
  - Botão "Confirmar presença" por jogo (desabilitado se cancelado)
  - Seção "Meus dados" (somente leitura) — aparece após o jogador se identificar

**Fluxo de confirmação de presença:**
1. Modal/tela solicita número de telefone
2. Verifica se telefone existe na turma:
   - **Existe:** confirma presença diretamente
   - **Novo:** exibe formulário (nome, peso, resistência) → salva jogador → confirma presença
3. Se jogo cheio (25 confirmados): oferecer entrar na lista de espera
4. Feedback visual de confirmação

**Verificar antes de avançar:**
- Código inválido exibe erro amigável
- Jogador existente confirma com apenas o telefone
- Novo jogador é registrado e confirmado
- Lista de espera funciona (registro com `waitlist_position`)
- Contador de confirmados atualiza corretamente

---

### STEP 8 — Gestão de Jogadores (Admin)

**Objetivo:** Admin gerencia todos os jogadores da turma.

**Rotas a criar:**
```
/dashboard/jogadores          → lista de todos os jogadores
/dashboard/jogadores/[id]     → edição do jogador
```

**O que fazer:**
- Lista de jogadores com: nome, telefone, peso, resistência, é estrela, taxa de presença (%)
- Formulário de edição: nome, peso, resistência, flag estrela
- Botão de cadastro manual de novo jogador (nome, telefone, peso, resistência)
- Campo para lançamento retroativo de gols/assistências com seleção de ano
- Validação: telefone único por turma

**Verificar antes de avançar:**
- Listagem carrega todos os jogadores
- Edição salva corretamente
- Cadastro manual valida telefone duplicado
- Lançamento retroativo salvo em `player_stat_adjustments` (múltiplos lançamentos por ano são válidos — o ranking os soma)
- Taxa de presença exibida aqui usa `game_confirmations` como placeholder; será corrigida no Step 13 para usar `game_team_players`

---

### STEP 9 — Gestão de Jogos (Admin)

**Objetivo:** Admin cria, visualiza e gerencia jogos.

**Rotas a criar:**
```
/dashboard/jogos                → lista de jogos (futuros e passados)
/dashboard/jogos/novo           → criar jogo
/dashboard/jogos/[id]           → visão interna do jogo
```

**O que fazer:**

**Criar jogo:**
- Campos: local, data, horário
- Validação: data deve ser futura

**Lista de jogos:**
- Separada em "Próximos" e "Histórico"
- Status visual: aberto / cancelado / finalizado

**Visão interna do jogo (pré-sorteio):**
- Lista de confirmados com botão remover (abre campo select para selecionar substituto ou deixar vaga)
- Lista de espera (ordem de entrada) com botão "promover para confirmado"
- Botão para adicionar jogador manualmente (select dos jogadores da turma)
- Botão "Cadastrar e adicionar novo jogador"
- Botão "Cancelar jogo" (com confirmação) → status = cancelled
- Botão "Rodar sorteio" → abre modal de pré-sorteio

**Lógica da lista de espera:**
- Ao remover confirmado → promover automaticamente o primeiro da fila
- Registro interno de `confirmed_at` para garantir ordem FIFO

**Verificar antes de avançar:**
- CRUD completo de jogos
- Cancelamento funciona e aparece para o jogador
- Lista de espera com promoção automática
- Remoção e adição manual de jogadores no jogo

---

### STEP 10 — Algoritmo de Sorteio

**Objetivo:** Sortear times equilibrados com base em peso, resistência e flag estrela.

**O que fazer:**

**Modal pré-sorteio** (ao clicar em "Rodar sorteio"):
- Exibe: total de confirmados, times que se formam, jogadores sobrando
- Checkbox "Será campeonato?" (só habilitado se 4 ou 5 times)
- Botão "Confirmar e Sortear"

**Validações antes de rodar:**

| Situação | Comportamento |
|---|---|
| < 3 times possíveis | Bloqueia com mensagem |
| > 5 times possíveis | Bloqueia — admin deve remover jogadores |
| Sobra 1 ou 2 | Bloqueia — insuficiente para time emergencial |
| Sobra 3 ou 4 | Aviso + permite rodar |
| 5 times completos + sobra | Bloqueia — admin deve remover sobras |

**Algoritmo de balanceamento:**
- Converter resistência em score: `1jogo=1, 2jogos=2, 3jogos=3, 4plus=4`
- Score total do jogador = `(peso_normalizado * 0.5) + (resistência * 0.5)`
- Distribuir jogadores por score decrescente usando snake draft (time1, time2, time3... time3, time2, time1...)
- Após distribuição base, aplicar regras de estrelas:
  - Redistribuir estrelas para equilibrar (máximo 1 estrela a mais que qualquer outro time)

**Salvar resultado:**
- Criar registros em `game_teams` e `game_team_players`
- Marcar `games.draw_done = true`

**Verificar antes de avançar:**
- Todas as validações funcionando com mensagens corretas
- Times gerados com distribuição visualmente equilibrada
- Regras de estrelas respeitadas
- Resultado salvo no banco

---

### STEP 11 — View Pós-Sorteio (Gols e Assistências)

**Objetivo:** Admin registra gols e assistências durante o jogo.

**Rota:**
```
/dashboard/jogos/[id]/times
```

**O que fazer:**
- Exibir times numerados (Time 1, Time 2…)
- Por jogador: botões `+` e `−` para gols, botões `+` e `−` para assistências (mínimo 0)
- Atualização em tempo real no banco (Server Action a cada clique)
- Botão "Finalizar Jogo":
  - Se `is_tournament = false`: finaliza diretamente
  - Se `is_tournament = true`: só habilita após campeonato finalizado
- Navegação para a view de campeonato (se ativo)

**Verificar antes de avançar:**
- Contadores funcionando corretamente
- Dados persistidos no banco a cada alteração
- Botão finalizar com lógica correta
- Jogo finalizado → dados somente leitura

---

### STEP 12 — Modo Campeonato

**Objetivo:** Gerenciar tabelas e fases do campeonato.

**Rota:**
```
/dashboard/jogos/[id]/campeonato
```

**O que fazer:**

**Geração das partidas:**
- Ao confirmar sorteio com `is_tournament = true`, gerar automaticamente as partidas da fase de grupos em `tournament_matches`
- Para 4 times: 6 partidas (todos contra todos)
- Para 5 times: 10 partidas (todos contra todos)

**View de grupos:**
- Tabela de partidas com placar editável
- Classificação em tempo real (pontos, vitórias, saldo de gols)
- Critério de desempate: 1º mais vitórias, 2º saldo de gols
- Botão "Ir para fase final" (habilitado quando todas as partidas têm placar)

**View semifinal (apenas 4 times):**
- 1º × 4º e 2º × 3º
- Regra: se 1º ou 2º empataram → ambos avançam para a final
- Placar editável
- Botão "Ir para a Final"

**View final:**
- Exibe as duas equipes finalistas
- Placar editável
- Botão "Finalizar Campeonato"

**Navegação:**
- Admin pode navegar livremente entre `/times` e `/campeonato` enquanto jogo não finalizado

**Verificar antes de avançar:**
- Partidas geradas corretamente para 4 e 5 times
- Classificação calculada com critérios de desempate
- Regra especial de semifinal (empate promove o favorito)
- Campeonato finalizado libera botão finalizar jogo em `/times`

---

### STEP 13 — Histórico e Rankings

**Objetivo:** Admin visualiza histórico de jogos e rankings da turma.

**Rotas a criar:**
```
/dashboard/historico              → lista de jogos finalizados
/dashboard/historico/[id]         → detalhe do jogo (somente leitura)
/dashboard/rankings               → rankings anuais
```

**O que fazer:**

**Histórico:**
- Lista de jogos finalizados com data, local, times e resultado
- Detalhe do jogo: times, gols/assistências por jogador, tabela do campeonato (se houve)
- Nenhum campo editável

**Rankings (ano corrente por padrão, com seletor de ano):**
- **Artilheiros:** gols de `game_team_players` (jogos do ano) + gols de `player_stat_adjustments` do mesmo ano
- **Assistências:** idem, somando assists das duas fontes
- **MVP:** ordenado por gols totais (desempate: assistências), mesma lógica de soma
- **Taxa de presença:** % de jogos finalizados em que o jogador aparece em `game_team_players` (não apenas confirmação — presença real = entrou no sorteio)

> **Regra de presença:** confirmação ≠ presença. Presença é contabilizada apenas quando o jogador aparece em `game_team_players` de um jogo finalizado. O admin remove ausentes antes do sorteio; quem permanece e entra no sorteio é considerado presente.

> **Stats retroativas:** `player_stat_adjustments` acumula múltiplos lançamentos por ano para o mesmo jogador. O ranking soma todos os lançamentos daquele ano + stats reais dos jogos do ano.

**Verificar antes de avançar:**
- Histórico lista apenas jogos finalizados
- Detalhe não permite edição
- Rankings calculados corretamente incluindo lançamentos retroativos
- Seletor de ano funcionando

---

### STEP 14 — Suspensão e Banimento de Jogadores

**Objetivo:** Admin pode suspender ou banir jogadores. Jogador banido/suspenso não consegue confirmar presença.

**Banco de dados — rodar migration:**
```sql
ALTER TABLE players ADD COLUMN is_banned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE players ADD COLUMN suspended_until TIMESTAMPTZ;
ALTER TABLE players ADD COLUMN suspension_reason TEXT CHECK (char_length(suspension_reason) <= 100);
```

**Admin — em `/dashboard/jogadores/[id]`:**
- Seção "Situação do jogador" com:
  - Botão "Banir jogador" / "Remover banimento" (toggle, sem motivo obrigatório)
  - Form de suspensão: data de encerramento + motivo (até 100 chars)
  - Exibe suspensão ativa (data e motivo)
- Nunca deletar — apenas banir/suspender

**Jogador — impacto no fluxo:**
- Ao confirmar presença (`confirmPresence`): verifica `is_banned` e `suspended_until`
  - Se banido: retorna `{ banned: true }` → dialog mostra mensagem de banimento
  - Se suspenso e `suspended_until > now`: retorna `{ suspended: true; until: string; reason: string }` → dialog mostra data e motivo
- Na página `/jogador/[code]` (cookie presente): se jogador identificado pelo cookie estiver banido, exibe mensagem de banimento no lugar da lista de jogos

**Verificar antes de avançar:**
- Migration aplicada no Supabase
- Admin bane → jogador não consegue confirmar presença
- Admin suspende → dialog mostra data de encerramento e motivo
- Após `suspended_until` passar → jogador pode confirmar normalmente
- Unban funciona imediatamente

---

### STEP 15 — UI/UX e Polish ✅

**Objetivo:** Interface mobile-first, fluida e com feedback adequado.

**O que fazer:**
- Garantir design responsivo em toda a aplicação (mobile-first)
- Loading states em todas as Server Actions (Suspense, skeleton, spinners)
- Mensagens de erro amigáveis (sem erros técnicos expostos)
- Toasts de confirmação para ações importantes (presença confirmada, jogo criado, etc.)
- Componente de navegação do admin (sidebar mobile-friendly)
- Tela de "Acesso bloqueado" se assinatura inativa
- Empty states nas listagens vazias
- Confirmação antes de ações destrutivas (cancelar jogo, remover jogador)

**Verificar antes de avançar:**
- Testar fluxo completo no mobile (viewport 390px)
- Sem erros de console
- Todas as ações têm feedback visual
- Build de produção sem erros (`npm run build`)

---

### STEP 16 — PWA (Progressive Web App) ✅

**Objetivo:** App instalável no celular com comportamento nativo.

**O que fazer:**
- Criar `app/manifest.ts` com nome, ícones, cores, `display: standalone`, `start_url`
- Gerar ícones dinamicamente via `app/icon.tsx` (ImageResponse) em 192×192 e 512×512
- Adicionar meta tags no `layout.tsx` root (themeColor, viewport, apple-mobile-web-app-*)
- Configurar Service Worker básico em `public/sw.js` (cache offline, página de fallback)
- Adicionar headers para `sw.js` no `next.config.ts`

**Verificar antes de avançar:**
- Lighthouse PWA score aceitável
- App instalável no Android (banner de instalação aparece)
- Funciona offline com página de fallback amigável

---

### STEP 17a — Deploy para Produção (sem pagamento ativo)

**Objetivo:** App funcionando em produção na Vercel, acessível por usuários reais. Stripe em modo de teste — a área restrita do admin funciona, mas cobranças reais não são processadas ainda.

> ⚠️ **O banco de dados será zerado antes do deploy.** Todo o conteúdo criado durante o desenvolvimento (admins, turmas, jogadores, jogos) deve ser apagado para o início limpo em produção.

**Como zerar o banco (Supabase):**

A forma mais segura e completa é via SQL Editor no painel do Supabase (`supabase.com → projeto → SQL Editor`). Execute o script abaixo na ordem correta (respeitando as foreign keys):

```sql
-- Limpa dados em ordem inversa das dependências
TRUNCATE TABLE tournament_matches     CASCADE;
TRUNCATE TABLE game_team_players      CASCADE;
TRUNCATE TABLE game_teams             CASCADE;
TRUNCATE TABLE game_confirmations     CASCADE;
TRUNCATE TABLE player_stat_adjustments CASCADE;
TRUNCATE TABLE games                  CASCADE;
TRUNCATE TABLE players                CASCADE;
TRUNCATE TABLE teams                  CASCADE;
TRUNCATE TABLE admins                 CASCADE;

-- Remove usuários do Supabase Auth (requer service_role)
-- Execute via API ou diretamente no Dashboard → Authentication → Users → apagar manualmente
```

> **Atenção:** Usuários do Supabase Auth (`auth.users`) **não são apagados pelo TRUNCATE** das tabelas da aplicação. Apague-os manualmente em: Supabase Dashboard → Authentication → Users → selecionar todos → Delete.
>
> Alternativa mais radical (não recomendada em produção): resetar o banco inteiro pelo CLI com `supabase db reset` — isso re-aplica todas as migrations do zero, mas exige acesso ao projeto via Supabase CLI vinculado ao projeto de produção.

**O que fazer:**
- Zerar o banco conforme descrito acima
- Criar repositório Git (GitHub) e fazer push do código
- Criar projeto na Vercel conectado ao repositório
- Configurar todas as variáveis de ambiente na Vercel (Supabase, Stripe test keys, `NEXT_PUBLIC_APP_URL`)
- Configurar domínio customizado (se houver) — Vercel oferece subdomínio `.vercel.app` gratuito
- Configurar webhook do Stripe (modo teste) apontando para a URL de produção
- Verificar que o build passa sem erros (`npm run build` localmente antes de subir)
- Testar fluxo completo em produção: cadastro admin → Stripe test checkout → área restrita → jogadores

**Verificar antes de avançar:**
- Banco zerado (sem dados de desenvolvimento)
- Deploy bem-sucedido, sem erros de build na Vercel
- HTTPS ativo (automático na Vercel)
- Admin consegue se cadastrar e acessar o painel
- Jogador consegue acessar via código, confirmar presença
- PWA instalável no celular via URL de produção
- Webhook Stripe recebendo eventos de teste corretamente

---

### STEP 17b — Virada de Chave: Stripe em Produção

> ⚠️ **Esta etapa só deve ser executada após o ciclo completo de validação descrito abaixo.**

**Objetivo:** Ativar cobranças reais. Usuários passam a pagar de verdade ao se cadastrar.

**O que fazer:**
- Trocar chaves Stripe de teste (`sk_test_*`, `pk_test_*`) pelas chaves de produção (`sk_live_*`, `pk_live_*`) nas variáveis da Vercel
- Criar produto e preço no Stripe em modo live (mesma configuração do teste)
- Atualizar `STRIPE_PRICE_ID` nas variáveis de ambiente
- Criar novo webhook no Stripe Dashboard (modo live) apontando para `https://sua-url.vercel.app/api/webhooks/stripe`
- Eventos: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
- Copiar o Signing Secret do webhook live e atualizar `STRIPE_WEBHOOK_SECRET` na Vercel
- Fazer Redeploy na Vercel para as variáveis entrarem em vigor
- Fazer um pagamento real de teste para confirmar o fluxo end-to-end

**Verificar o webhook em produção (passo crítico):**

> O webhook pode silenciosamente falhar em produção mesmo que localmente pareça ok. Siga estes passos para confirmar que está funcionando de verdade:

1. **Stripe Dashboard → Developers → Webhooks → selecione o endpoint live**
   - Aba **"Recent deliveries"**: deve mostrar eventos com status `200 OK` após o pagamento de teste
   - Se aparecer `401`, `400` ou `500`: o `STRIPE_WEBHOOK_SECRET` está errado ou o Redeploy não foi feito

2. **Verificar se o `subscription_status` foi atualizado no Supabase**
   - Supabase Dashboard → Table Editor → tabela `admins`
   - Após o pagamento, o campo `subscription_status` do admin deve ser `active`
   - Se continuar `null` ou `incomplete`: o webhook chegou mas o handler falhou — checar logs da Vercel

3. **Logs da Vercel**
   - Vercel Dashboard → seu projeto → **Logs** (aba Functions)
   - Filtrar por `/api/webhooks/stripe`
   - Qualquer erro aparece aqui com stack trace completo

4. **Reenviar evento manualmente (se necessário)**
   - Stripe Dashboard → Webhooks → endpoint → Recent deliveries → selecionar evento → **Resend**
   - Útil para testar sem fazer um novo pagamento

**Verificar antes de concluir:**
- Pagamento real processado com sucesso
- Aba "Recent deliveries" do webhook mostrando `200 OK`
- Tabela `admins` no Supabase com `subscription_status = active`
- Admin com assinatura ativa consegue acessar o painel normalmente
- Logs da Vercel sem erros no endpoint `/api/webhooks/stripe`

---

**Usuário fixo sem mensalidade (admin interno / conta própria):**

Para que o organizador do próprio sistema (você) possa usar o app sem pagar mensalidade, a abordagem mais simples é **direto no Stripe**, sem mudança de código:

1. **No Stripe Dashboard (modo live):**
   - Crie a assinatura manualmente para o seu customer: Customers → selecionar o seu → Create subscription
   - Aplique um **cupom de 100% de desconto permanente** (`forever`): Coupons → New → 100% off → Duration: Forever
   - Vincule o cupom à assinatura — o Stripe processa normalmente (subscription `active`), mas nunca cobra

2. **Alternativa via Stripe CLI / API:**
   ```bash
   stripe coupons create --percent-off=100 --duration=forever --name="Conta Interna"
   stripe subscriptions create \
     --customer=cus_XXXXX \
     --items[0][price]=price_XXXXX \
     --coupon=COUPON_ID
   ```

3. **Por que não mudar o código:**
   - O webhook já trata `subscription_status = active` → nenhuma lógica nova necessária
   - Manter a lógica de acesso uniforme evita bifurcações e bugs futuros
   - O Stripe registra tudo normalmente (histórico, renewals) — só não cobra

> Se o Stripe for descartado no futuro, basta atualizar `subscription_status = 'active'` diretamente na tabela `admins` via SQL no Supabase — independente de assinatura.

---

## Ciclo de Validação Pré-Virada (entre 17a e 17b)

> Antes de ativar o Stripe em produção, o produto passa por um ciclo de maturação com usuários reais.

### Testes E2E com Usuários Reais
- Sessões guiadas com o admin e jogadores reais (grupo de WhatsApp da pelada)
- Cobrir todos os fluxos: cadastro, confirmação de presença, sorteio, campeonato, histórico
- Coletar feedback qualitativo: o que trava, o que confunde, o que falta

### Melhorias de Engenharia
- Revisão de queries N+1 identificadas em produção
- Auditoria de RLS no Supabase (garantir que nenhum dado vaza entre turmas)
- Revisão de tipos TypeScript — eliminar qualquer `as` desnecessário
- Avaliar memoização em componentes com renders excessivos

### Monitoramento de Erros
- Integrar **Sentry** (ou similar) para capturar exceções em runtime
- Configurar alertas para erros críticos (ex: falha em Server Actions)
- Criar dashboard de erros por rota

### Monitoramento de Consumo e Precificação
- Acompanhar uso do Supabase: banco de dados (rows, storage), Auth (MAU), Edge Functions
- Acompanhar uso da Vercel: execuções de funções, largura de banda, duração
- Com base no consumo real por turma ativa, calcular custo de infraestrutura por admin/mês
- Definir o valor da mensalidade com margem saudável (custo infra + margem + impostos)
- Avaliar modelo freemium: ex. turma pequena gratuita (até X jogadores) vs. plano pago

### Melhorias de Produto (pós-feedback)
- Ajustes de layout e UX baseados em feedback dos usuários de teste
- Novas funcionalidades priorizadas pelo organizador (admin)
- Possível adição de notificações de jogo via WhatsApp (link automático)
- Avaliar suporte a múltiplas turmas por admin

---

## Resumo dos Steps

| # | Step | Domínio |
|---|---|---|
| 1 | Setup do Projeto Next.js | Infra |
| 2 | Modelagem do Banco (Supabase) | Banco |
| 3 | CLAUDE.md | Docs |
| 4 | Autenticação do Admin | Auth |
| 5 | Integração Stripe | Pagamento |
| 6 | Código de Acesso da Turma | Core |
| 7 | Fluxo do Jogador | Core |
| 8 | Gestão de Jogadores (Admin) | Core |
| 9 | Gestão de Jogos (Admin) | Core |
| 10 | Algoritmo de Sorteio | Core |
| 11 | Gols e Assistências (Pós-sorteio) | Core |
| 12 | Modo Campeonato | Core |
| 13 | Histórico e Rankings | Core |
| 14 | Suspensão e Banimento | Core |
| 15 | UI/UX e Polish | Frontend |
| 16 | PWA | Frontend |
| 17a | Deploy para Produção (Stripe teste) | Infra |
| — | Ciclo de Validação Pré-Virada | Produto |
| 17b | Virada de Chave Stripe (produção) | Infra |
