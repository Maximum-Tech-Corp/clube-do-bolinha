-- ============================================================
-- Clube do Bolinha — Schema completo (migration única)
-- ============================================================

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- Enums
-- ============================================================

CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'trialing');
CREATE TYPE game_status AS ENUM ('open', 'cancelled', 'finished');
CREATE TYPE confirmation_status AS ENUM ('confirmed', 'waitlist', 'removed');
CREATE TYPE tournament_phase AS ENUM ('group', 'semi', 'final');
CREATE TYPE stamina_level AS ENUM ('1', '2', '3', '4plus');

-- ============================================================
-- Tabelas
-- ============================================================

-- Admins: vinculados a um usuário do Supabase Auth
CREATE TABLE admins (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  phone                   TEXT NOT NULL,
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  subscription_status     subscription_status NOT NULL DEFAULT 'inactive',
  co_admin_of             UUID REFERENCES admins(id) ON DELETE CASCADE,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Turmas: cada admin possui uma turma
CREATE TABLE teams (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id                UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  name                    TEXT NOT NULL,
  access_code             TEXT NOT NULL UNIQUE,
  access_code_prefix      TEXT NOT NULL,
  match_duration_minutes  INTEGER NOT NULL DEFAULT 10,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jogadores: identificados pelo telefone dentro de cada turma
CREATE TABLE players (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id             UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  phone               TEXT NOT NULL,
  weight_kg           DECIMAL(5,2) NOT NULL,
  stamina             stamina_level NOT NULL,
  is_star             BOOLEAN NOT NULL DEFAULT FALSE,
  is_banned           BOOLEAN NOT NULL DEFAULT FALSE,
  suspended_until     TIMESTAMPTZ,
  suspension_reason   TEXT CHECK (char_length(suspension_reason) <= 100),
  position            TEXT CHECK (position IN ('zagueiro', 'atacante', 'libero')),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(team_id, phone)
);

-- Ajustes retroativos de estatísticas por jogador
CREATE TABLE player_stat_adjustments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id   UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  goals       INTEGER NOT NULL DEFAULT 0 CHECK (goals >= 0),
  assists     INTEGER NOT NULL DEFAULT 0 CHECK (assists >= 0),
  year        INTEGER NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jogos marcados pelo admin
CREATE TABLE games (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id       UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  location      TEXT,
  scheduled_at  TIMESTAMPTZ NOT NULL,
  status        game_status NOT NULL DEFAULT 'open',
  is_tournament BOOLEAN NOT NULL DEFAULT FALSE,
  draw_done     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at   TIMESTAMPTZ
);

-- Confirmações de presença e lista de espera
CREATE TABLE game_confirmations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id           UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  player_id         UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  status            confirmation_status NOT NULL DEFAULT 'confirmed',
  waitlist_position INTEGER,
  confirmed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, player_id)
);

-- Times sorteados para um jogo
CREATE TABLE game_teams (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL,
  custom_name TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(game_id, team_number)
);

-- Jogadores por time com gols e assistências
CREATE TABLE game_team_players (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_team_id  UUID NOT NULL REFERENCES game_teams(id) ON DELETE CASCADE,
  player_id     UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  goals         INTEGER NOT NULL DEFAULT 0 CHECK (goals >= 0),
  assists       INTEGER NOT NULL DEFAULT 0 CHECK (assists >= 0),
  UNIQUE(game_team_id, player_id)
);

-- Partidas do campeonato
CREATE TABLE tournament_matches (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  phase         tournament_phase NOT NULL,
  home_team_id  UUID NOT NULL REFERENCES game_teams(id) ON DELETE CASCADE,
  away_team_id  UUID NOT NULL REFERENCES game_teams(id) ON DELETE CASCADE,
  home_score    INTEGER CHECK (home_score >= 0),
  away_score    INTEGER CHECK (away_score >= 0),
  match_order   INTEGER NOT NULL,
  completed     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
-- Estratégia: operações do admin usam o cliente autenticado (anon key + RLS).
-- Operações do jogador (sem auth) usam Server Actions com service_role no servidor.

ALTER TABLE admins                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE players                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stat_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE games                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_confirmations      ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_teams              ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_team_players       ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches      ENABLE ROW LEVEL SECURITY;

-- ---- admins ----
CREATE POLICY "admin: lê próprio registro"
  ON admins FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "admin: insere próprio registro"
  ON admins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin: atualiza próprio registro"
  ON admins FOR UPDATE
  USING (auth.uid() = user_id);

-- ---- teams ----
CREATE POLICY "admin: gerencia própria turma"
  ON teams FOR ALL
  USING (
    admin_id IN (SELECT id FROM admins WHERE user_id = auth.uid())
  );

-- ---- players ----
CREATE POLICY "admin: gerencia jogadores da turma"
  ON players FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN admins a ON a.id = t.admin_id
      WHERE a.user_id = auth.uid()
    )
  );

-- ---- player_stat_adjustments ----
CREATE POLICY "admin: gerencia ajustes de estatísticas"
  ON player_stat_adjustments FOR ALL
  USING (
    player_id IN (
      SELECT p.id FROM players p
      JOIN teams t ON t.id = p.team_id
      JOIN admins a ON a.id = t.admin_id
      WHERE a.user_id = auth.uid()
    )
  );

-- ---- games ----
CREATE POLICY "admin: gerencia jogos da turma"
  ON games FOR ALL
  USING (
    team_id IN (
      SELECT t.id FROM teams t
      JOIN admins a ON a.id = t.admin_id
      WHERE a.user_id = auth.uid()
    )
  );

-- ---- game_confirmations ----
CREATE POLICY "admin: gerencia confirmações"
  ON game_confirmations FOR ALL
  USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN teams t ON t.id = g.team_id
      JOIN admins a ON a.id = t.admin_id
      WHERE a.user_id = auth.uid()
    )
  );

-- ---- game_teams ----
CREATE POLICY "admin: gerencia times sorteados"
  ON game_teams FOR ALL
  USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN teams t ON t.id = g.team_id
      JOIN admins a ON a.id = t.admin_id
      WHERE a.user_id = auth.uid()
    )
  );

-- ---- game_team_players ----
CREATE POLICY "admin: gerencia jogadores dos times"
  ON game_team_players FOR ALL
  USING (
    game_team_id IN (
      SELECT gt.id FROM game_teams gt
      JOIN games g ON g.id = gt.game_id
      JOIN teams t ON t.id = g.team_id
      JOIN admins a ON a.id = t.admin_id
      WHERE a.user_id = auth.uid()
    )
  );

-- ---- tournament_matches ----
CREATE POLICY "admin: gerencia partidas do campeonato"
  ON tournament_matches FOR ALL
  USING (
    game_id IN (
      SELECT g.id FROM games g
      JOIN teams t ON t.id = g.team_id
      JOIN admins a ON a.id = t.admin_id
      WHERE a.user_id = auth.uid()
    )
  );
