import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerCampeonatoAccordion } from '../player-campeonato-accordion';

vi.mock('@base-ui/react/accordion', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Accordion: {
      Root: ({ children }: { children: unknown }) =>
        React.createElement('div', null, children),
      Item: ({ children }: { children: unknown }) =>
        React.createElement('div', null, children),
      Header: ({ children }: { children: unknown }) =>
        React.createElement('div', null, children),
      Trigger: ({ children }: { children: unknown }) =>
        React.createElement('button', null, children),
      Panel: ({ children }: { children: unknown }) =>
        React.createElement('div', null, children),
    },
  };
});

const TEAMS = [
  {
    id: 't1',
    teamNumber: 1,
    customName: null,
    players: [
      { name: 'Carlos', isStar: true, goals: 3, assists: 1 },
      { name: 'Bruno', isStar: false, goals: 0, assists: 2 },
    ],
  },
  {
    id: 't2',
    teamNumber: 2,
    customName: 'Eagles',
    players: [{ name: 'André', isStar: false, goals: 1, assists: 0 }],
  },
];

const STANDINGS = [
  {
    rank: 1,
    name: 'Time 1',
    played: 3,
    wins: 2,
    draws: 1,
    losses: 0,
    goalDiff: 4,
    points: 7,
  },
  {
    rank: 2,
    name: 'Eagles',
    played: 3,
    wins: 0,
    draws: 1,
    losses: 2,
    goalDiff: -4,
    points: 1,
  },
];

const MATCHES = [
  {
    phase: 'group' as const,
    label: 'Fase de Grupos',
    matches: [
      {
        id: 'm1',
        homeTeam: 'Time 1',
        awayTeam: 'Eagles',
        homeScore: 2,
        awayScore: 1,
        completed: true,
      },
      {
        id: 'm2',
        homeTeam: 'Time 1',
        awayTeam: 'Eagles',
        homeScore: null,
        awayScore: null,
        completed: false,
      },
    ],
  },
  {
    phase: 'semi' as const,
    label: 'Semifinais',
    matches: [
      {
        id: 's1',
        homeTeam: 'Time 1',
        awayTeam: 'Eagles',
        homeScore: 3,
        awayScore: 0,
        completed: true,
      },
    ],
  },
];

describe('PlayerCampeonatoAccordion', () => {
  describe('teams section', () => {
    it('renders fallback team name when customName is null', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={TEAMS}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('Time 1')).toBeInTheDocument();
    });

    it('renders custom team name when set', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={TEAMS}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('Eagles')).toBeInTheDocument();
    });

    it('renders all player names', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={TEAMS}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('Carlos')).toBeInTheDocument();
      expect(screen.getByText('Bruno')).toBeInTheDocument();
      expect(screen.getByText('André')).toBeInTheDocument();
    });

    it('shows star icon for star players', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={TEAMS}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('shows goals and assists for each player', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={TEAMS}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('3G · 1A')).toBeInTheDocument();
      expect(screen.getByText('0G · 2A')).toBeInTheDocument();
      expect(screen.getByText('1G · 0A')).toBeInTheDocument();
    });

    it('shows total goals per team', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={TEAMS}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      // Time 1: Carlos 3 + Bruno 0 = 3 gols
      expect(screen.getByText('3 gols')).toBeInTheDocument();
      // Eagles: André 1 = 1 gol
      expect(screen.getByText('1 gol')).toBeInTheDocument();
    });

    it('uses singular "gol" when total is 1', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[TEAMS[1]]}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('1 gol')).toBeInTheDocument();
    });

    it('does not render teams section when teamsData is empty', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      expect(screen.queryByText(/Time \d/)).not.toBeInTheDocument();
    });
  });

  describe('standings section', () => {
    it('renders standings table when at least one team has played', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={STANDINGS}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('Classificação')).toBeInTheDocument();
    });

    it('renders all standing rows', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={STANDINGS}
          matchesData={[]}
        />,
      );
      expect(screen.getAllByText('Time 1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('Eagles').length).toBeGreaterThan(0);
    });

    it('shows rank, points and stats for each row', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={STANDINGS}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('7')).toBeInTheDocument(); // points row 1
      expect(screen.getByText('+4')).toBeInTheDocument(); // goalDiff row 1
    });

    it('prefixes positive goal diff with "+"', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={STANDINGS}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('+4')).toBeInTheDocument();
    });

    it('shows negative goal diff without prefix', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={STANDINGS}
          matchesData={[]}
        />,
      );
      expect(screen.getByText('-4')).toBeInTheDocument();
    });

    it('does not render standings when all played === 0', () => {
      const unplayedStandings = STANDINGS.map(s => ({ ...s, played: 0 }));
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={unplayedStandings}
          matchesData={[]}
        />,
      );
      expect(screen.queryByText('Classificação')).not.toBeInTheDocument();
    });

    it('does not render standings when standingsData is empty', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      expect(screen.queryByText('Classificação')).not.toBeInTheDocument();
    });
  });

  describe('matches section', () => {
    it('renders phase labels', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={[]}
          matchesData={MATCHES}
        />,
      );
      expect(screen.getByText('Fase de Grupos')).toBeInTheDocument();
      expect(screen.getByText('Semifinais')).toBeInTheDocument();
    });

    it('shows score for completed matches', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={[]}
          matchesData={MATCHES}
        />,
      );
      expect(screen.getByText('2 × 1')).toBeInTheDocument();
    });

    it('shows "— × —" for incomplete matches', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={[]}
          matchesData={MATCHES}
        />,
      );
      expect(screen.getByText('— × —')).toBeInTheDocument();
    });

    it('shows "Pendente" label for incomplete matches', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={[]}
          matchesData={MATCHES}
        />,
      );
      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });

    it('does not show "Pendente" for completed matches', () => {
      const onlyCompleted = [
        {
          phase: 'final' as const,
          label: 'Final',
          matches: [
            {
              id: 'f1',
              homeTeam: 'Time 1',
              awayTeam: 'Eagles',
              homeScore: 1,
              awayScore: 0,
              completed: true,
            },
          ],
        },
      ];
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={[]}
          matchesData={onlyCompleted}
        />,
      );
      expect(screen.queryByText('Pendente')).not.toBeInTheDocument();
    });

    it('shows home and away team names', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={[]}
          matchesData={[
            {
              phase: 'final' as const,
              label: 'Final',
              matches: [
                {
                  id: 'f1',
                  homeTeam: 'Sharks',
                  awayTeam: 'Lions',
                  homeScore: 2,
                  awayScore: 1,
                  completed: true,
                },
              ],
            },
          ]}
        />,
      );
      expect(screen.getByText('Sharks')).toBeInTheDocument();
      expect(screen.getByText('Lions')).toBeInTheDocument();
    });

    it('does not render matches section when matchesData is empty', () => {
      render(
        <PlayerCampeonatoAccordion
          teamsData={[]}
          standingsData={[]}
          matchesData={[]}
        />,
      );
      expect(screen.queryByText('Fase de Grupos')).not.toBeInTheDocument();
      expect(screen.queryByText('Semifinais')).not.toBeInTheDocument();
    });
  });
});
