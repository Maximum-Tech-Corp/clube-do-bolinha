@AGENTS.md

# Clube do Bolinha — Developer Guide

PWA for organizing amateur football (futsal/soccer) groups. Admins manage teams, draws, and tournaments. Players access via shared code and confirm attendance.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database + Auth | Supabase |
| Payments | Stripe |
| Email | Resend |
| Deploy | Vercel |
| UI | shadcn/ui + Tailwind CSS |

---

## Rules

**Tests:** Vitest + Testing Library. Run `npm test` in watch mode, `npm run test:run` for single run, `npm run test:coverage` for coverage report. Test files go in `__tests__/` folders alongside the code or in `src/test/`.

When a test breaks:
- Fix carefully, preserving the intent of the functionality and the business rules the test validates
- **Never modify files outside the test suite** (production code, actions, components, libs) without first consulting the user, explaining the reason, and waiting for explicit confirmation

**Code**
- Clean code, self-explanatory names
- No unnecessary comments — only comment complex algorithms or non-obvious business logic; comments must be in English
- Avoid N+1 queries and unnecessary re-renders

**Language**
- This file (CLAUDE.md) and all code comments must always be written and updated in English

**TypeScript**
- Always typed — no `any`
- Use Supabase types from `src/types/database.types.ts`
- When adding DB columns via migration, manually update the types file

**Next.js**
- Prefer Server Components and Server Actions
- Client Components only when needed (interactivity, local state)
- Never expose secret keys on the client
- Auth proxy lives in `src/proxy.ts` — do NOT use `middleware.ts`

**UI**
- shadcn/ui as component base
- Mobile-first design
- Full design system documented in `docs/padrao-layout.md` — consult it when building or standardizing screens

**Layout pattern** (apply automatically to all screens unless told otherwise):
- Yellow header: full-width `style={{ backgroundColor: '#fed015' }}`, `pt-12 pb-10 px-8`, `<AppLogo size="md" />` centered; optional subtitle uses `text-sm font-bold` with `style={{ color: '#002776' }}` — never white text on yellow
- Content area: `flex-1 w-full max-w-sm mx-auto px-6 pt-8`
- Footer nav card: `max-w-sm mx-auto p-4 mt-1`, `<Card className="bg-primary/5 ring-0">`, `ArrowLeft` icon inside `bg-muted` box, title + subtitle

**Admin inner pages header** (all `/dashboard/*` pages except `/dashboard` itself):
- Use `<AdminPageHeader title="..." backHref="..." />` from `@/components/dashboard/admin-page-header`
- Compact yellow bar: full-width `#fed015` background, `py-4 px-4`, content constrained to `max-w-2xl mx-auto`
- Title: left-aligned, `text-lg font-bold`, `style={{ color: '#002776' }}`
- `DashboardMenu` (⋮) always on the right — it fetches its own data internally
- `backHref` only on sub-pages (e.g. game detail, player detail, new game form); omit on primary nav pages (Jogos, Jogadores, Histórico, Rankings)
- Page JSX must be a React fragment `<>...</>` with `AdminPageHeader` first, then the content `div`
- Action buttons (e.g. "+ Novo jogo", "Adicionar jogador") go in the content area below the header, not in the header itself
- For pages whose title is dynamic (game date, player name), format and pass the value as the `title` prop from the page component

**List item cards** (player rows, game rows, any repeated item in a list):
- `className="rounded-lg shadow-md bg-gray-50 px-3 py-2"`
- No border — shadow replaces the visual separation
- List wrapper: `className="space-y-2"` for consistent gap between cards

**Forms:**
- No Card wrapper — loose form with `className="space-y-4"`
- Inputs: `className="h-auto py-2 border-gray-300"`
- Primary button: `className="w-full py-5"`
- Outline/secondary button: `variant="outline" className="w-full py-5 border-primary text-primary hover:bg-primary/5 hover:text-primary"`

**Color palette:**
- `#fed015` — yellow, header backgrounds only
- `#002776` — dark blue, text on yellow headers and small accent details
- `primary` (shadcn green) — buttons, outline borders, icons
- `bg-primary/5` / `bg-primary/10` — card backgrounds, hover states
- `bg-blue-50 border-blue-200 text-blue-800` — info/alert notice boxes (use "i" character as icon)
- `bg-background` / `bg-muted` — predominant page backgrounds
- `text-muted-foreground` — auxiliary/helper text
- `text-destructive` — validation and server errors

---

## Project Structure

```
src/
  app/
    (auth)/               # Login, signup, password reset pages
    api/webhooks/stripe/  # Stripe webhook handler
    checkout/sucesso/     # Post-payment success page
    pagamento-pendente/   # Subscription required gate page
    dashboard/            # Admin area (protected by proxy + subscription check)
      jogadores/          # Player management
      jogos/              # Game management + draw + teams + tournament
      historico/          # Finished games history
      rankings/           # Goals, assists, attendance rankings
      co-admin/           # Co-admin management (create/remove)
    jogador/              # Team code input (public)
    jogador/[code]/       # Player public area (access via team code)
      entrar/             # Phone identification
      lista/[gameId]      # Pre-draw confirmed players list
      times/[gameId]      # Post-draw teams view
      historico/[gameId]  # Finished game detail
      campeonato/[gameId] # Live tournament view
    page.tsx              # Root landing page
  actions/                # Server Actions
  components/
    dashboard/            # Admin-specific components
    player/               # Player-facing components
    ui/                   # shadcn/ui primitives
  lib/
    supabase/             # Supabase client helpers (server + client)
    admin-context.ts      # Role resolution (main admin vs co-admin), getEffectiveTeamId()
    access-code.ts        # Team code generation (XXXX-XXXXXX format)
    draw-algorithm.ts     # Team balancing algorithm
    tournament-utils.ts   # Tournament standings + match ordering
  types/
    database.types.ts     # Manually maintained Supabase types
  proxy.ts                # Auth proxy (replaces middleware.ts)
```

---

## Database

Migrations in `supabase/migrations/`. Applied manually via Supabase SQL Editor.

**Key tables:**
- `admins` — links Supabase auth user to team; holds `subscription_status`, `stripe_customer_id`, `stripe_subscription_id`
- `teams` — belongs to admin; has `access_code`, `match_duration_minutes`
- `players` — belongs to team; has `stamina`, `weight_kg`, `is_star`, `is_banned`, `suspended_until`
- `games` — belongs to team; statuses: `open` → `finished` / `cancelled`; flags: `draw_done`, `is_tournament`
- `game_teams` — teams created after draw
- `game_team_players` — players in each team with `goals` and `assists`
- `game_confirmations` — player confirmations; statuses: `confirmed`, `waitlist`, `declined`
- `tournament_matches` — phases: `group`, `semi`, `final`
- `player_stat_adjustments` — retroactive stats per year

**Supabase clients:**
- `createClient()` — uses anon key, respects RLS (for auth checks)
- `createServiceClient()` — uses service role key, bypasses RLS (for all data ops)

---

## Auth & Access Control

- Admin auth via Supabase Auth (email + password)
- Player access via team `access_code` in URL (`/jogador/[code]`) — no login required
- Player identity stored in cookie `player_{teamId}` = phone number
- Proxy (`src/proxy.ts`) protects `/dashboard/*` routes and redirects logged-in users away from `/login`
- Subscription gating: `admins.subscription_status` must be `active` or `trialing` to access dashboard — checked in `dashboard/layout.tsx`, not in proxy

---

## Co-Admin

- Each team can have one co-admin, created by the main admin at `/dashboard/co-admin`
- Co-admin is a regular Supabase auth user with `admins.co_admin_of = main_admin_id`
- `getAdminContext()` in `src/lib/admin-context.ts` resolves the effective admin ID:
  - Main admin → `effectiveAdminId = own ID`
  - Co-admin → `effectiveAdminId = co_admin_of` (the main admin's ID)
- `getEffectiveTeamId()` fetches the team owned by `effectiveAdminId` — both roles see the same data
- Co-admin cannot create another co-admin; main admin can remove the co-admin at any time
- Co-admin is granted `subscription_status = 'active'` on creation (inherits access via main admin's subscription)

---

## Stripe

- Webhook endpoint: `POST /api/webhooks/stripe`
- Handled events: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`
- `checkout.session.completed` → sets `subscription_status = active` + saves `stripe_customer_id` + `stripe_subscription_id`
- `invoice.payment_failed` / `customer.subscription.deleted` → sets `subscription_status = inactive`
- To grant free access to an internal account: set `subscription_status = 'active'` directly in Supabase SQL, or create a Stripe subscription with a 100% off permanent coupon

---

## Draw Algorithm (`src/lib/draw-algorithm.ts`)

Balances teams by `weight_kg` + `stamina` + `is_star` distribution. Supports 3–5 teams (minimum 15 confirmed players). One team may be incomplete. `getDrawInfo(n)` returns `{ canDraw, canBeTournament, message }`. Tournament requires 4 or 5 full teams.

---

## Tournament

Group phase matches auto-generated after draw (round-robin via `buildGroupMatchOrder`). Semi and final created manually by admin after group phase completes. `computeStandings()` calculates the group table.

---

## Attendance Chart

Rendered on `/dashboard` when the team has at least one finished game. Implemented as a pure Server Component (`src/components/dashboard/attendance-chart.tsx`) using inline SVG — no external chart library.

Data fetched in `dashboard/page.tsx`:
1. Last 8 `finished` games for the team, ordered chronologically (oldest → left)
2. `game_confirmations` with `status IN ('confirmed', 'waitlist')` for those game IDs — counted per `game_id` in JS

A dashed average line is drawn across the displayed window. The chart block is omitted entirely if no finished games exist.

---

## Attendance Calculation

`attendanceRate` = confirmations with status `confirmed` or `waitlist` in finished games ÷ finished games that occurred **after** the player's `created_at`. Applied in `listPlayers()` and rankings page.

---

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID
NEXT_PUBLIC_APP_URL
RESEND_API_KEY
SUPPORT_EMAIL
```

---

## Deployment

- Hosted on Vercel (Hobby plan)
- After any env var change in Vercel → Redeploy required
- Supabase Authentication → URL Configuration must include production URL in Redirect URLs
