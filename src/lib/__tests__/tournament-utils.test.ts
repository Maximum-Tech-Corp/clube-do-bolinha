import { describe, it, expect } from 'vitest';
import { buildGroupMatchOrder, computeStandings } from '@/lib/tournament-utils';
import type { MatchRow } from '@/lib/tournament-utils';

describe('buildGroupMatchOrder', () => {
  const teams4 = ['t1', 't2', 't3', 't4'];
  const teams5 = ['t1', 't2', 't3', 't4', 't5'];

  it('4 teams → 6 matches', () => {
    expect(buildGroupMatchOrder(teams4)).toHaveLength(6);
  });

  it('5 teams → 10 matches', () => {
    expect(buildGroupMatchOrder(teams5)).toHaveLength(10);
  });

  it('4 teams: each pair plays exactly once', () => {
    const pairs = buildGroupMatchOrder(teams4);
    const keys = pairs.map(([a, b]) => [a, b].sort().join('|'));
    expect(new Set(keys).size).toBe(6); // C(4,2) = 6
  });

  it('5 teams: each pair plays exactly once', () => {
    const pairs = buildGroupMatchOrder(teams5);
    const keys = pairs.map(([a, b]) => [a, b].sort().join('|'));
    expect(new Set(keys).size).toBe(10); // C(5,2) = 10
  });

  it('5 teams: no team plays consecutive matches', () => {
    const pairs = buildGroupMatchOrder(teams5);
    for (let i = 1; i < pairs.length; i++) {
      const prev = pairs[i - 1];
      const curr = pairs[i];
      const prevTeams = new Set(prev);
      const hasConsecutive = curr.some(t => prevTeams.has(t));
      expect(hasConsecutive).toBe(false);
    }
  });

  it('fallback for 3 teams → 3 matches (C(3,2))', () => {
    const pairs = buildGroupMatchOrder(['t1', 't2', 't3']);
    expect(pairs).toHaveLength(3);
    const keys = pairs.map(([a, b]) => [a, b].sort().join('|'));
    expect(new Set(keys).size).toBe(3);
  });

  it('all teams appear in matches (4 teams)', () => {
    const pairs = buildGroupMatchOrder(teams4);
    const allTeams = new Set(pairs.flat());
    expect(allTeams).toEqual(new Set(teams4));
  });
});

describe('computeStandings', () => {
  function makeMatch(
    id: string,
    homeId: string,
    awayId: string,
    homeScore: number,
    awayScore: number,
    completed = true,
  ): MatchRow {
    return {
      id,
      phase: 'group',
      home_team_id: homeId,
      away_team_id: awayId,
      home_score: homeScore,
      away_score: awayScore,
      match_order: 0,
      completed,
    };
  }

  const teamMap = new Map([
    ['t1', 1],
    ['t2', 2],
    ['t3', 3],
  ]);

  it('returns one row per team even with no matches', () => {
    const rows = computeStandings([], teamMap);
    expect(rows).toHaveLength(3);
    rows.forEach(r => {
      expect(r.played).toBe(0);
      expect(r.points).toBe(0);
    });
  });

  it('win gives 3 points to winner and 0 to loser', () => {
    const matches = [makeMatch('m1', 't1', 't2', 3, 1)];
    const rows = computeStandings(matches, teamMap);
    const t1 = rows.find(r => r.teamId === 't1')!;
    const t2 = rows.find(r => r.teamId === 't2')!;
    expect(t1.points).toBe(3);
    expect(t1.wins).toBe(1);
    expect(t2.points).toBe(0);
    expect(t2.losses).toBe(1);
  });

  it('draw gives 1 point to each team', () => {
    const matches = [makeMatch('m1', 't1', 't2', 2, 2)];
    const rows = computeStandings(matches, teamMap);
    const t1 = rows.find(r => r.teamId === 't1')!;
    const t2 = rows.find(r => r.teamId === 't2')!;
    expect(t1.points).toBe(1);
    expect(t1.draws).toBe(1);
    expect(t2.points).toBe(1);
    expect(t2.draws).toBe(1);
  });

  it('goals for and against tracked correctly', () => {
    const matches = [makeMatch('m1', 't1', 't2', 4, 2)];
    const rows = computeStandings(matches, teamMap);
    const t1 = rows.find(r => r.teamId === 't1')!;
    const t2 = rows.find(r => r.teamId === 't2')!;
    expect(t1.goalsFor).toBe(4);
    expect(t1.goalsAgainst).toBe(2);
    expect(t1.goalDiff).toBe(2);
    expect(t2.goalsFor).toBe(2);
    expect(t2.goalsAgainst).toBe(4);
    expect(t2.goalDiff).toBe(-2);
  });

  it('incomplete matches are ignored', () => {
    const matches = [makeMatch('m1', 't1', 't2', 3, 1, false)];
    const rows = computeStandings(matches, teamMap);
    rows.forEach(r => expect(r.played).toBe(0));
  });

  it('null scores are ignored', () => {
    const incomplete: MatchRow = {
      id: 'm1',
      phase: 'group',
      home_team_id: 't1',
      away_team_id: 't2',
      home_score: null,
      away_score: null,
      match_order: 0,
      completed: true,
    };
    const rows = computeStandings([incomplete], teamMap);
    rows.forEach(r => expect(r.played).toBe(0));
  });

  it('sorted by points DESC', () => {
    const matches = [
      makeMatch('m1', 't1', 't2', 2, 0), // t1 wins
      makeMatch('m2', 't1', 't3', 1, 0), // t1 wins
      makeMatch('m3', 't2', 't3', 1, 1), // draw
    ];
    const rows = computeStandings(matches, teamMap);
    expect(rows[0].teamId).toBe('t1'); // 6 pts
    expect(rows[0].points).toBe(6);
    // t2 and t3 both 1 pt — order between them by wins/goal diff
  });

  it('tiebreak: more wins ranks higher', () => {
    // t1 and t2 both 3 pts — t1 won, t2 drew twice
    const teamMap2 = new Map([
      ['t1', 1],
      ['t2', 2],
      ['t3', 3],
      ['t4', 4],
    ]);
    const matches = [
      makeMatch('m1', 't1', 't2', 1, 0), // t1: 3pts win, t2: 0pts
      makeMatch('m2', 't1', 't3', 0, 1), // t3: 3pts win, t1: 0pts
      makeMatch('m3', 't2', 't4', 1, 1), // t2 and t4: 1pt each
      makeMatch('m4', 't3', 't4', 0, 0), // t3 and t4: 1pt each
    ];
    // t1: 3pts, 1 win; t3: 4pts, 1 win; t2: 1pt; t4: 2pts
    // Standings: t3(4) > t1(3) > t4(2) > t2(1)
    const rows = computeStandings(matches, teamMap2);
    expect(rows[0].teamId).toBe('t3');
    expect(rows[1].teamId).toBe('t1');
  });

  it('tiebreak: better goal difference ranks higher', () => {
    const teamMap2 = new Map([
      ['t1', 1],
      ['t2', 2],
    ]);
    const matches = [
      makeMatch('m1', 't1', 't2', 3, 0), // t1: 3pts gd+3; t2: 0pts gd-3
    ];
    const rows = computeStandings(matches, teamMap2);
    expect(rows[0].teamId).toBe('t1');
    expect(rows[0].goalDiff).toBe(3);
  });

  it('teamNumber is set from teamMap', () => {
    const rows = computeStandings([], teamMap);
    const t2Row = rows.find(r => r.teamId === 't2')!;
    expect(t2Row.teamNumber).toBe(2);
  });
});
