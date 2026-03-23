import type { StaminaLevel } from "@/types/database.types";

export const TEAM_SIZE = 5;

export interface PlayerForDraw {
  id: string;
  name: string;
  weight_kg: number;
  stamina: StaminaLevel;
  is_star: boolean;
}

export interface ScoredPlayer extends PlayerForDraw {
  drawScore: number;
}

// ── Informações de preview do sorteio ────────────────────────────────────────

export interface DrawInfo {
  nTeams: number;
  completeTeams: number;
  leftover: number;       // 0 se não há time incompleto
  hasPartialTeam: boolean;
  canDraw: boolean;
  isWarning: boolean;
  message: string | null;
  canBeTournament: boolean; // 4 ou 5 times (incluindo time incompleto)
}

export function getDrawInfo(count: number): DrawInfo {
  const completeTeams = Math.floor(count / TEAM_SIZE);
  const leftover = count % TEAM_SIZE;
  const hasPartialTeam = leftover >= 3;
  const nTeams = completeTeams + (hasPartialTeam ? 1 : 0);

  // Campeonato disponível com 4 ou 5 times no total (incluindo time incompleto)
  const nTeamsPreview = completeTeams + (leftover >= 3 ? 1 : 0);
  const canBeTournament = nTeamsPreview === 4 || nTeamsPreview === 5;

  if (completeTeams < 3) {
    const missing = 15 - count;
    return {
      nTeams,
      completeTeams,
      leftover: 0,
      hasPartialTeam: false,
      canDraw: false,
      isWarning: false,
      canBeTournament: false,
      message: `Mínimo 15 jogadores (3 times de 5). Faltam ${missing}.`,
    };
  }

  if (completeTeams === 5 && leftover > 0) {
    return {
      nTeams,
      completeTeams,
      leftover,
      hasPartialTeam,
      canDraw: false,
      isWarning: false,
      canBeTournament: false,
      message: `5 times completos + ${leftover} jogador(es) sobrando. Remova os excedentes.`,
    };
  }

  if (completeTeams > 5) {
    return {
      nTeams,
      completeTeams,
      leftover,
      hasPartialTeam,
      canDraw: false,
      isWarning: false,
      canBeTournament: false,
      message: `Jogadores demais (${count}). Remova até fechar em 25 ou menos.`,
    };
  }

  if (leftover === 1 || leftover === 2) {
    const needed = 3 - leftover;
    return {
      nTeams,
      completeTeams,
      leftover,
      hasPartialTeam: false,
      canDraw: false,
      isWarning: false,
      canBeTournament: false,
      message: `${leftover} jogador(es) sobrando sem time. Adicione mais ${needed} ou remova ${leftover}.`,
    };
  }

  if (leftover === 3 || leftover === 4) {
    return {
      nTeams,
      completeTeams,
      leftover,
      hasPartialTeam: true,
      canDraw: true,
      isWarning: true,
      canBeTournament,
      message: `Terá 1 time incompleto com ${leftover} jogadores.`,
    };
  }

  return {
    nTeams,
    completeTeams,
    leftover: 0,
    hasPartialTeam: false,
    canDraw: true,
    isWarning: false,
    canBeTournament,
    message: null,
  };
}

// ── Algoritmo de sorteio ──────────────────────────────────────────────────────

function staminaToScore(stamina: StaminaLevel): number {
  const map: Record<StaminaLevel, number> = {
    "1": 1,
    "2": 2,
    "3": 3,
    "4plus": 4,
  };
  return map[stamina];
}

/**
 * Normaliza o peso para escala 1–4 (igual à escala da stamina).
 * O jogador mais leve do grupo fica com 1, o mais pesado com 4.
 * Se todos têm o mesmo peso, retorna 2.5 (meio da escala).
 */
function normalizeWeight(weight: number, min: number, max: number): number {
  if (max === min) return 2.5;
  return ((weight - min) / (max - min)) * 3 + 1;
}

/**
 * Snake draft: distribui jogadores em serpentina pelos times.
 *
 * Exemplo com 3 times:
 *   Rodada 1 (→): T1, T2, T3
 *   Rodada 2 (←): T3, T2, T1
 *   Rodada 3 (→): T1, T2, T3
 *   ...
 */
function snakeDraft(players: ScoredPlayer[], nTeams: number): ScoredPlayer[][] {
  const teams: ScoredPlayer[][] = Array.from({ length: nTeams }, () => []);

  for (let i = 0; i < players.length; i++) {
    const posInRound = i % nTeams;
    const round = Math.floor(i / nTeams);
    const teamIndex = round % 2 === 0 ? posInRound : nTeams - 1 - posInRound;
    teams[teamIndex].push(players[i]);
  }

  return teams;
}

/**
 * Embaralhamento Fisher-Yates (in-place, determinístico com Math.random).
 */
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Redistribuição de estrelas pós-draft.
 *
 * Se algum time tiver 2+ estrelas a mais que outro, troca a melhor
 * estrela do time "rico" com o melhor não-estrela do time "pobre".
 * Repete até a diferença máxima entre quaisquer dois times ser ≤ 1.
 */
export function redistributeStars(teams: ScoredPlayer[][]): void {
  for (let iter = 0; iter < 50; iter++) {
    const counts = teams.map((t) => t.filter((p) => p.is_star).length);
    const maxStars = Math.max(...counts);
    const minStars = Math.min(...counts);

    if (maxStars - minStars <= 1) break;

    const richIdx = counts.indexOf(maxStars);
    const poorIdx = counts.indexOf(minStars);

    // Escolhe a estrela de menor score no time rico para transferir
    // (minimiza o impacto no equilíbrio de scores)
    const starsInRich = teams[richIdx]
      .filter((p) => p.is_star)
      .sort((a, b) => a.drawScore - b.drawScore);

    // Escolhe o não-estrela de maior score no time pobre para receber a estrela
    const nonStarsInPoor = teams[poorIdx]
      .filter((p) => !p.is_star)
      .sort((a, b) => b.drawScore - a.drawScore);

    if (starsInRich.length === 0 || nonStarsInPoor.length === 0) break;

    const starToMove = starsInRich[0];
    const nonStarToReceive = nonStarsInPoor[0];

    const richPlayerIdx = teams[richIdx].indexOf(starToMove);
    const poorPlayerIdx = teams[poorIdx].indexOf(nonStarToReceive);

    teams[richIdx][richPlayerIdx] = nonStarToReceive;
    teams[poorIdx][poorPlayerIdx] = starToMove;
  }
}

/**
 * Executa o sorteio balanceado e retorna os times formados.
 *
 * Fluxo:
 * 1. Calcula score de cada não-estrela = (peso_norm × 0,5) + (stamina × 0,5)
 * 2. Estrelas recebem score fixo máximo (5,0) e são embaralhadas aleatoriamente
 * 3. Snake draft: estrelas primeiro (embaralhadas), depois demais por score desc.
 * 4. Redistribui estrelas se diferença > 1 entre times (segurança)
 */
export function runDraw(players: PlayerForDraw[]): ScoredPlayer[][] {
  const { nTeams } = getDrawInfo(players.length);

  const weights = players.map((p) => p.weight_kg);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);

  const scored: ScoredPlayer[] = players.map((p) => ({
    ...p,
    drawScore: p.is_star
      ? 5.0
      : normalizeWeight(p.weight_kg, minWeight, maxWeight) * 0.5 +
        staminaToScore(p.stamina) * 0.5,
  }));

  const stars = shuffle(scored.filter((p) => p.is_star));
  const nonStars = scored
    .filter((p) => !p.is_star)
    .sort((a, b) => b.drawScore - a.drawScore);

  const sorted = [...stars, ...nonStars];
  const teams = snakeDraft(sorted, nTeams);

  redistributeStars(teams);

  return teams;
}
