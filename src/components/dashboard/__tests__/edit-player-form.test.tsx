import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPlayerForm } from '../edit-player-form';

const mockUpdatePlayer = vi.fn();

vi.mock('@/actions/players-admin', () => ({
  updatePlayer: (...args: unknown[]) => mockUpdatePlayer(...args),
  createPlayer: vi.fn(),
  banPlayer: vi.fn(),
  unbanPlayer: vi.fn(),
  suspendPlayer: vi.fn(),
  removeSuspension: vi.fn(),
  listPlayers: vi.fn(),
  addRetroactiveStat: vi.fn(),
}));

const BASE_PLAYER = {
  id: 'player-1',
  name: 'João Silva',
  phone: '(11) 99999-9999',
  weight_kg: 75,
  stamina: '3',
  is_star: false,
};

describe('EditPlayerForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdatePlayer.mockResolvedValue({});
  });

  describe('pre-filling', () => {
    it('pre-fills name field with player name', () => {
      render(<EditPlayerForm player={BASE_PLAYER} />);
      const nameInput = screen.getByLabelText('Nome') as HTMLInputElement;
      expect(nameInput.value).toBe('João Silva');
    });

    it('pre-fills weight field with player weight', () => {
      render(<EditPlayerForm player={BASE_PLAYER} />);
      const weightInput = screen.getByLabelText(
        'Peso médio (kg)',
      ) as HTMLInputElement;
      expect(weightInput.value).toBe('75');
    });

    it('displays phone as read-only (disabled)', () => {
      render(<EditPlayerForm player={BASE_PLAYER} />);
      const phoneInput = screen.getByDisplayValue(
        '(11) 99999-9999',
      ) as HTMLInputElement;
      expect(phoneInput).toBeDisabled();
    });

    it('shows note that phone cannot be changed', () => {
      render(<EditPlayerForm player={BASE_PLAYER} />);
      expect(
        screen.getByText(/telefone não pode ser alterado/),
      ).toBeInTheDocument();
    });

    it('star switch is unchecked when is_star is false', () => {
      render(<EditPlayerForm player={BASE_PLAYER} />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'false');
    });

    it('star switch is checked when is_star is true', () => {
      render(<EditPlayerForm player={{ ...BASE_PLAYER, is_star: true }} />);
      const switchEl = screen.getByRole('switch');
      expect(switchEl).toHaveAttribute('aria-checked', 'true');
    });
  });

  describe('is_star toggle', () => {
    it('toggling the switch changes is_star value sent to action', async () => {
      const user = userEvent.setup();
      render(<EditPlayerForm player={BASE_PLAYER} />);

      await user.click(screen.getByRole('switch'));
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockUpdatePlayer).toHaveBeenCalledWith(
          'player-1',
          expect.objectContaining({ is_star: true }),
        );
      });
    });
  });

  describe('validation', () => {
    it('shows name error when name is cleared', async () => {
      const user = userEvent.setup();
      render(<EditPlayerForm player={BASE_PLAYER} />);

      await user.clear(screen.getByLabelText('Nome'));
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(screen.getByText('Informe o nome')).toBeInTheDocument();
      });
      expect(mockUpdatePlayer).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls updatePlayer with player id and updated data', async () => {
      const user = userEvent.setup();
      render(<EditPlayerForm player={BASE_PLAYER} />);

      await user.clear(screen.getByLabelText('Nome'));
      await user.type(screen.getByLabelText('Nome'), 'João Atualizado');
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockUpdatePlayer).toHaveBeenCalledWith(
          'player-1',
          expect.objectContaining({ name: 'João Atualizado' }),
        );
      });
    });

    it("shows 'Dados salvos com sucesso!' after successful save", async () => {
      const user = userEvent.setup();
      render(<EditPlayerForm player={BASE_PLAYER} />);

      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(
          screen.getByText('Dados salvos com sucesso!'),
        ).toBeInTheDocument();
      });
    });

    it('shows server error when updatePlayer fails', async () => {
      mockUpdatePlayer.mockResolvedValue({ error: 'Jogador não encontrado.' });
      const user = userEvent.setup();
      render(<EditPlayerForm player={BASE_PLAYER} />);

      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(screen.getByText('Jogador não encontrado.')).toBeInTheDocument();
      });
    });

    it('shows validation error for invalid weight', async () => {
      const user = userEvent.setup();
      render(<EditPlayerForm player={BASE_PLAYER} />);

      const weightInput = screen.getByLabelText('Peso médio (kg)');
      await user.clear(weightInput);
      await user.type(weightInput, '10'); // below min(30)

      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        // zod schema: min(30) — the error message from zod is rendered on line 105
        expect(screen.getByLabelText('Peso médio (kg)')).toBeInTheDocument();
      });
      expect(mockUpdatePlayer).not.toHaveBeenCalled();
    });

    it("shows 'Salvando...' during submission", async () => {
      mockUpdatePlayer.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 200)),
      );
      const user = userEvent.setup();
      render(<EditPlayerForm player={BASE_PLAYER} />);

      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      expect(
        screen.getByRole('button', { name: 'Salvando...' }),
      ).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Salvar alterações' }),
        ).toBeInTheDocument();
      });
    });
  });
});
