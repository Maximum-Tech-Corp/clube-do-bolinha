# PRD — Clube do Bolinha

> **Versão:** 1.0
> **Data:** 2026-03-19
> **Status:** Em definição

---

## 1. Visão Geral

**Clube do Bolinha** é um PWA (Progressive Web App) para organização de peladas semanais entre amigos. O produto resolve a dor do organizador: convocar jogadores, sortear times equilibrados e registrar o histórico de partidas — tudo sem precisar de planilhas ou mensagens no WhatsApp.

---

## 2. Objetivos do Produto

- Digitalizar a gestão completa de uma turma de futebol informal
- Reduzir o trabalho manual do organizador (admin)
- Criar engajamento dos jogadores com dados pessoais, rankings e histórico
- Monetizar via assinatura mensal do admin (modelo freemium futuro a avaliar)

---

## 3. Público-Alvo

| Perfil | Descrição |
|---|---|
| **Admin** | Organizador da turma. Paga a assinatura. Gerencia tudo. |
| **Jogador** | Membro da turma. Acesso gratuito via código. Interação mínima. |

---

## 4. Stack Tecnológica

| Camada | Tecnologia |
|---|---|
| Frontend / PWA | Next.js (App Router) |
| Auth + Banco de Dados | Supabase |
| Pagamento | Stripe |
| Deploy | Vercel |

---

## 5. Tipos de Usuário

### 5.1 Admin

- Realiza cadastro com: **nome, e-mail, celular, nome da turma e senha**
- Após cadastro, é direcionado ao pagamento (Stripe) para ativar a conta
- Acessa o sistema via login convencional (e-mail + senha)
- Gerencia uma turma (suporte a múltiplas turmas adiado para versão futura)

### 5.2 Jogador

- **Não realiza cadastro** e **não faz login**
- Acessa via **código da turma** na tela de entrada do app
- Se identificado pelo **número de telefone** (registro único por turma)
- Na primeira vez que confirma presença, preenche dados básicos
- Nas vezes seguintes, apenas informa o telefone

---

## 6. Código de Acesso da Turma

- Gerado automaticamente no cadastro do admin (alfanumérico, aleatório)
- **Único e imutável** no sistema (nunca se repete entre turmas)
- O admin pode **editar apenas alguns caracteres** definidos (a ser decidido na implementação: ex. prefixo customizável + sufixo aleatório fixo)
- Exibido no painel do admin com botão de **compartilhar via WhatsApp** (mensagem pré-formatada com o código)

---

## 7. Fluxo do Jogador

```
Tela inicial
  └─ "Acesso Jogador"
       └─ Informa o código da turma
            └─ Tela da turma carregada
                 ├─ Jogos nos próximos 7 dias (com status: aberto / cancelado)
                 │    └─ Contador de confirmações (ex: "12 confirmados") — sem revelar nomes
                 │         └─ Botão "Confirmar presença"
                 │              └─ Informa número de telefone
                 │                   ├─ [Jogador já registrado] → presença confirmada
                 │                   └─ [Novo jogador] → preenche:
                 │                        - Nome completo ou social
                 │                        - Peso médio (kg)
                 │                        - Resistência: 1 jogo / 2 jogos / 3 jogos / 4 ou mais
                 │                        → presença confirmada
                 └─ Área "Meus dados" (somente leitura)
                      - Nome, peso, resistência registrados
```

---

## 8. Funcionalidades do Admin

### 8.1 Gestão de Jogadores

- **Listagem** de todos os jogadores registrados na turma
- **Editar** dados de qualquer jogador: nome, peso, resistência
- **Marcar como estrela (cabeça):** flag que identifica jogadores de alto nível — usada no algoritmo de sorteio
- **Registrar novo jogador manualmente:** nome, telefone, peso, resistência

### 8.2 Gestão de Jogos

- **Criar jogo:** local, data e horário
- **Cancelar jogo:** status visível para o jogador ("Cancelado")
- **Cap de 25 confirmações** por jogo
  - Ao atingir o limite, novos jogadores entram na **lista de espera**
  - A lista de espera segue ordem de entrada (FIFO) — data/hora registrados internamente
  - Ao liberar uma vaga (admin remove confirmado), o primeiro da fila é promovido automaticamente

### 8.3 View Interna de um Jogo

- Lista de jogadores confirmados
- Contador de confirmados e número na fila de espera
- **Remover jogador** confirmado (em caso de falta ou ajuste)
- **Incluir jogador:** select entre os já registrados na turma
- **Registrar e incluir jogador novo** (mesmo fluxo de novo jogador descrito acima)

---

## 9. Sorteio de Times

> **Regra base:** Times de **5 jogadores na linha** (sem goleiros no sistema)

### 9.1 Pré-Sorteio

Ao clicar em "Rodar Sorteio", o admin vê:

- Total de jogadores confirmados
- Quantos times completos isso forma
- Quantidade de jogadores sobrando
- Checkbox: **"Será campeonato?"** *(habilitado apenas se 4 ou 5 times)*

**Validações antes de rodar:**

| Situação | Comportamento |
|---|---|
| Menos de 3 times possíveis | Bloqueia o sorteio com mensagem explicativa |
| Mais de 5 times possíveis | Bloqueia o sorteio — admin deve remover confirmações |
| Sobra < 3 jogadores | Permite rodar com aviso: "X jogadores de fora — poderão completar time no local" |
| Sobra 3 ou 4 jogadores | Aviso: "Um time incompleto será formado (X jogadores ao total)" |
| 5 times completos + sobra | Bloqueia — admin deve remover sobras antes de sortear |

### 9.2 Algoritmo de Sorteio

O algoritmo distribui os jogadores buscando o **máximo equilíbrio entre times**, considerando:

- **Peso médio** do jogador
- **Resistência** (quantos jogos aguenta): convertida em score numérico
- **Flag estrela (cabeça):** jogadores de alto nível tratados como coringa

**Regras para estrelas:**

- Nenhum time pode ter 2 estrelas se algum time tiver 0
- Nenhum time pode ter 3 estrelas se algum time tiver 1
- Distribuição sempre a mais uniforme possível

> A lógica exata do algoritmo (pesos, fórmula de score, estratégia de balanceamento) será detalhada e discutida durante a fase de desenvolvimento.

### 9.3 Pós-Sorteio — View dos Times

- Times listados por numeração (Time 1, Time 2…)
- Jogadores de cada time
- Por jogador: botões **+/−** para **gols** e **+/−** para **assistências**
- Botão **"Finalizar Jogo"** *(disponível somente após a tabela do campeonato ser finalizada, se aplicável)*

---

## 10. Modo Campeonato

Ativado quando a flag **"Será campeonato?"** for marcada antes do sorteio.

### 10.1 Formato com 4 Times

**Fase de grupos — todos contra todos**

| Resultado | Pontos |
|---|---|
| Vitória | 3 |
| Empate | 1 |
| Derrota | 0 |

O admin atualiza os placares de cada partida. Ao concluir todos os jogos → botão **"Próxima fase"**.

**Semifinais**

- 1º lugar × 4º lugar
- 2º lugar × 3º lugar
- Regra especial: se o 1º ou o 2º lugar **empatarem** em sua semifinal, **ambos avançam para a final**

**Final**

- Vencedor das semifinais se enfrentam
- Após placar → botão **"Finalizar Campeonato"**

---

### 10.2 Formato com 5 Times

**Fase de grupos — todos contra todos** *(mesmas regras de pontuação)*

Após todos os jogos → botão **"Próxima fase"**.

**Final**

- 1º lugar × 2º lugar diretamente

---

### 10.3 Critérios de Desempate (ambos os formatos)

Em caso de empate de pontos na classificação:

1. **Mais vitórias**
2. **Saldo de gols** (gols marcados − gols sofridos)

---

## 11. Lançamento Retroativo de Estatísticas

O admin poderá lançar **gols e assistências retroativas** diretamente no perfil de um jogador, para não perder estatísticas de jogos que aconteceram antes do uso do sistema.

- Acessível na tela de listagem/edição de cada jogador
- Campos: quantidade de gols e quantidade de assistências a adicionar
- Os valores são **somados** ao total acumulado do jogador nos rankings anuais
- Deve informar o **ano** ao qual as estatísticas pertencem *(para respeitar o corte anual dos rankings)*
- Após salvo, o lançamento fica visível como "Lançamento manual" no histórico do jogador (somente leitura)

---

## 12. Histórico e Rankings

### 11.1 Histórico de Jogos

- Admin acessa lista de todos os jogos realizados
- Pode visualizar todos os dados (times, gols, assistências, tabela do campeonato se houver)
- **Dados finalizados são somente leitura — sem edição permitida**

### 11.2 Rankings Anuais

Todos os rankings consideram o **ano corrente** (reiniciados a cada virada de ano).

| Ranking | Critério |
|---|---|
| **Artilheiros** | Total de gols marcados |
| **Assistências** | Total de assistências |
| **MVP** | Quem mais marcou gols por jogo *(em empate de gols: desempate por assistências)* |

### 11.3 Taxa de Presença

- Disponível na lista de jogadores do admin
- Exibe o percentual de jogos em que o jogador confirmou presença versus o total de jogos realizados na turma

---

## 12. Regras de Negócio Importantes

- Telefone é o **identificador único** de um jogador dentro de uma turma
- Código da turma é **único globalmente** no sistema
- Jogos finalizados **não podem ser editados** em nenhuma hipótese
- O sistema **não gerencia goleiros** — apenas jogadores de linha
- Times sempre com **5 jogadores na linha**
- Mínimo de **3 times** para realizar um sorteio
- Máximo de **5 times** por sorteio
- Cap de **25 confirmações** por jogo (5 times × 5 jogadores)

---

## 13. Fora do Escopo (MVP)

- Suporte a múltiplas turmas por admin
- App nativo (iOS / Android) — produto é PWA
- Chat ou notificações push
- Integração direta com WhatsApp (apenas link de compartilhamento)
- Exportação de dados
- Plano gratuito / freemium

---

## 14. Perguntas em Aberto

| # | Questão | Responsável |
|---|---|---|
| 1 | Valor da mensalidade do admin | Negócio |
| 2 | O que acontece com os dados se o admin cancelar a assinatura? (período de carência, exclusão?) | Negócio + Dev |
| 3 | Fórmula exata do algoritmo de sorteio (pesos por score de resistência e peso físico) | Dev |
| 4 | Quantos caracteres do código o admin pode editar e quais? | Dev |
| 5 | Regra de desempate de MVP se ainda houver empate após assistências | Negócio |
