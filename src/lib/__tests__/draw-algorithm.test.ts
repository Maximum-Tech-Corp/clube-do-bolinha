import { describe, it, expect } from 'vitest';
import {
  getDrawInfo,
  runDraw,
  redistributeStars,
  TEAM_SIZE,
} from '@/lib/draw-algorithm';
import type { PlayerForDraw, ScoredPlayer } from '@/lib/draw-algorithm';

function makePlayers(
  count: number,
  overrides: Partial<PlayerForDraw> = {},
): PlayerForDraw[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    weight_kg: 60 + (i % 40),
    stamina: (['1', '2', '3', '4plus'] as const)[i % 4],
    is_star: false,
    ...overrides,
  }));
}

describe('TEAM_SIZE', () => {
  it('is 5', () => {
    expect(TEAM_SIZE).toBe(5);
  });
});

describe('getDrawInfo', () => {
  it('requires at least 15 players', () => {
    const result = getDrawInfo(10);
    expect(result.canDraw).toBe(false);
    expect(result.message).toMatch(/Faltam 5/);
  });

  it('count 14 — missing 1 player', () => {
    const result = getDrawInfo(14);
    expect(result.canDraw).toBe(false);
    expect(result.message).toMatch(/Faltam 1/);
  });

  it('count 15 — 3 complete teams, no warning', () => {
    const result = getDrawInfo(15);
    expect(result.canDraw).toBe(true);
    expect(result.isWarning).toBe(false);
    expect(result.completeTeams).toBe(3);
    expect(result.nTeams).toBe(3);
    expect(result.hasPartialTeam).toBe(false);
    expect(result.leftover).toBe(0);
    expect(result.message).toBeNull();
  });

  it('count 16 — 1 leftover, cannot draw', () => {
    const result = getDrawInfo(16);
    expect(result.canDraw).toBe(false);
    expect(result.leftover).toBe(1);
    expect(result.message).toMatch(/sobrando/);
  });

  it('count 17 — 2 leftover, cannot draw', () => {
    const result = getDrawInfo(17);
    expect(result.canDraw).toBe(false);
    expect(result.leftover).toBe(2);
  });

  it('count 18 — partial team of 3, warning', () => {
    const result = getDrawInfo(18);
    expect(result.canDraw).toBe(true);
    expect(result.isWarning).toBe(true);
    expect(result.hasPartialTeam).toBe(true);
    expect(result.leftover).toBe(3);
    expect(result.completeTeams).toBe(3);
    expect(result.nTeams).toBe(4);
    expect(result.message).toMatch(/time incompleto com 3/);
  });

  it('count 19 — partial team of 4, warning', () => {
    const result = getDrawInfo(19);
    expect(result.canDraw).toBe(true);
    expect(result.isWarning).toBe(true);
    expect(result.leftover).toBe(4);
    expect(result.nTeams).toBe(4);
  });

  it('count 20 — 4 complete teams, no warning', () => {
    const result = getDrawInfo(20);
    expect(result.canDraw).toBe(true);
    expect(result.isWarning).toBe(false);
    expect(result.completeTeams).toBe(4);
    expect(result.nTeams).toBe(4);
    expect(result.message).toBeNull();
  });

  it('count 25 — 5 complete teams, no warning', () => {
    const result = getDrawInfo(25);
    expect(result.canDraw).toBe(true);
    expect(result.isWarning).toBe(false);
    expect(result.completeTeams).toBe(5);
    expect(result.nTeams).toBe(5);
  });

  it('count 26 — 5 complete + 1 leftover, blocks draw', () => {
    const result = getDrawInfo(26);
    expect(result.canDraw).toBe(false);
    expect(result.message).toMatch(/sobrando/);
  });

  it('count 30 — too many players', () => {
    const result = getDrawInfo(30);
    expect(result.canDraw).toBe(false);
    expect(result.message).toMatch(/demais/);
  });

  describe('canBeTournament', () => {
    it('3 teams → false', () =>
      expect(getDrawInfo(15).canBeTournament).toBe(false));
    it('4 teams (20 players) → true', () =>
      expect(getDrawInfo(20).canBeTournament).toBe(true));
    it('4 teams via partial (18 players) → true', () =>
      expect(getDrawInfo(18).canBeTournament).toBe(true));
    it('5 teams (25 players) → true', () =>
      expect(getDrawInfo(25).canBeTournament).toBe(true));
    it('5 teams via partial (24 players) → false (only 4 complete + 4 leftover = 5 total)', () => {
      // 24 = 4*5 + 4 → 4 complete + 1 partial = 5 teams
      expect(getDrawInfo(24).canBeTournament).toBe(true);
    });
  });
});

describe('runDraw', () => {
  it('returns correct number of teams for 15 players (3 teams)', () => {
    const teams = runDraw(makePlayers(15));
    expect(teams).toHaveLength(3);
  });

  it('returns correct number of teams for 20 players (4 teams)', () => {
    const teams = runDraw(makePlayers(20));
    expect(teams).toHaveLength(4);
  });

  it('returns correct number of teams for 25 players (5 teams)', () => {
    const teams = runDraw(makePlayers(25));
    expect(teams).toHaveLength(5);
  });

  it('each player appears exactly once across all teams', () => {
    const players = makePlayers(20);
    const teams = runDraw(players);
    const allIds = teams.flat().map(p => p.id);
    expect(allIds).toHaveLength(players.length);
    expect(new Set(allIds).size).toBe(players.length);
  });

  it('star players are distributed with at most 1 difference between teams', () => {
    // 20 players, 4 stars evenly distributed should give 1 star per team
    const players = makePlayers(20);
    players[0].is_star = true;
    players[5].is_star = true;
    players[10].is_star = true;
    players[15].is_star = true;

    const teams = runDraw(players);
    const starCounts = teams.map(t => t.filter(p => p.is_star).length);
    const maxStars = Math.max(...starCounts);
    const minStars = Math.min(...starCounts);
    expect(maxStars - minStars).toBeLessThanOrEqual(1);
  });

  it('each team has correct size for exact multiples', () => {
    const teams = runDraw(makePlayers(15));
    expect(teams.every(t => t.length === 5)).toBe(true);
  });

  it('drawScore is 5 for star players', () => {
    const players = makePlayers(15);
    players[0].is_star = true;

    const teams = runDraw(players);
    const star = teams.flat().find(p => p.id === 'p0');
    expect(star?.drawScore).toBe(5);
  });

  it('drawScore for non-star is between 1 and 4', () => {
    const teams = runDraw(makePlayers(15));
    const nonStars = teams.flat().filter(p => !p.is_star);
    for (const p of nonStars) {
      expect(p.drawScore).toBeGreaterThanOrEqual(1);
      expect(p.drawScore).toBeLessThanOrEqual(4);
    }
  });

  it('handles all same weight (weight normalization returns 2.5)', () => {
    const players = makePlayers(15, { weight_kg: 75 });
    const teams = runDraw(players);
    expect(teams).toHaveLength(3);
    expect(teams.flat()).toHaveLength(15);
  });
});

// ── redistributeStars ─────────────────────────────────────────────────────────

function makeScoredPlayer(
  id: string,
  isStar: boolean,
  score = 2,
): ScoredPlayer {
  return {
    id,
    name: id,
    weight_kg: 70,
    stamina: '3',
    is_star: isStar,
    drawScore: score,
  };
}

describe('redistributeStars', () => {
  it('does nothing when star counts are already balanced (diff ≤ 1)', () => {
    const teams: ScoredPlayer[][] = [
      [makeScoredPlayer('s1', true), makeScoredPlayer('p1', false)],
      [makeScoredPlayer('s2', true), makeScoredPlayer('p2', false)],
    ];
    redistributeStars(teams);
    expect(teams[0].filter(p => p.is_star)).toHaveLength(1);
    expect(teams[1].filter(p => p.is_star)).toHaveLength(1);
  });

  it('swaps star from rich team to poor team when diff ≥ 2', () => {
    // team0: 3 stars, team1: 0 stars — diff = 3, triggers redistribution
    const teams: ScoredPlayer[][] = [
      [
        makeScoredPlayer('s1', true, 5),
        makeScoredPlayer('s2', true, 5),
        makeScoredPlayer('s3', true, 5),
      ],
      [
        makeScoredPlayer('p1', false, 2),
        makeScoredPlayer('p2', false, 2),
        makeScoredPlayer('p3', false, 2),
      ],
    ];
    redistributeStars(teams);
    const stars0 = teams[0].filter(p => p.is_star).length;
    const stars1 = teams[1].filter(p => p.is_star).length;
    expect(Math.abs(stars0 - stars1)).toBeLessThanOrEqual(1);
  });

  it('swaps lowest-score star from rich team with highest-score non-star from poor team', () => {
    // team0: 2 stars (scores 5 and 3), team1: 0 stars (non-stars with scores 4 and 2)
    // Expects: weakest star (score 3) moves to team1; strongest non-star (score 4) moves to team0
    const weakStar = makeScoredPlayer('s-weak', true, 3);
    const strongStar = makeScoredPlayer('s-strong', true, 5);
    const strongNonStar = makeScoredPlayer('p-strong', false, 4);
    const weakNonStar = makeScoredPlayer('p-weak', false, 2);

    const teams: ScoredPlayer[][] = [
      [strongStar, weakStar],
      [strongNonStar, weakNonStar],
    ];

    redistributeStars(teams);

    const team0Stars = teams[0].filter(p => p.is_star);
    const team1Stars = teams[1].filter(p => p.is_star);

    // After redistribution: each team should have 1 star
    expect(team0Stars).toHaveLength(1);
    expect(team1Stars).toHaveLength(1);

    // The star that stayed in team0 should be the stronger one
    expect(team0Stars[0].id).toBe('s-strong');
    // The star that moved to team1 should be the weaker one
    expect(team1Stars[0].id).toBe('s-weak');
  });

  it('stops early when rich team has no stars or poor team has no non-stars', () => {
    // team0: 2 stars, team1: 1 star but no non-stars — swap blocked
    const teams: ScoredPlayer[][] = [
      [makeScoredPlayer('s1', true, 5), makeScoredPlayer('s2', true, 5)],
      [makeScoredPlayer('s3', true, 5)],
    ];
    // Should not throw and should stop without infinite loop
    expect(() => redistributeStars(teams)).not.toThrow();
  });
});
