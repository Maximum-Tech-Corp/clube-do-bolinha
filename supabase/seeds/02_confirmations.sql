-- ============================================================
-- Seed: confirmar presença de N jogadores aleatórios em um jogo
--
-- Variáveis a ajustar antes de rodar:
--   v_game_id      → ID do jogo (copie da tabela games)
--   v_quantidade   → quantos jogadores confirmar (ex: 20)
--
-- Regras:
--   - Seleciona jogadores aleatórios da turma dono do jogo
--   - Primeiros 25 = status 'confirmed'; excedentes = 'waitlist'
--   - Ignora jogadores que já confirmaram neste jogo
-- ============================================================

DO $$
DECLARE
  v_game_id    UUID    := 'COLE-AQUI-O-ID-DO-JOGO';  -- ← altere aqui
  v_quantidade INTEGER := 20;                          -- ← altere aqui

  v_team_id    UUID;
  v_confirmed  INTEGER;
  v_status     TEXT;
  v_waitlist   INTEGER := 0;
  rec          RECORD;
BEGIN

  -- Descobre a turma do jogo
  SELECT team_id INTO v_team_id FROM games WHERE id = v_game_id;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Jogo não encontrado: %', v_game_id;
  END IF;

  -- Conta confirmados atuais para calcular se vai pra lista de espera
  SELECT COUNT(*) INTO v_confirmed
  FROM game_confirmations
  WHERE game_id = v_game_id AND status = 'confirmed';

  -- Conta posição atual na waitlist
  SELECT COALESCE(MAX(waitlist_position), 0) INTO v_waitlist
  FROM game_confirmations
  WHERE game_id = v_game_id AND status = 'waitlist';

  -- Loop nos jogadores aleatórios da turma que ainda não confirmaram
  FOR rec IN
    SELECT p.id
    FROM players p
    WHERE p.team_id = v_team_id
      AND p.id NOT IN (
        SELECT player_id FROM game_confirmations WHERE game_id = v_game_id
      )
    ORDER BY random()
    LIMIT v_quantidade
  LOOP

    IF v_confirmed < 25 THEN
      v_status := 'confirmed';
      v_confirmed := v_confirmed + 1;

      INSERT INTO game_confirmations (game_id, player_id, status, waitlist_position)
      VALUES (v_game_id, rec.id, 'confirmed', NULL);

    ELSE
      v_waitlist := v_waitlist + 1;

      INSERT INTO game_confirmations (game_id, player_id, status, waitlist_position)
      VALUES (v_game_id, rec.id, 'waitlist', v_waitlist);

    END IF;

  END LOOP;

  RAISE NOTICE 'Concluído. Confirmados: %, Na fila: %', LEAST(v_confirmed, 25), v_waitlist;

END $$;
