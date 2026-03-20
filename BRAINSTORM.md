# Brainstorm — Ideias para o Futuro

Ideias identificadas durante o desenvolvimento que merecem planejamento antes de implementar.

---

## Tamanho variável de time

**Ideia:** Tornar variável a quantidade de jogadores por time, com uma tela de configurações para o admin.

**Detalhes:**
- Mínimo: 4 jogadores por time. Máximo: 10.
- Padrão: 5 (comportamento atual).
- Não permitir alterar se houver jogos em aberto (`status = 'open'`).

**Impactos a estudar:**
- As regras de validação do sorteio mudam (contagem de times e sobras dependem do `TEAM_SIZE`).
- O limite de confirmações (atualmente 25) deve ser recalculado: `max_teams × team_size`. Por exemplo, com time de 7, o teto seria 35 confirmados.
- A lógica de balanceamento do algoritmo de sorteio precisa ser parametrizada — atualmente o `TEAM_SIZE = 5` está hardcoded em `game-detail-client.tsx` e será hardcoded no algoritmo do Step 10.
- A view do jogador que exibe "X/25 confirmados" precisa usar o novo limite dinâmico.
- Pensar em onde armazenar essa configuração: coluna `team_size` na tabela `teams` ou tabela separada de configurações.

**Pré-requisitos antes de implementar:**
- Steps 10–13 concluídos (sorteio, gols, campeonato, rankings).
- Identificar todos os lugares com `25` ou `TEAM_SIZE = 5` hardcoded.
