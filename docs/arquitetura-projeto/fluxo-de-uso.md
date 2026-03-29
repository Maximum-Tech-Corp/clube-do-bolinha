# Clube do Bolinha — Fluxo de Uso da Aplicação

Este documento descreve, em linguagem simples, como cada tipo de usuário interage com o Clube do Bolinha. Está dividido em dois grandes atores: **Jogador** e **Admin / Co-admin**.

---

## Sumário

1. [Jogador](#jogador)
   - [Fluxo feliz — confirmação de presença](#fluxo-feliz--confirmação-de-presença)
   - [Fluxos alternativos do Jogador](#fluxos-alternativos-do-jogador)
2. [Admin e Co-admin](#admin-e-co-admin)
   - [Fluxo feliz — criando e finalizando um jogo](#fluxo-feliz--criando-e-finalizando-um-jogo)
   - [Fluxos alternativos do Admin](#fluxos-alternativos-do-admin)

---

# Jogador

O jogador **não precisa criar conta** nem fazer login. Ele acessa o time por meio de um **código de acesso** que o admin compartilha (via link do WhatsApp, por exemplo).

---

## Fluxo feliz — confirmação de presença

### 1. Acessar o time

O jogador recebe um link do tipo:
```
https://clubedobolinha.com.br/jogador/ABCD-123456
```

Ao abrir o link, o app exibe a tela do time com os próximos jogos marcados para os próximos 7 dias.

---

### 2. Se identificar

Na primeira visita, o jogador precisa informar seu **número de telefone** (usado como identificação única dentro do time).

**Se o número já estiver cadastrado:** o jogador é reconhecido automaticamente e entra direto na área do time.

**Se o número não estiver cadastrado:** o app exibe um formulário para o jogador preencher:
- Nome completo
- Peso (kg)
- Condicionamento físico (1 a 4+)

Após o cadastro, o jogador é identificado e não precisa se identificar novamente nas próximas visitas (o celular lembra quem ele é).

---

### 3. Confirmar presença

Na tela principal, o jogador vê o próximo jogo com local, data e horário. Ele clica em **"Confirmar presença"**.

O app registra a confirmação e exibe a quantidade de jogadores confirmados.

---

### 4. Acompanhar o jogo

A partir da confirmação, o jogador pode acompanhar:

| Momento | O que o jogador vê |
|---|---|
| Antes do sorteio | Lista com o número de confirmados (sem nomes) |
| Após o sorteio | Os times formados e em qual time ele foi sorteado |
| Durante o campeonato | A tabela de grupos, semifinal e final em tempo real |
| Após o jogo | O resultado final, gols e assistências de cada jogador |

---

## Fluxos alternativos do Jogador

### Entrar na lista de espera

Se o jogo já tiver **25 jogadores confirmados** (capacidade máxima), o jogador recebe uma mensagem de que o jogo está cheio. Ele pode optar por **entrar na lista de espera**.

Se algum jogador confirmar cancelar a presença, o primeiro da lista de espera é promovido automaticamente para confirmado.

---

### Cancelar a presença

O jogador pode cancelar sua presença a qualquer momento antes do sorteio ser realizado. O botão de cancelar fica visível na tela do jogo após a confirmação.

Ao cancelar, o primeiro jogador da lista de espera (se houver) é promovido automaticamente.

---

### Jogador banido

Se o admin banir o jogador, ao tentar se identificar pelo número de telefone o app exibe uma mensagem informando que ele está impedido de participar. Ele não consegue confirmar presença em nenhum jogo.

---

### Jogador suspenso

Se o admin suspender o jogador até uma determinada data, ao tentar se identificar o app exibe uma mensagem com a data de fim da suspensão. Após essa data, o jogador volta a ter acesso normalmente, sem necessidade de nenhuma ação do admin.

---

### Jogador sem jogo disponível

Se não houver jogo marcado para os próximos 7 dias, a tela principal exibe uma mensagem amigável informando que não há jogos no momento.

---

### Trocar de time

Se o jogador faz parte de mais de um time (com códigos diferentes), basta acessar o link do outro time. Cada time tem sua própria identificação por telefone — o mesmo número pode existir em times diferentes.

---

# Admin e Co-admin

O **Admin** é quem criou o time. Ele tem acesso total ao painel de gestão. O **Co-admin** é um segundo usuário criado pelo próprio admin para ajudar na gestão — ele enxerga e gerencia o mesmo time, com os mesmos poderes, com exceção de criar outro co-admin.

Ao longo deste fluxo, sempre que citarmos "Admin", entenda que o Co-admin também pode realizar a mesma ação.

---

## Fluxo feliz — criando e finalizando um jogo

### 1. Criar conta e assinar

O Admin acessa o app, cria uma conta informando seu nome, e-mail, telefone e nome do time. Em seguida, é redirecionado para o checkout de assinatura.

Após o pagamento, o acesso ao painel é liberado.

---

### 2. Compartilhar o código do time

Na tela inicial do painel, o Admin visualiza o **código de acesso do time** (ex: `ABCD-123456`). Ele pode copiar o link ou compartilhar diretamente pelo WhatsApp com um clique.

Os jogadores usam esse link para acessar o time.

---

### 3. Criar um jogo

O Admin acessa **Jogos → Novo jogo** e informa:
- Local do jogo
- Data e horário

O jogo é criado com status **aberto** e começa a receber confirmações dos jogadores.

---

### 4. Acompanhar as confirmações

Na tela de detalhes do jogo, o Admin vê em tempo real:
- Quantos jogadores confirmaram (lista de confirmados)
- Quantos estão na lista de espera

O Admin também pode:
- **Adicionar jogadores manualmente** (por nome, telefone, peso e condicionamento) — útil para jogadores sem smartphone
- **Remover um jogador** da lista de confirmados (o primeiro da espera sobe automaticamente)
- **Mover um confirmado para a espera** manualmente

---

### 5. Realizar o sorteio

Quando o Admin decidir que é hora de sortear os times, ele clica em **"Realizar sorteio"**.

O app mostra um resumo:
- Quantos jogadores serão sorteados
- Quantos times serão formados
- Se o número de jogadores é compatível com um campeonato (4 ou 5 times completos)

O Admin pode marcar a opção **"Será campeonato?"** antes de confirmar.

Ao confirmar, o algoritmo de balanceamento distribui os jogadores de forma equilibrada entre os times, considerando peso, condicionamento físico e marcação de craques.

---

### 6. Gerenciar os times durante o jogo

Após o sorteio, o Admin acessa a tela de **Times** e vê os times formados.

Durante o jogo, ele pode lançar:
- **Gols** por jogador (+ ou −)
- **Assistências** por jogador (+ ou −)

---

### 7a. Finalizar jogo simples (sem campeonato)

Ao término do jogo, o Admin clica em **"Finalizar jogo"**. O jogo é encerrado, as estatísticas ficam salvas no histórico e os gols/assistências são contabilizados no ranking anual.

---

### 7b. Gerenciar campeonato (com campeonato ativado)

Se o campeonato estiver ativado, o Admin acessa a tela de **Campeonato**.

**Fase de grupos:**
- Todos os confrontos da fase de grupos são gerados automaticamente (todos contra todos)
- O Admin lança o placar de cada partida à medida que elas acontecem
- A tabela de classificação é atualizada em tempo real

**Semifinais (4 times):**
- Após a fase de grupos, o Admin clica em **"Avançar para semifinal"**
- O app cria automaticamente os confrontos:
  - 1º colocado × 4º colocado
  - 2º colocado × 3º colocado
- O Admin lança os placares

**Final:**
- O app cria o confronto final entre os vencedores das semis
- O Admin lança o placar

**5 times:**
- Não há semifinal — após a fase de grupos, o 1º enfrenta o 2º na final diretamente

**Finalizar campeonato:**
- Após o placar da final ser registrado, o Admin clica em **"Finalizar campeonato"**
- O campeão e vice são registrados, e o jogo vai para o histórico

---

### 8. Consultar histórico e rankings

O Admin pode acessar:
- **Histórico** — todos os jogos finalizados, com resultados e estatísticas
- **Rankings** — top jogadores do ano em gols, assistências, presença e MVP

---

## Fluxos alternativos do Admin

### Criar e gerenciar jogadores

O Admin pode, a qualquer momento, acessar **Jogadores** para:
- Ver todos os jogadores cadastrados com taxa de presença, gols e assistências
- Editar dados de um jogador (nome, peso, condicionamento, posição, status de craque)
- **Banir** um jogador (impedido de confirmar presença)
- **Suspender** um jogador até uma data específica, com motivo
- **Reativar** um jogador banido ou suspenso
- **Adicionar estatísticas retroativas** (gols/assistências de anos anteriores ao app)

---

### Cancelar um jogo

Se o jogo precisar ser cancelado antes de acontecer, o Admin acessa o jogo e clica em **"Cancelar jogo"**. O status muda para cancelado e os jogadores não podem mais confirmar presença.

---

### Refazer o sorteio

Se o sorteio foi feito mas ainda não houve lançamento de nenhuma estatística (nenhum gol ou assistência registrado), o Admin pode desfazer o sorteio e refazê-lo. Após qualquer lançamento de estatística, o botão de refazer é bloqueado.

---

### Personalizar o código de acesso

O Admin pode alterar o prefixo do código de acesso do time (os 4 primeiros caracteres) em **Configurações do time**. O sufixo permanece fixo.

---

### Configurar o time

O Admin pode alterar:
- Nome do time
- Duração da partida (em minutos) — usado para o timer visual durante o jogo

---

### Criar um Co-admin

O Admin acessa o menu **⋮ → Co-admin** e informa o e-mail e senha do co-admin.

O co-admin recebe acesso ao painel e vê o mesmo time, com as mesmas permissões de gestão, mas **não pode criar outro co-admin**.

O admin pode remover o co-admin a qualquer momento por esse mesmo menu.

---

### Gerenciar assinatura

O Admin acessa o menu **⋮ → Assinatura** e é redirecionado para o portal do Stripe, onde pode:
- Visualizar o plano atual
- Atualizar o método de pagamento
- Cancelar a assinatura

Se a assinatura for cancelada ou o pagamento falhar, o acesso ao painel é bloqueado e o Admin é redirecionado para a página de pagamento pendente.

---

### Redefinir senha

O Admin pode solicitar a redefinição de senha pela tela de login clicando em **"Esqueci minha senha"**. Um e-mail de redefinição é enviado. Após redefinir, o acesso é restaurado normalmente.

O Admin logado também pode trocar a senha pelo menu **⋮ → Alterar senha**.
