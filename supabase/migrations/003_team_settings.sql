-- Adiciona configurações da turma
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS match_duration_minutes INTEGER NOT NULL DEFAULT 10;
