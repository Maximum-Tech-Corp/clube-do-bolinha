# Scripts de Seed para Testes

Scripts SQL para popular o banco com dados fictícios durante o desenvolvimento.
Execute no **SQL Editor** do painel do Supabase.

---

## 01 — Inserir 25 jogadores aleatórios

```sql
DO $$
DECLARE
  v_team_id UUID := (SELECT id FROM teams LIMIT 1);
BEGIN

INSERT INTO players (team_id, name, phone, weight_kg, stamina, is_star)
VALUES
  (v_team_id, 'Carlos Almeida',    '11987650001', 78,  '3',    false),
  (v_team_id, 'Bruno Ferreira',    '11987650002', 85,  '4plus', true),
  (v_team_id, 'Diego Martins',     '11987650003', 72,  '2',    false),
  (v_team_id, 'Felipe Souza',      '11987650004', 90,  '4plus', true),
  (v_team_id, 'Gabriel Lima',      '11987650005', 68,  '1',    false),
  (v_team_id, 'Henrique Costa',    '11987650006', 82,  '3',    false),
  (v_team_id, 'Igor Pereira',      '11987650007', 76,  '2',    false),
  (v_team_id, 'João Rodrigues',    '11987650008', 95,  '4plus', true),
  (v_team_id, 'Lucas Oliveira',    '11987650009', 70,  '3',    false),
  (v_team_id, 'Mateus Santos',     '11987650010', 88,  '4plus', false),
  (v_team_id, 'Nathan Araújo',     '11987650011', 65,  '1',    false),
  (v_team_id, 'Otávio Carvalho',   '11987650012', 80,  '2',    false),
  (v_team_id, 'Pedro Nascimento',  '11987650013', 74,  '3',    true),
  (v_team_id, 'Rafael Gonçalves',  '11987650014', 83,  '4plus', false),
  (v_team_id, 'Samuel Barbosa',    '11987650015', 69,  '2',    false),
  (v_team_id, 'Thiago Cardoso',    '11987650016', 91,  '4plus', true),
  (v_team_id, 'Vinícius Rocha',    '11987650017', 77,  '3',    false),
  (v_team_id, 'Wesley Teixeira',   '11987650018', 86,  '2',    false),
  (v_team_id, 'Alexandre Dias',    '11987650019', 73,  '1',    false),
  (v_team_id, 'Bernardo Moreira',  '11987650020', 79,  '3',    false),
  (v_team_id, 'Caio Ribeiro',      '11987650021', 84,  '4plus', true),
  (v_team_id, 'Danilo Pinto',      '11987650022', 67,  '1',    false),
  (v_team_id, 'Eduardo Farias',    '11987650023', 93,  '4plus', false),
  (v_team_id, 'Fábio Mendes',      '11987650024', 71,  '2',    false),
  (v_team_id, 'Gustavo Nunes',     '11987650025', 87,  '3',    true);

END $$;
```

> O `team_id` é buscado automaticamente. Se tiver mais de uma turma no banco, troque por `WHERE access_code = 'SEU-CODIGO'`.

---

## 02 — Confirmar presença de N jogadores aleatórios em um jogo

Edite as duas variáveis no topo antes de rodar:

| Variável | O que é |
|---|---|
| `v_game_id` | ID do jogo (`SELECT id FROM games ORDER BY created_at DESC LIMIT 5`) |
| `v_quantidade` | Quantos jogadores confirmar |

```sql
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

  SELECT team_id INTO v_team_id FROM games WHERE id = v_game_id;
  IF v_team_id IS NULL THEN
    RAISE EXCEPTION 'Jogo não encontrado: %', v_game_id;
  END IF;

  SELECT COUNT(*) INTO v_confirmed
  FROM game_confirmations
  WHERE game_id = v_game_id AND status = 'confirmed';

  SELECT COALESCE(MAX(waitlist_position), 0) INTO v_waitlist
  FROM game_confirmations
  WHERE game_id = v_game_id AND status = 'waitlist';

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
```

**Comportamento:**
- Seleciona jogadores aleatórios da turma dona do jogo
- Ignora quem já confirmou (seguro para rodar múltiplas vezes)
- Respeita o limite de 25: excedentes vão automaticamente para `waitlist` com posição correta
