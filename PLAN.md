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

### STEP 17 — Deploy

**Objetivo:** App em produção na Vercel.

**O que fazer:**
- Conectar repositório à Vercel
- Configurar variáveis de ambiente na Vercel (Supabase, Stripe)
- Configurar domínio customizado (se houver)
- Configurar webhook do Stripe apontando para a URL de produção
- Testar fluxo completo em produção com cartão de teste Stripe
- Habilitar HTTPS (automático na Vercel)

**Verificar antes de avançar:**
- Deploy bem-sucedido sem erros de build
- Fluxo de cadastro e pagamento funcionando em produção
- Webhook do Stripe recebendo eventos corretamente

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
| 17 | Deploy | Infra |
