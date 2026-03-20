-- Migration 002: Suspensão e banimento de jogadores
-- Rodar no SQL Editor do Supabase

ALTER TABLE players
  ADD COLUMN is_banned         BOOLEAN    NOT NULL DEFAULT FALSE,
  ADD COLUMN suspended_until   TIMESTAMPTZ,
  ADD COLUMN suspension_reason TEXT       CHECK (char_length(suspension_reason) <= 100);
