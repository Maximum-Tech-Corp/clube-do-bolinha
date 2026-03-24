import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RedefinirSenhaForm } from '../redefinir-senha-form';

const mockUpdatePassword = vi.fn();

vi.mock('@/actions/auth', () => ({
  updatePassword: (...args: unknown[]) => mockUpdatePassword(...args),
}));

describe('RedefinirSenhaForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // updatePassword redirects on success, so it returns nothing (undefined)
    mockUpdatePassword.mockResolvedValue(undefined);
  });

  it('renders new password and confirm password fields', () => {
    render(<RedefinirSenhaForm />);
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<RedefinirSenhaForm />);
    expect(
      screen.getByRole('button', { name: /salvar nova senha/i }),
    ).toBeInTheDocument();
  });

  describe('validation', () => {
    it('shows error when password is too short', async () => {
      const user = userEvent.setup();
      const { container } = render(<RedefinirSenhaForm />);

      await user.type(screen.getByLabelText('Nova senha'), '123');
      await user.type(screen.getByLabelText('Confirmar nova senha'), '123');
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(
          screen.getByText('A senha deve ter pelo menos 6 caracteres'),
        ).toBeInTheDocument();
      });
      expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it("shows 'As senhas não coincidem' when passwords do not match", async () => {
      const user = userEvent.setup();
      render(<RedefinirSenhaForm />);

      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'different',
      );
      await user.click(
        screen.getByRole('button', { name: /salvar nova senha/i }),
      );

      await waitFor(() => {
        expect(screen.getByText('As senhas não coincidem')).toBeInTheDocument();
      });
      expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('shows error when both fields are empty', async () => {
      const user = userEvent.setup();
      render(<RedefinirSenhaForm />);

      await user.click(
        screen.getByRole('button', { name: /salvar nova senha/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText('A senha deve ter pelo menos 6 caracteres'),
        ).toBeInTheDocument();
      });
    });
  });

  describe('submission', () => {
    it('calls updatePassword with the new password', async () => {
      const user = userEvent.setup();
      render(<RedefinirSenhaForm />);

      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'newpass123',
      );
      await user.click(
        screen.getByRole('button', { name: /salvar nova senha/i }),
      );

      await waitFor(() => {
        expect(mockUpdatePassword).toHaveBeenCalledWith('newpass123');
      });
    });

    it('shows server error when action returns error', async () => {
      mockUpdatePassword.mockResolvedValue({
        error: 'Não foi possível atualizar a senha. Tente novamente.',
      });
      const user = userEvent.setup();
      render(<RedefinirSenhaForm />);

      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'newpass123',
      );
      await user.click(
        screen.getByRole('button', { name: /salvar nova senha/i }),
      );

      await waitFor(() => {
        expect(
          screen.getByText(
            'Não foi possível atualizar a senha. Tente novamente.',
          ),
        ).toBeInTheDocument();
      });
    });

    it("shows 'Salvando...' loading state during submission", async () => {
      mockUpdatePassword.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(undefined), 200)),
      );
      const user = userEvent.setup();
      render(<RedefinirSenhaForm />);

      await user.type(screen.getByLabelText('Nova senha'), 'newpass123');
      await user.type(
        screen.getByLabelText('Confirmar nova senha'),
        'newpass123',
      );
      await user.click(
        screen.getByRole('button', { name: /salvar nova senha/i }),
      );

      expect(
        screen.getByRole('button', { name: 'Salvando...' }),
      ).toBeDisabled();

      await waitFor(() => {
        expect(
          screen.getByRole('button', { name: /salvar nova senha/i }),
        ).toBeInTheDocument();
      });
    });
  });
});
