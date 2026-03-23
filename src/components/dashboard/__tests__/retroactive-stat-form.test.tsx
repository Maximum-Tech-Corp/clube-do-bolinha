import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetroactiveStatForm } from '../retroactive-stat-form';

const mockAddRetroactiveStat = vi.fn();

vi.mock('@/actions/players-admin', () => ({
  addRetroactiveStat: (...args: unknown[]) => mockAddRetroactiveStat(...args),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  banPlayer: vi.fn(),
  unbanPlayer: vi.fn(),
  suspendPlayer: vi.fn(),
  removeSuspension: vi.fn(),
  listPlayers: vi.fn(),
}));

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEAR = CURRENT_YEAR - 1;

describe('RetroactiveStatForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddRetroactiveStat.mockResolvedValue({});
  });

  describe('rendering', () => {
    it('renders year, goals, and assists fields', () => {
      render(<RetroactiveStatForm playerId="player-1" />);
      expect(screen.getByLabelText('Ano')).toBeInTheDocument();
      expect(screen.getByLabelText('Gols')).toBeInTheDocument();
      expect(screen.getByLabelText('Assists')).toBeInTheDocument();
    });

    it('pre-fills year with current year minus 1', () => {
      render(<RetroactiveStatForm playerId="player-1" />);
      const yearInput = screen.getByLabelText('Ano') as HTMLInputElement;
      expect(yearInput.value).toBe(String(DEFAULT_YEAR));
    });

    it('pre-fills goals and assists with 0', () => {
      render(<RetroactiveStatForm playerId="player-1" />);
      const goalsInput = screen.getByLabelText('Gols') as HTMLInputElement;
      const assistsInput = screen.getByLabelText('Assists') as HTMLInputElement;
      expect(goalsInput.value).toBe('0');
      expect(assistsInput.value).toBe('0');
    });

    it('renders submit button', () => {
      render(<RetroactiveStatForm playerId="player-1" />);
      expect(
        screen.getByRole('button', { name: '+ Adicionar lançamento' }),
      ).toBeInTheDocument();
    });
  });

  describe('submission', () => {
    it('calls addRetroactiveStat with playerId and form values', async () => {
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" />);

      await user.clear(screen.getByLabelText('Gols'));
      await user.type(screen.getByLabelText('Gols'), '5');
      await user.clear(screen.getByLabelText('Assists'));
      await user.type(screen.getByLabelText('Assists'), '3');
      await user.click(
        screen.getByRole('button', { name: '+ Adicionar lançamento' }),
      );

      await waitFor(() => {
        expect(mockAddRetroactiveStat).toHaveBeenCalledWith({
          playerId: 'player-1',
          year: DEFAULT_YEAR,
          goals: 5,
          assists: 3,
        });
      });
    });

    it('resets form to defaults after successful submit', async () => {
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" />);

      await user.clear(screen.getByLabelText('Gols'));
      await user.type(screen.getByLabelText('Gols'), '10');
      await user.click(
        screen.getByRole('button', { name: '+ Adicionar lançamento' }),
      );

      await waitFor(() => {
        const goalsInput = screen.getByLabelText('Gols') as HTMLInputElement;
        expect(goalsInput.value).toBe('0');
      });
    });

    it('shows server error when action fails', async () => {
      mockAddRetroactiveStat.mockResolvedValue({
        error: 'Jogador não encontrado.',
      });
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" />);

      await user.click(
        screen.getByRole('button', { name: '+ Adicionar lançamento' }),
      );

      await waitFor(() => {
        expect(screen.getByText('Jogador não encontrado.')).toBeInTheDocument();
      });
    });

    it('shows year validation error when year is below minimum (line 68)', async () => {
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" />);

      fireEvent.change(screen.getByLabelText('Ano'), {
        target: { value: '1999' },
      });
      await user.click(
        screen.getByRole('button', { name: '+ Adicionar lançamento' }),
      );

      await waitFor(() => {
        expect(screen.getByText(/>=2000/)).toBeInTheDocument();
      });
      expect(mockAddRetroactiveStat).not.toHaveBeenCalled();
    });

    it('shows goals validation error when goals is negative (line 80)', async () => {
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" />);

      const goalsInput = screen.getByLabelText('Gols') as HTMLInputElement;
      goalsInput.removeAttribute('min');
      fireEvent.change(goalsInput, { target: { value: '-1' } });
      await user.click(
        screen.getByRole('button', { name: '+ Adicionar lançamento' }),
      );

      await waitFor(() => {
        expect(screen.getByText(/>=0/)).toBeInTheDocument();
      });
      expect(mockAddRetroactiveStat).not.toHaveBeenCalled();
    });

    it('shows assists validation error when assists is negative (line 92)', async () => {
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" />);

      const assistsInput = screen.getByLabelText('Assists') as HTMLInputElement;
      assistsInput.removeAttribute('min');
      fireEvent.change(assistsInput, { target: { value: '-1' } });
      await user.click(
        screen.getByRole('button', { name: '+ Adicionar lançamento' }),
      );

      await waitFor(() => {
        const errorMessages = screen.getAllByText(/>=0/);
        expect(errorMessages.length).toBeGreaterThanOrEqual(1);
      });
      expect(mockAddRetroactiveStat).not.toHaveBeenCalled();
    });

    it("shows 'Salvando...' during submission", async () => {
      mockAddRetroactiveStat.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 200)),
      );
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" />);

      await user.click(
        screen.getByRole('button', { name: '+ Adicionar lançamento' }),
      );

      expect(
        screen.getByRole('button', { name: 'Salvando...' }),
      ).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: '+ Adicionar lançamento' }),
        ).toBeInTheDocument();
      });
    });
  });
});
