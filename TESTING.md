# Testing Plan — Clube do Bolinha

> Execute each part in order. Each part builds on the previous one.

---

## Part 1 — Setup

**Goal:** Install Vitest + Testing Library, configure coverage, define what is excluded.

### Packages to install

```bash
npm install -D vitest @vitejs/plugin-react @vitest/coverage-v8 \
  @testing-library/react @testing-library/user-event @testing-library/jest-dom \
  happy-dom msw @types/node
```

### Files to create/edit

- `vitest.config.ts` — test runner config with coverage thresholds
- `src/test/setup.ts` — global setup (jest-dom matchers, mocks for Next.js, Supabase, Stripe)
- `src/test/mocks/supabase.ts` — reusable Supabase mock
- `src/test/mocks/next.ts` — mock for `next/navigation`, `next/cache`, `next/headers`

### Coverage exclusions (no value in testing these)

```
src/components/ui/**          # shadcn primitives — third-party
src/app/**                    # Server Components — data fetching only
src/lib/supabase/**           # infrastructure wrappers
src/types/**                  # type definitions only
src/proxy.ts                  # integration concern, not unit testable
src/components/football-field-bg.tsx   # pure SVG, no logic
src/components/service-worker-registration.tsx  # browser API only
src/app/globals.css
src/app/manifest.ts
src/app/icon*                 # image routes
src/app/offline/page.tsx      # static page
```

### What IS tested (coverage targets)

| Scope | Files |
|---|---|
| Pure logic | `src/lib/draw-algorithm.ts`, `src/lib/tournament-utils.ts`, `src/lib/access-code.ts`, `src/lib/utils.ts` |
| Player components | `src/components/player/**` |
| Auth components | `src/components/auth/**` |
| Dashboard components | `src/components/dashboard/**` |
| Server Actions | `src/actions/**` |
| Webhook | `src/app/api/webhooks/stripe/route.ts` |
| Share | `src/components/share-app-link.tsx` |

### Update CLAUDE.md

Remove the "No unit tests" rule — replace with "Use Vitest + Testing Library. Run `npm test` before pushing."

---

## Part 2 — Player Tests

**Goal:** Full coverage of all player-facing components and interactions.

### Test files to create

#### `src/lib/__tests__/draw-algorithm.test.ts`
- `getDrawInfo` — valid counts (15, 18, 20, 25), invalid counts (< 15, > 25), edge cases (leftover 3 and 4 for 18 and 19 players)
- `runDraw` — output has correct number of teams, each player appears exactly once, star players distributed evenly, teams balanced by score
- Snake draft ordering with different team counts

#### `src/lib/__tests__/tournament-utils.test.ts`
- `buildGroupMatchOrder` — 4 teams: 6 matches; 5 teams: 10 matches; each pair plays exactly once
- `computeStandings` — points calculation (win=3, draw=1, loss=0), sort order (pts → wins → goal diff → goals for), empty matches returns all zeros

#### `src/lib/__tests__/access-code.test.ts`
- Generated code matches expected format (`PREFIX-SUFFIX`)
- Uniqueness (multiple calls produce different suffixes)

#### `src/components/player/__tests__/game-card.test.tsx`
- Renders date, time, location correctly
- Shows "Agendado" badge for open games
- Shows "Cancelado" badge + reduced opacity for cancelled games
- Shows "Finalizado" badge for finished games
- Shows "Modo Campeonato" label when `is_tournament = true`
- Shows confirmed count
- Shows "Confirmar presença" button when player not confirmed
- Shows "✓ Confirmado" when `playerStatus = confirmed`
- Shows "Na fila de espera" when `playerStatus = waitlist`
- Shows "Ver lista" link when `isOpen && !draw_done`
- Shows "Ver times sorteados" link when `isOpen && draw_done && !is_tournament`
- Shows "Acompanhar Jogos" link when `isOpen && draw_done && is_tournament && tournamentStarted`
- Shows "Ver detalhes" link when `isFinished && detailsHref` provided
- Clicking "Confirmar presença" opens dialog

#### `src/components/player/__tests__/confirm-presence-dialog.test.tsx`
- Dialog closed by default
- Step 1: phone input renders, validates format, submits
- On unknown phone: shows registration form (name, weight, stamina)
- On known phone (cookie): skips to confirmation step
- Shows banned message when player is banned
- Shows suspended message with date when player is suspended
- Waitlist offer shown when game is full
- Success state shows "Presença confirmada!"
- Server errors displayed inline

#### `src/components/player/__tests__/player-bottom-nav.test.tsx`
- Renders 3 nav links with correct hrefs using team code
- Active link highlighted based on current path

#### `src/components/player/__tests__/player-data-section.test.tsx`
- Renders player name, weight, stamina label
- Star icon shown when `is_star = true`

#### `src/components/player/__tests__/install-banner.test.tsx`
- Not rendered on server (SSR-safe)
- Rendered when `beforeinstallprompt` event fires
- Dismiss button hides the banner
- Hidden after dismissal (localStorage flag)

---

## Part 3 — Admin Tests

> This part is split into 3 sub-parts due to volume.

### Part 3a — Auth + Pure Logic

#### `src/components/auth/__tests__/login-form.test.tsx`
- Renders email and password fields
- Shows validation errors on empty submit
- Shows "E-mail inválido" for bad email format
- Calls `login` action with correct data on valid submit
- Shows server error message returned by action
- "Entrar..." loading state during submission
- Link to `/cadastro` renders

#### `src/components/auth/__tests__/cadastro-form.test.tsx`
- Renders all fields (name, email, phone, team name, password, confirm password)
- Validates required fields
- Shows error when passwords don't match
- Calls register action on valid submit
- Shows server errors inline

#### `src/actions/__tests__/auth.test.ts`
- `login` — calls Supabase signInWithPassword, redirects on success, returns error on failure
- `logout` — calls Supabase signOut, redirects to `/`

### Part 3b — Player Management (Admin)

#### `src/components/dashboard/__tests__/new-player-form.test.tsx`
- Renders name, phone, weight, stamina fields
- Validates required fields and minimum values
- Calls `createPlayer` action on valid submit
- Shows server error on duplicate phone

#### `src/components/dashboard/__tests__/edit-player-form.test.tsx`
- Pre-fills all fields with existing player data
- `is_star` toggle works
- Calls `updatePlayer` on save
- Shows validation errors

#### `src/components/dashboard/__tests__/player-situation-form.test.tsx`
- Shows current status (active / suspended / banned)
- Ban button calls `banPlayer`, shows confirmation
- Unban button calls `unbanPlayer`
- Suspend form validates date is in the future
- Calls `suspendPlayer` with correct params
- Remove suspension calls `removeSuspension`

#### `src/components/dashboard/__tests__/retroactive-stat-form.test.tsx`
- Renders year, goals, assists fields
- Validates non-negative numbers
- Calls `addRetroactiveStat` on submit
- Shows success feedback

#### `src/components/dashboard/__tests__/players-list-client.test.tsx`
- Renders list of players with name and attendance rate
- Search/filter narrows the list
- Empty state when no players
- Attendance shown as percentage or "—" when null

### Part 3c — Game Management + Tournament

#### `src/components/dashboard/__tests__/new-game-form.test.tsx`
- Renders date/time and optional location fields
- Validates date is required
- Calls `createGame` action with correct UTC conversion
- Shows error feedback

#### `src/components/dashboard/__tests__/draw-modal.test.tsx`
- Shows confirmed player count
- Shows projected team breakdown
- Tournament mode checkbox toggleable only when `canBeTournament = true`
- Checkbox hidden/disabled when `canBeTournament = false`
- Calls `executeDraw` with `isTournament` flag on confirm
- Loading state during draw execution
- Error message shown on failure

#### `src/components/dashboard/__tests__/game-detail-client.test.tsx`
- Renders game date, location, status badge
- Shows confirmed players list with count
- Shows waitlist section when applicable
- "Realizar sorteio" button visible when draw not done
- "Ver times" and "Ver campeonato" buttons after draw
- Finalize game button shown when conditions met
- Admin can register unknown player inline

#### `src/components/dashboard/__tests__/teams-client.test.tsx`
- Renders all teams with player names
- Goals and assists displayed per player
- Edit stats button opens inline form
- Finalize game button shown when `tournamentCompleted || !isTournament`
- Disabled when tournament not completed

#### `src/components/dashboard/__tests__/tournament-client.test.tsx`
- Renders group standings table with correct columns
- Renders group phase matches
- Score input fields shown for incomplete matches
- Completed matches show locked scores
- Advance to semis button shown when group phase complete
- Semi and final sections appear progressively

#### `src/components/dashboard/__tests__/tournament-toggle.test.tsx`
- Renders toggle switch
- Calls `setTournamentMode` action on change
- Shows current mode state

#### `src/components/dashboard/__tests__/match-timer.test.tsx`
- Renders play button initially
- Play starts countdown from configured duration
- Pause stops countdown
- Reset restores to full duration
- Shows "Tempo encerrado!" and blinks red at zero
- Timer state persists in localStorage

#### `src/components/dashboard/__tests__/access-code-card.test.tsx`
- Renders access code in large mono font
- Click copies code to clipboard
- "Copiado!" flash appears after copy
- WhatsApp share link contains code and team name
- Edit prefix mode: input validates 4 chars, alphanumeric
- Save calls `updateAccessCodePrefix`
- Cancel restores original prefix

#### `src/components/dashboard/__tests__/dashboard-menu.test.tsx`
- 3-dot button opens dropdown
- Click outside closes dropdown
- "Compartilhar" link opens WhatsApp URL
- "Configurações" opens dialog
- Settings dialog: team name and duration inputs pre-filled
- Save calls `updateTeamSettings`
- "Salvo!" confirmation shown after save

#### `src/components/dashboard/__tests__/year-select.test.tsx`
- Renders select with available years
- Current year pre-selected
- Changing year updates URL search param

#### `src/actions/__tests__/players-admin.test.ts`
- `listPlayers` — returns enriched players with attendance rate
- `createPlayer` — inserts player, revalidates path, returns error on duplicate phone
- `updatePlayer` — updates fields, checks team ownership
- `banPlayer` / `unbanPlayer` — update `is_banned` field
- `suspendPlayer` — validates future date, updates suspension fields
- `removeSuspension` — clears suspension fields
- `getPlayerStats` — returns stat adjustments ordered by year
- `addRetroactiveStat` — inserts adjustment, checks ownership

#### `src/actions/__tests__/games-admin.test.ts`
- `createGame` — inserts game with correct team_id
- `cancelGame` — updates status to cancelled
- `finishGame` — updates status to finished, sets finished_at

#### `src/actions/__tests__/draw.test.ts`
- `executeDraw` — validates game is open and draw not done
- Inserts correct number of game_teams and game_team_players
- Creates group matches when `isTournament = true`
- Guard prevents duplicate group matches

#### `src/actions/__tests__/tournament.test.ts`
- `updateMatchScore` — updates home/away score, marks completed
- `advanceToSemis` — creates semi match rows from top standings
- `advanceToFinal` — creates final match row

#### `src/actions/__tests__/game-stats.test.ts`
- `updatePlayerStats` — updates goals and assists for a game_team_player
- Validates ownership

#### `src/app/api/webhooks/__tests__/stripe.test.ts`
- Returns 400 when signature missing
- Returns 400 on invalid signature
- `checkout.session.completed` → sets subscription_status active
- `invoice.payment_failed` → sets subscription_status inactive
- `customer.subscription.deleted` → sets subscription_status inactive
- Unknown events return 200 without side effects

---

## Part 4 — Coverage Analysis

**Goal:** Run coverage, identify uncovered lines, add targeted tests until everything testable is near 100%.

### Process

```bash
npm run test:coverage
```

1. Open `coverage/index.html` in browser
2. Go file by file through any file below 80%
3. For each uncovered line/branch, write a targeted test
4. Re-run until coverage is stable

### Expected hard-to-cover areas

| Area | Strategy |
|---|---|
| Error branches in Server Actions (Supabase errors) | Mock Supabase to return `{ error: {...} }` |
| `confirmPresence` edge cases (waitlist, full game) | Controlled mock data |
| `redistributeStars` in draw algorithm | Craft player sets that trigger redistribution |
| Timer localStorage edge cases | Mock `localStorage` and `Date.now()` |
| Clipboard API in access-code-card | Mock `navigator.clipboard` |
| `beforeinstallprompt` in install-banner | Dispatch synthetic event |

---

## Running Tests

```bash
npm test                 # watch mode
npm run test:run         # single run (CI)
npm run test:coverage    # coverage report
```

---

## Summary

| Part | Status |
|---|---|
| 1 — Setup | ✅ done |
| 2 — Player tests | ✅ done |
| 3a — Auth + pure logic | ✅ done |
| 3b — Player management (admin) | ✅ done |
| 3c — Game management + tournament | ✅ done |
| 4 — Coverage analysis | ✅ done |
