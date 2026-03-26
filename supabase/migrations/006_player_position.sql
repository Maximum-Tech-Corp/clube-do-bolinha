ALTER TABLE players
  ADD COLUMN position text CHECK (position IN ('zagueiro', 'atacante', 'libero'));
