import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RetroactiveStatForm } from '../retroactive-stat-form';

const mockAddRetroactiveStat = vi.fn();
const mockDeleteRetroactiveStat = vi.fn();

vi.mock('@/actions/players-admin', () => ({
  addRetroactiveStat: (...args: unknown[]) => mockAddRetroactiveStat(...args),
  deleteRetroactiveStat: (...args: unknown[]) =>
    mockDeleteRetroactiveStat(...args),
  createPlayer: vi.fn(),
  updatePlayer: vi.fn(),
  banPlayer: vi.fn(),
  unbanPlayer: vi.fn(),
  suspendPlayer: vi.fn(),
  removeSuspension: vi.fn(),
  listPlayers: vi.fn(),
}));

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
    DialogFooter: ({ children }: { children: unknown }) =>
      React.createElement('div', null, children),
  };
});

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_YEAR = CURRENT_YEAR - 1;

const STATS = [
  { id: 'stat-1', year: 2023, goals: 5, assists: 3 },
  { id: 'stat-2', year: 2022, goals: 0, assists: 1 },
];

describe('RetroactiveStatForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddRetroactiveStat.mockResolvedValue({});
    mockDeleteRetroactiveStat.mockResolvedValue({});
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

    it('renders green Adicionar submit button', () => {
      render(<RetroactiveStatForm playerId="player-1" />);
      expect(
        screen.getByRole('button', { name: 'Adicionar' }),
      ).toBeInTheDocument();
    });

    it('renders each stat row when stats are provided', () => {
      render(<RetroactiveStatForm playerId="player-1" stats={STATS} />);
      expect(screen.getByText('2023')).toBeInTheDocument();
      expect(screen.getByText('2022')).toBeInTheDocument();
      expect(screen.getByText('5 gols')).toBeInTheDocument();
      expect(screen.getByText('3 assists')).toBeInTheDocument();
    });

    it('renders a delete button for each stat row', () => {
      render(<RetroactiveStatForm playerId="player-1" stats={STATS} />);
      const deleteButtons = screen.getAllByRole('button', {
        name: 'Remover lançamento',
      });
      expect(deleteButtons).toHaveLength(2);
    });

    it('renders no stat rows when stats is empty', () => {
      render(<RetroactiveStatForm playerId="player-1" stats={[]} />);
      expect(
        screen.queryByRole('button', { name: 'Remover lançamento' }),
      ).not.toBeInTheDocument();
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
      await user.click(screen.getByRole('button', { name: 'Adicionar' }));

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
      await user.click(screen.getByRole('button', { name: 'Adicionar' }));

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

      await user.click(screen.getByRole('button', { name: 'Adicionar' }));

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
      await user.click(screen.getByRole('button', { name: 'Adicionar' }));

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
      await user.click(screen.getByRole('button', { name: 'Adicionar' }));

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
      await user.click(screen.getByRole('button', { name: 'Adicionar' }));

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

      await user.click(screen.getByRole('button', { name: 'Adicionar' }));

      expect(
        screen.getByRole('button', { name: 'Salvando...' }),
      ).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Adicionar' }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('delete stat', () => {
    it('opens confirmation dialog when delete button is clicked', async () => {
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" stats={STATS} />);

      expect(
        screen.queryByTestId('dialog-content'),
      ).not.toBeInTheDocument();

      const [firstDeleteBtn] = screen.getAllByRole('button', {
        name: 'Remover lançamento',
      });
      await user.click(firstDeleteBtn);

      expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
      expect(screen.getByText('Remover lançamento?')).toBeInTheDocument();
    });

    it('closes dialog on Cancelar without calling delete', async () => {
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" stats={STATS} />);

      const [firstDeleteBtn] = screen.getAllByRole('button', {
        name: 'Remover lançamento',
      });
      await user.click(firstDeleteBtn);
      await user.click(screen.getByRole('button', { name: 'Cancelar' }));

      await waitFor(() => {
        expect(
          screen.queryByTestId('dialog-content'),
        ).not.toBeInTheDocument();
      });
      expect(mockDeleteRetroactiveStat).not.toHaveBeenCalled();
    });

    it('calls deleteRetroactiveStat with correct id on Remover', async () => {
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" stats={STATS} />);

      const [firstDeleteBtn] = screen.getAllByRole('button', {
        name: 'Remover lançamento',
      });
      await user.click(firstDeleteBtn);
      await user.click(screen.getByRole('button', { name: 'Remover' }));

      await waitFor(() => {
        expect(mockDeleteRetroactiveStat).toHaveBeenCalledWith('stat-1');
      });
    });

    it("shows 'Removendo...' and disables buttons during delete", async () => {
      mockDeleteRetroactiveStat.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 200)),
      );
      const user = userEvent.setup();
      render(<RetroactiveStatForm playerId="player-1" stats={STATS} />);

      const [firstDeleteBtn] = screen.getAllByRole('button', {
        name: 'Remover lançamento',
      });
      await user.click(firstDeleteBtn);
      await user.click(screen.getByRole('button', { name: 'Remover' }));

      expect(
        screen.getByRole('button', { name: 'Removendo...' }),
      ).toBeDisabled();
      expect(
        screen.getByRole('button', { name: 'Cancelar' }),
      ).toBeDisabled();
    });
  });
});
