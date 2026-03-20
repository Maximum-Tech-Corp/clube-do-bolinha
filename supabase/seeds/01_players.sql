-- ============================================================
-- Seed: 25 jogadores aleatórios
-- Instrução: substitua o valor de @team_id pelo ID real da sua turma.
--            Para encontrar: SELECT id FROM teams LIMIT 1;
-- ============================================================

DO $$
DECLARE
  v_team_id UUID := (SELECT id FROM teams LIMIT 1); -- ajuste se tiver mais de uma turma
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
