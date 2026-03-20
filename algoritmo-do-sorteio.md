# Algoritmo de Sorteio — Clube do Bolinha

> Como o app distribui os jogadores em times equilibrados.

---

## O problema

Dado um grupo de jogadores com características físicas diferentes (peso e resistência) e alguns marcados como "destaque", como dividir em times que sejam o mais equilibrados possível?

---

## Os ingredientes

Cada jogador tem duas características que medem sua "força" no jogo:

| Característica | Valores possíveis | Score |
|---|---|---|
| **Resistência (stamina)** | 1 jogo | 1 |
| | 2 jogos | 2 |
| | 3 jogos | 3 |
| | 4 ou mais jogos | 4 |
| **Peso (normalizado)** | Mais leve do grupo | 1 |
| | Mais pesado do grupo | 4 |
| | Intermediários | entre 1 e 4 |

### Por que peso importa?

Um jogador pesado que aguenta jogar muitos jogos sem cansar é tipicamente um jogador dominante — fisicamente imponente e resistente. Por outro lado, um jogador leve que cansa rápido é o perfil oposto. A combinação de peso e stamina captura bem esse espectro sem precisar dar uma "nota" subjetiva ao jogador.

### Normalização do peso

Os pesos são normalizados *dentro do grupo de cada jogo* para a escala 1–4, igual à stamina:

```
peso_normalizado = ((peso_kg - menor_peso) / (maior_peso - menor_peso)) × 3 + 1
```

Exemplo: grupo com pesos de 65 kg a 95 kg
- 65 kg → score 1.0
- 80 kg → score 2.5
- 95 kg → score 4.0

Se todos os jogadores tiverem o mesmo peso, todos recebem 2.5 (meio da escala).

### Score final

```
score = (peso_normalizado × 0,5) + (stamina × 0,5)
```

Isso significa que **peso alto + stamina alta = score máximo** (≈ 4,0) e **peso baixo + stamina baixa = score mínimo** (≈ 1,0). Jogadores com combinações opostas (pesado+fraco vs leve+forte) ficam com scores equivalentes — o que é justo.

---

## Jogadores Destaque (estrelas ⭐)

Jogadores marcados como destaque são excelentes independentemente de peso ou stamina. Eles:

- **Ignoram** peso e stamina no cálculo
- Recebem um **score fixo de 5,0** (acima do máximo possível para não-estrelas)
- São **embaralhados aleatoriamente** antes da distribuição (para que não sejam sempre alocados nos mesmos times)

---

## O Snake Draft

O "snake draft" é a técnica usada para distribuir os jogadores de forma equilibrada. É o mesmo método usado em ligas de fantasy sports.

### Como funciona

Os jogadores são ordenados por score (estrelas primeiro — embaralhadas, depois demais do maior para o menor). A distribuição percorre os times em *serpentina*:

```
Rodada 1 (→):  Time A,  Time B,  Time C
Rodada 2 (←):  Time C,  Time B,  Time A
Rodada 3 (→):  Time A,  Time B,  Time C
...
```

### Por que serpentina?

Se fosse sempre da esquerda para a direita, o Time A sempre pegaria o melhor jogador de cada rodada. Com a serpentina, quem pegou o último da rodada anterior pega o primeiro da próxima — equilibrando os picks ao longo do tempo.

### Exemplo com 3 times e 15 jogadores (scores fictícios)

| Pick | Direção | Time | Jogador | Score |
|---|---|---|---|---|
| 1 | → | A | ⭐ Pedro | 5.0 |
| 2 | → | B | ⭐ Rafael | 5.0 |
| 3 | → | C | João (95kg, 4plus) | 4.0 |
| 4 | ← | C | ⭐ Carlos | 5.0 |
| 5 | ← | B | Felipe (90kg, 4plus) | 3.9 |
| 6 | ← | A | Lucas (88kg, 3) | 3.4 |
| 7 | → | A | Mateus (85kg, 3) | 3.2 |
| 8 | → | B | Diego (82kg, 2) | 2.8 |
| 9 | → | C | Henrique (80kg, 3) | 2.8 |
| ... | | | | |

Resultado: cada time recebe uma mistura de jogadores fortes e fracos.

---

## Times incompletos (sobrando 3 ou 4 jogadores)

Quando o número de confirmados não é múltiplo de 5, pode sobrar 3 ou 4 jogadores. Nesse caso, eles formam um **time adicional incompleto** que participa normalmente do snake draft — os jogadores restantes são distribuídos como mais um time no processo.

| Confirmados | Times formados |
|---|---|
| 15 | 3 times de 5 |
| 18 | 3 times de 5 + 1 time de 3 |
| 20 | 4 times de 5 |
| 23 | 4 times de 5 + 1 time de 3 |
| 25 | 5 times de 5 |

---

## Redistribuição de estrelas (segurança)

O snake draft com estrelas embaralhadas já distribui estrelas naturalmente de forma balanceada. Mas como medida de segurança, após o draft é feita uma verificação:

> Se algum time tiver **2 ou mais estrelas a mais** que outro time, o algoritmo faz trocas até a diferença máxima ser de 1.

**Como a troca funciona:**
1. Identifica o time "rico" (mais estrelas) e o time "pobre" (menos estrelas)
2. Move a estrela de menor score do time rico para o time pobre
3. Move o não-estrela de maior score do time pobre para o time rico
4. Repete até a diferença ser ≤ 1

Isso garante que o balanceamento de estrelas não quebre o equilíbrio de scores mais do que o necessário.

---

## Fluxo completo resumido

```
1. Separar estrelas dos demais
2. Embaralhar estrelas aleatoriamente
3. Calcular score dos demais: (peso_norm × 0,5) + (stamina × 0,5)
4. Ordenar demais por score decrescente
5. Montar fila: [estrelas embaralhadas] + [demais ordenados]
6. Distribuir em snake draft pelos N times
7. Verificar e corrigir distribuição de estrelas se necessário
8. Salvar times no banco de dados
```

---

## Código de referência

- Algoritmo puro: [`src/lib/draw-algorithm.ts`](src/lib/draw-algorithm.ts)
- Server Action (persiste no banco): [`src/actions/draw.ts`](src/actions/draw.ts)
- Modal de confirmação: [`src/components/dashboard/draw-modal.tsx`](src/components/dashboard/draw-modal.tsx)
