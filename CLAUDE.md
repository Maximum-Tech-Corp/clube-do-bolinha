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
| Deploy | Vercel |
| UI | shadcn/ui + Tailwind CSS |

---

## Rules

**Tests:** Vitest + Testing Library. Run `npm test` in watch mode, `npm run test:run` for single run, `npm run test:coverage` for coverage report. Test files go in `__tests__/` folders alongside the code or in `src/test/`.

**Code**
- Clean code, self-explanatory names
- No unnecessary comments — only comment complex algorithms or non-obvious business logic
- Avoid N+1 queries and unnecessary re-renders

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

---

## Project Structure

```
src/
  app/
    (auth)/               # Login + signup pages
    api/webhooks/stripe/  # Stripe webhook handler
    checkout/sucesso/     # Post-payment success page
    dashboard/            # Admin area (protected)
      jogadores/          # Player management
      jogos/              # Game management + draw + teams + tournament
      historico/          # Finished games history
      rankings/           # Goals, assists, attendance rankings
    jogador/[code]/       # Player public area (access via team code)
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
- Subscription gating: `admins.subscription_status` must be `active` to access dashboard (checked per-page, not in proxy)

---

## Stripe

- Webhook endpoint: `POST /api/webhooks/stripe`
- Handled events: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`
- `checkout.session.completed` → sets `subscription_status = active` + saves `stripe_customer_id` + `stripe_subscription_id`
- `invoice.payment_failed` / `customer.subscription.deleted` → sets `subscription_status = inactive`
- To grant free access to an internal account: set `subscription_status = 'active'` directly in Supabase SQL, or create a Stripe subscription with a 100% off permanent coupon

---

## Draw Algorithm (`src/lib/draw-algorithm.ts`)

Balances teams by `weight_kg` + `stamina` + `is_star` distribution. Supports 2–5 teams. One team may be incomplete (odd player count). `getDrawInfo(n)` returns `{ canDraw, canBeTournament, message }`.

---

## Tournament

Group phase matches auto-generated after draw (round-robin via `buildGroupMatchOrder`). Semi and final created manually by admin after group phase completes. `computeStandings()` calculates the group table.

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
```

---

## Deployment

- Hosted on Vercel (Hobby plan)
- Stripe in test mode during E2E validation; switch to live keys in Step 17b
- After any env var change in Vercel → Redeploy required
- Supabase Authentication → URL Configuration must include production URL in Redirect URLs
