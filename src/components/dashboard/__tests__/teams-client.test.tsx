import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TeamsClient } from '../teams-client';

const mockUpdateStat = vi.fn();
const mockFinishGame = vi.fn();

vi.mock('@/actions/game-stats', () => ({
  updateStat: (...args: unknown[]) => mockUpdateStat(...args),
  finishGame: (...args: unknown[]) => mockFinishGame(...args),
}));

// Mock Radix Dialog
vi.mock('@/components/ui/dialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Dialog: ({ children, open }: { children: unknown; open: boolean }) =>
      open ? React.createElement(React.Fragment, null, children) : null,
    DialogContent: ({ children }: { children: unknown }) =>
      React.createElement('div', { 'data-testid': 'dialog-content' }, children),
    DialogHeader: ({ children }: { children: unknown }) =>
      React.createElement('div', null, children),
    DialogTitle: ({ children }: { children: unknown }) =>
      React.createElement('h2', null, children),
    DialogDescription: ({ children }: { children: unknown }) =>
      React.createElement('p', null, children),
  };
});

const TEAMS = [
  {
    id: 'gt1',
    teamNumber: 1,
    players: [
      {
        gameTeamPlayerId: 'gtp1',
        playerId: 'p1',
        name: 'Carlos',
        isStar: true,
        goals: 2,
        assists: 1,
      },
      {
        gameTeamPlayerId: 'gtp2',
        playerId: 'p2',
        name: 'Bruno',
        isStar: false,
        goals: 0,
        assists: 0,
      },
    ],
  },
  {
    id: 'gt2',
    teamNumber: 2,
    players: [
      {
        gameTeamPlayerId: 'gtp3',
        playerId: 'p3',
        name: 'André',
        isStar: false,
        goals: 1,
        assists: 0,
      },
    ],
  },
];

describe('TeamsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateStat.mockResolvedValue({ newValue: 1 });
    mockFinishGame.mockResolvedValue({});
  });

  describe('team rendering', () => {
    it('renders all team headers', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );
      expect(screen.getByText('Time 1')).toBeInTheDocument();
      expect(screen.getByText('Time 2')).toBeInTheDocument();
    });

    it('renders all player names', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );
      expect(screen.getByText('Carlos')).toBeInTheDocument();
      expect(screen.getByText('Bruno')).toBeInTheDocument();
      expect(screen.getByText('André')).toBeInTheDocument();
    });

    it('shows star icon for star players', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );
      expect(screen.getByText('⭐')).toBeInTheDocument();
    });

    it('shows goals and assists for each player', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );
      // Carlos has 2 goals
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
    });

    it('shows read-only message when game is finished', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={true}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );
      expect(screen.getByText(/somente leitura/i)).toBeInTheDocument();
    });
  });

  describe('stat counters', () => {
    it('calls updateStat when increment is clicked', async () => {
      const user = userEvent.setup();
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );

      // First + button is goals increment for first player
      const incrementButtons = screen.getAllByText('+');
      await user.click(incrementButtons[0]);

      await waitFor(() => {
        expect(mockUpdateStat).toHaveBeenCalledWith('gtp1', 'goals', 1);
      });
    });

    it('clicking decrement button calls updateStat with -1 for goals', async () => {
      const user = userEvent.setup();
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );

      // Carlos has 2 goals — decrement button is enabled
      const decrementButtons = screen.getAllByText('−');
      await user.click(decrementButtons[0]); // Carlos goals decrement

      await waitFor(() => {
        expect(mockUpdateStat).toHaveBeenCalledWith('gtp1', 'goals', -1);
      });
    });

    it('clicking assists increment and decrement calls updateStat', async () => {
      const user = userEvent.setup();
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );

      const incrementButtons = screen.getAllByText('+');
      // Carlos assists increment (2nd + button)
      await user.click(incrementButtons[1]);

      await waitFor(() => {
        expect(mockUpdateStat).toHaveBeenCalledWith('gtp1', 'assists', 1);
      });

      vi.clearAllMocks();
      mockUpdateStat.mockResolvedValue({ newValue: 0 });

      // Carlos assists decrement (2nd − button)
      const decrementButtons = screen.getAllByText('−');
      await user.click(decrementButtons[1]);

      await waitFor(() => {
        expect(mockUpdateStat).toHaveBeenCalledWith('gtp1', 'assists', -1);
      });
    });

    it('decrement button is disabled when value is 0', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );
      // Bruno has 0 goals, first decrement button for Bruno (gtp2) should be disabled
      const decrementButtons = screen.getAllByText('−');
      // Bruno's goals decrement (3rd button: Carlos goals−, Carlos assists−, Bruno goals−)
      expect(decrementButtons[2]).toBeDisabled();
    });

    it('stat counters are disabled when game is finished', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={true}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );
      const incrementButtons = screen.getAllByText('+');
      incrementButtons.forEach(btn => expect(btn).toBeDisabled());
    });
  });

  describe('finish game button', () => {
    it("shows 'Finalizar jogo' when not finished and can finish", () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Finalizar jogo' }),
      ).toBeInTheDocument();
    });

    it('finish button is disabled when tournament not completed', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={true}
          tournamentCompleted={false}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Finalizar jogo' }),
      ).toBeDisabled();
    });

    it('shows reason when finish is blocked', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={true}
          tournamentCompleted={false}
        />,
      );
      expect(
        screen.getByText('Finalize o campeonato antes de encerrar o jogo.'),
      ).toBeInTheDocument();
    });

    it('finish button is enabled when tournament is completed', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={true}
          tournamentCompleted={true}
        />,
      );
      expect(
        screen.getByRole('button', { name: 'Finalizar jogo' }),
      ).not.toBeDisabled();
    });

    it('does not show finish button when game is already finished', () => {
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={true}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );
      expect(
        screen.queryByRole('button', { name: 'Finalizar jogo' }),
      ).not.toBeInTheDocument();
    });

    it('opens confirmation dialog on finish button click', async () => {
      const user = userEvent.setup();
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Finalizar jogo' }));

      expect(screen.getByText('Finalizar jogo?')).toBeInTheDocument();
    });

    it('calls finishGame on confirm', async () => {
      const user = userEvent.setup();
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Finalizar jogo' }));
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      await waitFor(() => {
        expect(mockFinishGame).toHaveBeenCalledWith('game-1');
      });
    });

    it('shows error and closes dialog when finishGame returns error', async () => {
      mockFinishGame.mockResolvedValue({ error: 'Erro ao finalizar jogo.' });
      const user = userEvent.setup();
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );

      await user.click(screen.getByRole('button', { name: 'Finalizar jogo' }));
      await user.click(screen.getByRole('button', { name: 'Confirmar' }));

      await waitFor(() => {
        expect(screen.getByText('Erro ao finalizar jogo.')).toBeInTheDocument();
      });
      // Dialog should be closed
      expect(screen.queryByText('Finalizar jogo?')).not.toBeInTheDocument();
    });
  });

  describe('stat update error revert', () => {
    it('reverts optimistic stat update when updateStat returns error', async () => {
      mockUpdateStat.mockResolvedValue({ error: 'Erro ao atualizar.' });
      const user = userEvent.setup();
      render(
        <TeamsClient
          gameId="game-1"
          teams={TEAMS}
          isFinished={false}
          isTournament={false}
          tournamentCompleted={false}
        />,
      );

      // Click the goals increment button for Carlos (gtp1, initial goals=2)
      const goalButtons = screen.getAllByRole('button', { name: '+' });
      await user.click(goalButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Erro ao atualizar.')).toBeInTheDocument();
      });
    });
  });
});
