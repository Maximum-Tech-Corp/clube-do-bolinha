import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TournamentToggle } from '../tournament-toggle';

const mockToggleTournament = vi.fn();

vi.mock('@/actions/games-admin', () => ({
  toggleTournament: (...args: unknown[]) => mockToggleTournament(...args),
  createGame: vi.fn(),
  cancelGame: vi.fn(),
  listGames: vi.fn(),
  removeConfirmedPlayer: vi.fn(),
  promoteWaitlistPlayer: vi.fn(),
  addPlayerToGame: vi.fn(),
  createAndAddPlayer: vi.fn(),
}));

vi.mock('@/components/ui/switch', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Switch: ({
      checked,
      onCheckedChange,
      disabled,
      id,
    }: {
      checked: boolean;
      onCheckedChange: (v: boolean) => void;
      disabled?: boolean;
      id?: string;
    }) =>
      React.createElement('input', {
        type: 'checkbox',
        id,
        checked,
        disabled,
        'data-testid': 'tournament-switch',
        onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
          onCheckedChange(e.target.checked),
        readOnly: false,
      }),
  };
});

describe('TournamentToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToggleTournament.mockResolvedValue({});
  });

  describe('rendering', () => {
    it('renders the switch and label', () => {
      render(<TournamentToggle gameId="game-1" isTournament={false} />);
      expect(screen.getByTestId('tournament-switch')).toBeInTheDocument();
      expect(screen.getByText('Modo campeonato')).toBeInTheDocument();
    });

    it('switch is unchecked when isTournament=false', () => {
      render(<TournamentToggle gameId="game-1" isTournament={false} />);
      const checkbox = screen.getByTestId(
        'tournament-switch',
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('switch is checked when isTournament=true', () => {
      render(<TournamentToggle gameId="game-1" isTournament={true} />);
      const checkbox = screen.getByTestId(
        'tournament-switch',
      ) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });
  });

  describe('interaction', () => {
    it('calls toggleTournament with gameId and true when toggled on', async () => {
      const user = userEvent.setup();
      render(<TournamentToggle gameId="game-1" isTournament={false} />);

      await user.click(screen.getByTestId('tournament-switch'));

      await waitFor(() => {
        expect(mockToggleTournament).toHaveBeenCalledWith('game-1', true);
      });
    });

    it('calls toggleTournament with gameId and false when toggled off', async () => {
      const user = userEvent.setup();
      render(<TournamentToggle gameId="game-1" isTournament={true} />);

      await user.click(screen.getByTestId('tournament-switch'));

      await waitFor(() => {
        expect(mockToggleTournament).toHaveBeenCalledWith('game-1', false);
      });
    });

    it('shows error message when action fails', async () => {
      mockToggleTournament.mockResolvedValue({
        error: 'O sorteio ainda não foi realizado.',
      });
      const user = userEvent.setup();
      render(<TournamentToggle gameId="game-1" isTournament={false} />);

      await user.click(screen.getByTestId('tournament-switch'));

      await waitFor(() => {
        expect(
          screen.getByText('O sorteio ainda não foi realizado.'),
        ).toBeInTheDocument();
      });
    });

    it('reverts switch state on error', async () => {
      mockToggleTournament.mockResolvedValue({ error: 'Jogo cancelado.' });
      const user = userEvent.setup();
      render(<TournamentToggle gameId="game-1" isTournament={false} />);

      await user.click(screen.getByTestId('tournament-switch'));

      await waitFor(() => {
        const checkbox = screen.getByTestId(
          'tournament-switch',
        ) as HTMLInputElement;
        expect(checkbox.checked).toBe(false);
      });
    });
  });
});
