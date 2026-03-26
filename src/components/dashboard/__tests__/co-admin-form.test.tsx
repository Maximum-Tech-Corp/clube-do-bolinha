import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CoAdminForm } from '../co-admin-form';

const mockSetCoAdmin = vi.fn();
const mockRemoveCoAdmin = vi.fn();
const mockRouterRefresh = vi.fn();

vi.mock('@/actions/co-admin', () => ({
  setCoAdmin: (...args: unknown[]) => mockSetCoAdmin(...args),
  removeCoAdmin: (...args: unknown[]) => mockRemoveCoAdmin(...args),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mockRouterRefresh }),
}));

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
  };
});

describe('CoAdminForm — no co-admin (empty state)', () => {
  beforeEach(() => {
    mockSetCoAdmin.mockResolvedValue({});
    mockRemoveCoAdmin.mockResolvedValue({});
  });

  it('renders email and password inputs', () => {
    render(<CoAdminForm initialEmail={null} />);

    expect(screen.getByLabelText('E-mail do co-admin')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha inicial')).toBeInTheDocument();
  });

  it('renders the Definir Co-admin button', () => {
    render(<CoAdminForm initialEmail={null} />);

    expect(
      screen.getByRole('button', { name: /definir co-admin/i }),
    ).toBeInTheDocument();
  });

  it('shows error when fields are empty on submit', async () => {
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={null} />);

    await user.click(screen.getByRole('button', { name: /definir co-admin/i }));

    expect(
      screen.getByText('Preencha o e-mail e a senha.'),
    ).toBeInTheDocument();
    expect(mockSetCoAdmin).not.toHaveBeenCalled();
  });

  it('calls setCoAdmin with email and password on submit', async () => {
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={null} />);

    await user.type(
      screen.getByLabelText('E-mail do co-admin'),
      'co@example.com',
    );
    await user.type(screen.getByLabelText('Senha inicial'), 'pass123');
    await user.click(screen.getByRole('button', { name: /definir co-admin/i }));

    await waitFor(() => {
      expect(mockSetCoAdmin).toHaveBeenCalledWith('co@example.com', 'pass123');
    });
  });

  it('calls router.refresh on successful setCoAdmin', async () => {
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={null} />);

    await user.type(
      screen.getByLabelText('E-mail do co-admin'),
      'co@example.com',
    );
    await user.type(screen.getByLabelText('Senha inicial'), 'pass123');
    await user.click(screen.getByRole('button', { name: /definir co-admin/i }));

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('shows server error returned by setCoAdmin', async () => {
    mockSetCoAdmin.mockResolvedValue({
      error: 'Este e-mail já está vinculado a outra turma de futebol.',
    });
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={null} />);

    await user.type(
      screen.getByLabelText('E-mail do co-admin'),
      'taken@example.com',
    );
    await user.type(screen.getByLabelText('Senha inicial'), 'pass123');
    await user.click(screen.getByRole('button', { name: /definir co-admin/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          'Este e-mail já está vinculado a outra turma de futebol.',
        ),
      ).toBeInTheDocument();
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });

  it("shows 'Salvando...' while submitting", async () => {
    mockSetCoAdmin.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({}), 200)),
    );
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={null} />);

    await user.type(
      screen.getByLabelText('E-mail do co-admin'),
      'co@example.com',
    );
    await user.type(screen.getByLabelText('Senha inicial'), 'pass123');
    await user.click(screen.getByRole('button', { name: /definir co-admin/i }));

    expect(screen.getByRole('button', { name: 'Salvando...' })).toBeDisabled();

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalled();
    });
  });
});

describe('CoAdminForm — co-admin exists', () => {
  const EXISTING_EMAIL = 'coadmin@example.com';

  beforeEach(() => {
    mockRemoveCoAdmin.mockResolvedValue({});
  });

  it('renders a disabled email input with the existing email', () => {
    render(<CoAdminForm initialEmail={EXISTING_EMAIL} />);

    const emailInput = screen.getByDisplayValue(EXISTING_EMAIL);
    expect(emailInput).toBeDisabled();
  });

  it('renders the Remover acesso button', () => {
    render(<CoAdminForm initialEmail={EXISTING_EMAIL} />);

    expect(
      screen.getByRole('button', { name: /remover acesso/i }),
    ).toBeInTheDocument();
  });

  it('does not render email or password input fields', () => {
    render(<CoAdminForm initialEmail={EXISTING_EMAIL} />);

    expect(screen.queryByLabelText('Senha inicial')).not.toBeInTheDocument();
  });

  it('opens confirmation dialog when Remover acesso is clicked', async () => {
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={EXISTING_EMAIL} />);

    await user.click(screen.getByRole('button', { name: /remover acesso/i }));

    expect(screen.getByTestId('dialog-content')).toBeInTheDocument();
    expect(screen.getByText(/tem certeza/i)).toBeInTheDocument();
    expect(screen.getByText(EXISTING_EMAIL)).toBeInTheDocument();
  });

  it('closes dialog when Cancelar is clicked', async () => {
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={EXISTING_EMAIL} />);

    await user.click(screen.getByRole('button', { name: /remover acesso/i }));
    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    await waitFor(() => {
      expect(screen.queryByTestId('dialog-content')).not.toBeInTheDocument();
    });
    expect(mockRemoveCoAdmin).not.toHaveBeenCalled();
  });

  it('calls removeCoAdmin when Sim, remover is clicked', async () => {
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={EXISTING_EMAIL} />);

    await user.click(screen.getByRole('button', { name: /remover acesso/i }));
    await user.click(screen.getByRole('button', { name: /sim, remover/i }));

    await waitFor(() => {
      expect(mockRemoveCoAdmin).toHaveBeenCalledTimes(1);
    });
  });

  it('calls router.refresh after successful removal', async () => {
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={EXISTING_EMAIL} />);

    await user.click(screen.getByRole('button', { name: /remover acesso/i }));
    await user.click(screen.getByRole('button', { name: /sim, remover/i }));

    await waitFor(() => {
      expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    });
  });

  it('shows server error returned by removeCoAdmin', async () => {
    mockRemoveCoAdmin.mockResolvedValue({ error: 'Erro ao remover co-admin.' });
    const user = userEvent.setup();
    render(<CoAdminForm initialEmail={EXISTING_EMAIL} />);

    await user.click(screen.getByRole('button', { name: /remover acesso/i }));
    await user.click(screen.getByRole('button', { name: /sim, remover/i }));

    await waitFor(() => {
      expect(screen.getByText('Erro ao remover co-admin.')).toBeInTheDocument();
    });
    expect(mockRouterRefresh).not.toHaveBeenCalled();
  });
});
