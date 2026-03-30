import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardMenu } from '../dashboard-menu';

const mockUpdateTeamSettings = vi.fn();
const mockCreateBillingPortalSession = vi.fn();
const mockLogout = vi.fn();
const mockChangePassword = vi.fn();
const mockSendSupportEmail = vi.fn();

vi.mock('@/actions/team', () => ({
  updateTeamSettings: (...args: unknown[]) => mockUpdateTeamSettings(...args),
  updateAccessCodePrefix: vi.fn(),
}));

vi.mock('@/actions/stripe', () => ({
  createBillingPortalSession: (...args: unknown[]) =>
    mockCreateBillingPortalSession(...args),
}));

vi.mock('@/actions/auth', () => ({
  logout: (...args: unknown[]) => mockLogout(...args),
  changePassword: (...args: unknown[]) => mockChangePassword(...args),
}));

vi.mock('@/actions/support', () => ({
  sendSupportEmail: (...args: unknown[]) => mockSendSupportEmail(...args),
}));

// Mock Select (base-ui)
vi.mock('@/components/ui/select', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Select: ({
      children,
      value,
      onValueChange,
    }: {
      children: unknown;
      value: string;
      onValueChange?: (val: string) => void;
    }) =>
      React.createElement(
        'div',
        { 'data-testid': 'select-root', 'data-value': value },
        children,
        onValueChange
          ? React.createElement('button', {
              'data-testid': 'select-change-bug',
              onClick: () => onValueChange('bug'),
            })
          : null,
        onValueChange
          ? React.createElement('button', {
              'data-testid': 'select-change-suggestion',
              onClick: () => onValueChange('suggestion'),
            })
          : null,
        onValueChange
          ? React.createElement('button', {
              'data-testid': 'select-change-complaint',
              onClick: () => onValueChange('complaint'),
            })
          : null,
        onValueChange
          ? React.createElement('button', {
              'data-testid': 'select-change-help',
              onClick: () => onValueChange('help'),
            })
          : null,
      ),
    SelectTrigger: ({ children }: { children: unknown }) =>
      React.createElement('div', { 'data-testid': 'select-trigger' }, children),
    SelectValue: () => React.createElement('span', null),
    SelectContent: ({ children }: { children: unknown }) =>
      React.createElement('div', { 'data-testid': 'select-content' }, children),
    SelectItem: ({
      children,
      value,
    }: {
      children: unknown;
      value: string;
    }) =>
      React.createElement(
        'div',
        { 'data-testid': `select-item-${value}` },
        children,
      ),
  };
});

// Mock Textarea
vi.mock('@/components/ui/textarea', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Textarea: React.forwardRef(
      (
        props: React.ComponentProps<'textarea'>,
        ref: React.Ref<HTMLTextAreaElement>,
      ) => React.createElement('textarea', { ...props, ref }),
    ),
  };
});

// Mock Radix Dialog
vi.mock('@/components/ui/dialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Dialog: ({
      children,
      open,
      onOpenChange,
    }: {
      children: unknown;
      open: boolean;
      onOpenChange?: (open: boolean) => void;
    }) =>
      open
        ? React.createElement(
            React.Fragment,
            null,
            children,
            onOpenChange
              ? React.createElement(
                  'button',
                  {
                    'data-testid': 'dialog-close',
                    onClick: () => onOpenChange(false),
                  },
                  'Fechar dialog',
                )
              : null,
          )
        : null,
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

const DEFAULT_PROPS = {
  appUrl: 'https://clube.app',
  teamName: 'Bolinha FC',
  matchDurationMinutes: 20,
  isCoAdmin: false,
};

describe('DashboardMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTeamSettings.mockResolvedValue({});
    mockCreateBillingPortalSession.mockResolvedValue(undefined);
    mockLogout.mockResolvedValue(undefined);
    mockChangePassword.mockResolvedValue({ success: true });
    mockSendSupportEmail.mockResolvedValue({ success: true });
  });

  describe('menu button', () => {
    it('renders the 3-dot menu button', () => {
      render(<DashboardMenu {...DEFAULT_PROPS} />);
      expect(screen.getByRole('button', { name: 'Menu' })).toBeInTheDocument();
    });

    it('menu is closed by default', () => {
      render(<DashboardMenu {...DEFAULT_PROPS} />);
      expect(screen.queryByText('Compartilhar')).not.toBeInTheDocument();
    });

    it('opens menu on button click', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(screen.getByText('Compartilhar')).toBeInTheDocument();
      expect(screen.getByText('Configurações')).toBeInTheDocument();
    });

    it('closes menu when clicking outside', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      expect(screen.getByText('Compartilhar')).toBeInTheDocument();

      // Click outside
      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByText('Compartilhar')).not.toBeInTheDocument();
      });
    });
  });

  describe('minha assinatura', () => {
    it('shows Minha Assinatura button in menu', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(
        screen.getByRole('button', { name: /minha assinatura/i }),
      ).toBeInTheDocument();
    });

    it('calls createBillingPortalSession when clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.click(
        screen.getByRole('button', { name: /minha assinatura/i }),
      );

      await waitFor(() => {
        expect(mockCreateBillingPortalSession).toHaveBeenCalledTimes(1);
      });
    });

    it('closes menu when Minha Assinatura is clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.click(
        screen.getByRole('button', { name: /minha assinatura/i }),
      );

      await waitFor(() => {
        expect(
          screen.queryByRole('link', { name: /compartilhar/i }),
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('logout', () => {
    it('shows Sair button in menu', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(screen.getByRole('button', { name: /sair/i })).toBeInTheDocument();
    });

    it('calls logout when Sair is clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.click(screen.getByRole('button', { name: /sair/i }));

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('share link', () => {
    it('shows WhatsApp share link in menu', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const shareLink = screen.getByRole('link', { name: /compartilhar/i });
      expect(shareLink.getAttribute('href')).toContain('wa.me');
    });

    it('share link contains the app URL', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const shareLink = screen.getByRole('link', { name: /compartilhar/i });
      expect(
        decodeURIComponent(shareLink.getAttribute('href') ?? ''),
      ).toContain('https://clube.app');
    });
  });

  describe('trocar senha', () => {
    async function openChangePassword(
      user: ReturnType<typeof userEvent.setup>,
    ) {
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.click(screen.getByRole('button', { name: /trocar senha/i }));
    }

    it('shows Trocar Senha button in menu', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(
        screen.getByRole('button', { name: /trocar senha/i }),
      ).toBeInTheDocument();
    });

    it('opens change password dialog when Trocar Senha is clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openChangePassword(user);

      expect(screen.getByLabelText('Senha atual')).toBeInTheDocument();
      expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
      expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
    });

    it('closes menu when Trocar Senha is clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openChangePassword(user);

      expect(screen.queryByText('Compartilhar')).not.toBeInTheDocument();
    });

    it('calls changePassword with current and new passwords on submit', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openChangePassword(user);

      await user.type(screen.getByLabelText('Senha atual'), 'oldpass123');
      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'newpass123',
      );
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith(
          'oldpass123',
          'newpass123',
        );
      });
    });

    it("shows 'As senhas não coincidem' when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openChangePassword(user);

      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'different',
      );
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('shows error when new password is too short', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openChangePassword(user);

      await user.type(screen.getByLabelText('Nova senha'), '123');
      await user.type(screen.getByLabelText('Confirmar nova senha'), '123');
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(
        screen.getByText('A nova senha deve ter pelo menos 6 caracteres'),
      ).toBeInTheDocument();
      expect(mockChangePassword).not.toHaveBeenCalled();
    });

    it('shows server error returned by changePassword action', async () => {
      mockChangePassword.mockResolvedValueOnce({
        error: 'Senha atual incorreta.',
      });
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openChangePassword(user);

      await user.type(screen.getByLabelText('Senha atual'), 'wrongpass');
      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'newpass123',
      );
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => {
        expect(screen.getByText('Senha atual incorreta.')).toBeInTheDocument();
      });
    });

    it("shows 'Senha alterada!' on success", async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openChangePassword(user);

      await user.type(screen.getByLabelText('Senha atual'), 'oldpass123');
      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'newpass123',
      );
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Senha alterada!' }),
        ).toBeInTheDocument();
      });
    });

    it('resets fields and errors when dialog is closed via onOpenChange', async () => {
      mockChangePassword.mockResolvedValueOnce({
        error: 'Senha atual incorreta.',
      });
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openChangePassword(user);
      await user.type(screen.getByLabelText('Senha atual'), 'wrongpass');
      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'newpass123',
      );
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      await waitFor(() => {
        expect(screen.getByText('Senha atual incorreta.')).toBeInTheDocument();
      });

      // Close via onOpenChange (simulates clicking outside or pressing Escape in Radix)
      const closeButtons = screen.getAllByTestId('dialog-close');
      await user.click(closeButtons[closeButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument();
      });

      // Reopen — fields and error must be cleared
      await openChangePassword(user);

      expect(
        screen.queryByText('Senha atual incorreta.'),
      ).not.toBeInTheDocument();
      expect(
        (screen.getByLabelText('Senha atual') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('Nova senha') as HTMLInputElement).value,
      ).toBe('');
      expect(
        (screen.getByLabelText('Confirmar nova senha') as HTMLInputElement)
          .value,
      ).toBe('');
    });

    it("shows 'Salvando...' during submission", async () => {
      mockChangePassword.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ success: true }), 200),
          ),
      );
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openChangePassword(user);
      await user.type(screen.getByLabelText('Senha atual'), 'oldpass123');
      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'newpass123',
      );
      await user.click(screen.getByRole('button', { name: 'Salvar' }));

      expect(
        screen.getByRole('button', { name: 'Salvando...' }),
      ).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Senha alterada!' }),
        ).toBeInTheDocument();
      });
    });
  });

  describe('co-admin menu item', () => {
    it('shows Defina Co-admin link for main admin', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} isCoAdmin={false} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(
        screen.getByRole('link', { name: /defina co-admin/i }),
      ).toBeInTheDocument();
    });

    it('hides Defina Co-admin link for co-admin', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} isCoAdmin={true} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(
        screen.queryByRole('link', { name: /defina co-admin/i }),
      ).not.toBeInTheDocument();
    });

    it('Defina Co-admin link points to /dashboard/co-admin', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} isCoAdmin={false} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      const link = screen.getByRole('link', { name: /defina co-admin/i });
      expect(link.getAttribute('href')).toBe('/dashboard/co-admin');
    });
  });

  describe('suporte', () => {
    async function openSupport(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.click(screen.getByRole('button', { name: /suporte/i }));
    }

    it('shows Suporte button in menu', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await user.click(screen.getByRole('button', { name: 'Menu' }));

      expect(screen.getByRole('button', { name: /suporte/i })).toBeInTheDocument();
    });

    it('opens support dialog when Suporte is clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSupport(user);

      expect(screen.getByLabelText('Mensagem')).toBeInTheDocument();
      expect(screen.getByTestId('select-root')).toBeInTheDocument();
    });

    it('closes menu when Suporte is clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSupport(user);

      expect(screen.queryByText('Compartilhar')).not.toBeInTheDocument();
    });

    it('calls sendSupportEmail with correct data on submit', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSupport(user);

      await user.type(screen.getByLabelText('Mensagem'), 'O app travou ao confirmar');
      await user.click(screen.getByRole('button', { name: 'Enviar' }));

      await waitFor(() => {
        expect(mockSendSupportEmail).toHaveBeenCalledWith({
          type: 'bug',
          message: 'O app travou ao confirmar',
        });
      });
    });

    it('calls sendSupportEmail with suggestion type when changed', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSupport(user);

      await user.click(screen.getByTestId('select-change-suggestion'));
      await user.type(screen.getByLabelText('Mensagem'), 'Adicionar ranking');
      await user.click(screen.getByRole('button', { name: 'Enviar' }));

      await waitFor(() => {
        expect(mockSendSupportEmail).toHaveBeenCalledWith({
          type: 'suggestion',
          message: 'Adicionar ranking',
        });
      });
    });

    it("shows 'Enviando...' during submission", async () => {
      mockSendSupportEmail.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({ success: true }), 200)),
      );
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSupport(user);
      await user.type(screen.getByLabelText('Mensagem'), 'Teste de loading');
      await user.click(screen.getByRole('button', { name: 'Enviar' }));

      expect(screen.getByRole('button', { name: 'Enviando...' })).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Enviado!' })).toBeInTheDocument();
      });
    });

    it("shows 'Enviado!' on success", async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSupport(user);
      await user.type(screen.getByLabelText('Mensagem'), 'Tudo ok');
      await user.click(screen.getByRole('button', { name: 'Enviar' }));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Enviado!' })).toBeInTheDocument();
      });
    });

    it('shows error when sendSupportEmail fails', async () => {
      mockSendSupportEmail.mockResolvedValueOnce({
        error: 'Não foi possível enviar. Tente novamente.',
      });
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSupport(user);
      await user.type(screen.getByLabelText('Mensagem'), 'Mensagem de erro');
      await user.click(screen.getByRole('button', { name: 'Enviar' }));

      await waitFor(() => {
        expect(
          screen.getByText('Não foi possível enviar. Tente novamente.'),
        ).toBeInTheDocument();
      });
    });

    it('resets fields when dialog is closed', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSupport(user);
      await user.type(screen.getByLabelText('Mensagem'), 'Conteúdo digitado');

      const closeButtons = screen.getAllByTestId('dialog-close');
      await user.click(closeButtons[closeButtons.length - 1]);

      await waitFor(() => {
        expect(screen.queryByLabelText('Mensagem')).not.toBeInTheDocument();
      });

      await openSupport(user);

      expect((screen.getByLabelText('Mensagem') as HTMLTextAreaElement).value).toBe('');
    });
  });

  describe('settings dialog', () => {
    async function openSettings(user: ReturnType<typeof userEvent.setup>) {
      await user.click(screen.getByRole('button', { name: 'Menu' }));
      await user.click(screen.getByRole('button', { name: /configurações/i }));
    }

    it('opens settings dialog when Configurações is clicked', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSettings(user);

      expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    });

    it('shows team name input pre-filled', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSettings(user);

      const nameInput = screen.getByLabelText(
        'Nome da turma',
      ) as HTMLInputElement;
      expect(nameInput.value).toBe('Bolinha FC');
    });

    it('shows duration input pre-filled', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSettings(user);

      const durationInput = screen.getByLabelText(
        'Tempo das partidas (minutos)',
      ) as HTMLInputElement;
      expect(durationInput.value).toBe('20');
    });

    it('calls updateTeamSettings with updated values on save', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSettings(user);

      const nameInput = screen.getByLabelText('Nome da turma');
      await user.clear(nameInput);
      await user.type(nameInput, 'Nova Turma');
      await user.click(screen.getByRole('button', { name: 'Atualizar' }));

      await waitFor(() => {
        expect(mockUpdateTeamSettings).toHaveBeenCalledWith(
          expect.objectContaining({
            teamName: 'Nova Turma',
            matchDurationMinutes: 20,
          }),
        );
      });
    });

    it("shows 'Salvo!' after successful save", async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSettings(user);
      await user.click(screen.getByRole('button', { name: 'Atualizar' }));

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Salvo!' }),
        ).toBeInTheDocument();
      });
    });

    it('does not call updateTeamSettings when team name is empty', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSettings(user);

      const nameInput = screen.getByLabelText('Nome da turma');
      await user.clear(nameInput);
      await user.click(screen.getByRole('button', { name: 'Atualizar' }));

      expect(mockUpdateTeamSettings).not.toHaveBeenCalled();
    });

    it('does not call updateTeamSettings when duration is less than 1', async () => {
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSettings(user);

      const durationInput = screen.getByLabelText(
        'Tempo das partidas (minutos)',
      );
      await user.clear(durationInput);
      await user.type(durationInput, '0');
      await user.click(screen.getByRole('button', { name: 'Atualizar' }));

      expect(mockUpdateTeamSettings).not.toHaveBeenCalled();
    });

    it("shows 'Salvando...' during save", async () => {
      mockUpdateTeamSettings.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve({}), 200)),
      );
      const user = userEvent.setup();
      render(<DashboardMenu {...DEFAULT_PROPS} />);

      await openSettings(user);
      await user.click(screen.getByRole('button', { name: 'Atualizar' }));

      expect(
        screen.getByRole('button', { name: 'Salvando...' }),
      ).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: 'Salvo!' }),
        ).toBeInTheDocument();
      });
    });
  });
});
