import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PlayerSelfEditForm } from '../player-self-edit-form';

const mockUpdatePlayerSelf = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/actions/player', () => ({
  updatePlayerSelf: (...args: unknown[]) => mockUpdatePlayerSelf(...args),
  clearPlayerCookie: vi.fn(),
  identifyPlayer: vi.fn(),
  registerPlayer: vi.fn(),
  confirmPresence: vi.fn(),
  cancelPresence: vi.fn(),
  validateTeamCode: vi.fn(),
  saveLastTeamCode: vi.fn(),
  clearLastTeamCode: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    success: (...args: unknown[]) => mockToastSuccess(...args),
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

vi.mock('@/components/ui/select', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Select: ({
      children,
      onValueChange,
    }: {
      children: unknown;
      onValueChange?: (v: string) => void;
    }) =>
      React.createElement(
        'select',
        {
          onChange: (e: React.ChangeEvent<HTMLSelectElement>) =>
            onValueChange?.(e.target.value),
        },
        children,
      ),
    SelectTrigger: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    SelectValue: ({ placeholder }: { placeholder?: string }) =>
      React.createElement('option', { value: '' }, placeholder ?? ''),
    SelectContent: ({ children }: { children: unknown }) =>
      React.createElement(React.Fragment, null, children),
    SelectItem: ({ value, children }: { value: string; children: unknown }) =>
      React.createElement('option', { value }, children),
  };
});

const BASE_PLAYER = {
  name: 'Carlos Ramos',
  phone: '11988887777',
  weight_kg: 75,
  stamina: '3',
  position: null as null,
  is_star: false,
};

describe('PlayerSelfEditForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdatePlayerSelf.mockResolvedValue({});
  });

  describe('rendering', () => {
    it('renders name field with player name', () => {
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);
      const nameInput = screen.getByLabelText('Nome') as HTMLInputElement;
      expect(nameInput.value).toBe('Carlos Ramos');
    });

    it('renders editable phone field with mask (11 digits)', () => {
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);
      const phoneInput = screen.getByLabelText('Celular') as HTMLInputElement;
      expect(phoneInput.value).toBe('(11) 98888-7777');
      expect(phoneInput).not.toBeDisabled();
    });

    it('renders phone mask for 10-digit number', () => {
      render(
        <PlayerSelfEditForm
          player={{ ...BASE_PLAYER, phone: '1188887777' }}
          teamId="team-1"
        />,
      );
      expect(screen.getByDisplayValue('(11) 8888-7777')).toBeInTheDocument();
    });

    it('renders phone mask for 3-to-6-digit number', () => {
      render(
        <PlayerSelfEditForm
          player={{ ...BASE_PLAYER, phone: '119' }}
          teamId="team-1"
        />,
      );
      expect(screen.getByDisplayValue('(11) 9')).toBeInTheDocument();
    });

    it('renders phone mask for 1-to-2-digit number', () => {
      render(
        <PlayerSelfEditForm
          player={{ ...BASE_PLAYER, phone: '11' }}
          teamId="team-1"
        />,
      );
      expect(screen.getByDisplayValue('(11')).toBeInTheDocument();
    });

    it('renders empty string for empty phone', () => {
      render(
        <PlayerSelfEditForm
          player={{ ...BASE_PLAYER, phone: '' }}
          teamId="team-1"
        />,
      );
      const phoneInput = screen.getByLabelText('Celular') as HTMLInputElement;
      expect(phoneInput.value).toBe('');
    });

    it('renders weight field with player weight', () => {
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);
      const weightInput = screen.getByLabelText(
        'Seu peso (kg)',
      ) as HTMLInputElement;
      expect(weightInput.value).toBe('75');
    });

    it('renders only the position select', () => {
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);
      expect(screen.getAllByRole('combobox')).toHaveLength(1);
    });

    it('does not render is_star toggle', () => {
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);
      expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    });

    it('renders submit button', () => {
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);
      expect(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      ).toBeInTheDocument();
    });
  });

  describe('phone field interaction', () => {
    it('applies mask as user types a new phone number', async () => {
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      const phoneInput = screen.getByLabelText('Celular');
      await user.clear(phoneInput);
      await user.type(phoneInput, '11977776666');

      expect((phoneInput as HTMLInputElement).value).toBe('(11) 97777-6666');
    });

    it('shows error when phone is too short', async () => {
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      const phoneInput = screen.getByLabelText('Celular');
      await user.clear(phoneInput);
      await user.type(phoneInput, '1199');
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(
          screen.getByText('Informe um celular válido'),
        ).toBeInTheDocument();
      });
      expect(mockUpdatePlayerSelf).not.toHaveBeenCalled();
    });

    it('sends updated phone digits to updatePlayerSelf', async () => {
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      const phoneInput = screen.getByLabelText('Celular');
      await user.clear(phoneInput);
      await user.type(phoneInput, '11977776666');
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockUpdatePlayerSelf).toHaveBeenCalledWith(
          'team-1',
          expect.objectContaining({ phone: '11977776666' }),
        );
      });
    });

    it('shows error toast when phone is already taken', async () => {
      mockUpdatePlayerSelf.mockResolvedValue({
        error: 'Este número já está cadastrado nesta turma.',
      });
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith(
          'Este número já está cadastrado nesta turma.',
        );
      });
    });
  });

  describe('validation', () => {
    it('does not call updatePlayerSelf when weight is out of range', async () => {
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      await user.clear(screen.getByLabelText('Seu peso (kg)'));
      await user.type(screen.getByLabelText('Seu peso (kg)'), '10');
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockUpdatePlayerSelf).not.toHaveBeenCalled();
      });
    });

    it('shows weight_kg error message when weight is out of range', async () => {
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      await user.clear(screen.getByLabelText('Seu peso (kg)'));
      await user.type(screen.getByLabelText('Seu peso (kg)'), '10');
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        const errors = document.querySelectorAll('.text-destructive');
        expect(errors.length).toBeGreaterThan(0);
      });
    });

    it('shows error when name is too short', async () => {
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      await user.clear(screen.getByLabelText('Nome'));
      await user.type(screen.getByLabelText('Nome'), 'A');
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(screen.getByText('Informe o nome')).toBeInTheDocument();
      });
      expect(mockUpdatePlayerSelf).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls updatePlayerSelf with correct data', async () => {
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      await user.clear(screen.getByLabelText('Nome'));
      await user.type(screen.getByLabelText('Nome'), 'Novo Nome');
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockUpdatePlayerSelf).toHaveBeenCalledWith(
          'team-1',
          expect.objectContaining({
            name: 'Novo Nome',
            phone: '11988887777',
            weight_kg: 75,
            position: null,
            is_star: false,
          }),
        );
      });
    });

    it('sends selected position', async () => {
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      await user.selectOptions(screen.getAllByRole('combobox')[0], 'atacante');
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockUpdatePlayerSelf).toHaveBeenCalledWith(
          'team-1',
          expect.objectContaining({ position: 'atacante' }),
        );
      });
    });

    it('sends null position when empty option is selected', async () => {
      const user = userEvent.setup();
      render(
        <PlayerSelfEditForm
          player={{ ...BASE_PLAYER, position: 'zagueiro' as const }}
          teamId="team-1"
        />,
      );

      await user.selectOptions(screen.getAllByRole('combobox')[0], '');
      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockUpdatePlayerSelf).toHaveBeenCalledWith(
          'team-1',
          expect.objectContaining({ position: null }),
        );
      });
    });

    it('shows success toast after save', async () => {
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockToastSuccess).toHaveBeenCalledWith(
          'Dados salvos com sucesso!',
        );
      });
    });

    it('shows error toast on failure', async () => {
      mockUpdatePlayerSelf.mockResolvedValue({ error: 'Erro ao salvar dados.' });
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

      await user.click(
        screen.getByRole('button', { name: 'Salvar alterações' }),
      );

      await waitFor(() => {
        expect(mockToastError).toHaveBeenCalledWith('Erro ao salvar dados.');
      });
    });

    it("shows 'Salvando...' loading state during submission", async () => {
      mockUpdatePlayerSelf.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 200)),
      );
      const user = userEvent.setup();
      render(<PlayerSelfEditForm player={BASE_PLAYER} teamId="team-1" />);

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
