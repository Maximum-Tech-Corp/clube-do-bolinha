import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EsqueciSenhaForm } from '../esqueci-senha-form';

const mockRequestPasswordReset = vi.fn();

vi.mock('@/actions/auth', () => ({
  requestPasswordReset: (...args: unknown[]) =>
    mockRequestPasswordReset(...args),
}));

describe('EsqueciSenhaForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequestPasswordReset.mockResolvedValue({ success: true });
  });

  it('renders email field and submit button', () => {
    render(<EsqueciSenhaForm />);
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /enviar link/i }),
    ).toBeInTheDocument();
  });

  it('renders link back to /login', () => {
    render(<EsqueciSenhaForm />);
    const link = screen.getByRole('link', { name: /voltar para o login/i });
    expect(link).toHaveAttribute('href', '/login');
  });

  describe('validation', () => {
    it("shows 'E-mail inválido' for bad email format", async () => {
      const user = userEvent.setup();
      const { container } = render(<EsqueciSenhaForm />);

      await user.type(screen.getByLabelText('E-mail'), 'not-an-email');
      fireEvent.submit(container.querySelector('form')!);

      await waitFor(() => {
        expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
      });
      expect(mockRequestPasswordReset).not.toHaveBeenCalled();
    });

    it('shows error on empty submit', async () => {
      const user = userEvent.setup();
      render(<EsqueciSenhaForm />);

      await user.click(screen.getByRole('button', { name: /enviar link/i }));

      await waitFor(() => {
        expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
      });
      expect(mockRequestPasswordReset).not.toHaveBeenCalled();
    });
  });

  describe('submission', () => {
    it('calls requestPasswordReset with the provided email', async () => {
      const user = userEvent.setup();
      render(<EsqueciSenhaForm />);

      await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
      await user.click(screen.getByRole('button', { name: /enviar link/i }));

      await waitFor(() => {
        expect(mockRequestPasswordReset).toHaveBeenCalledWith(
          'admin@example.com',
        );
      });
    });

    it('shows success state after email is sent', async () => {
      const user = userEvent.setup();
      render(<EsqueciSenhaForm />);

      await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
      await user.click(screen.getByRole('button', { name: /enviar link/i }));

      await waitFor(() => {
        expect(screen.getByText('E-mail enviado')).toBeInTheDocument();
        expect(
          screen.getByText(/verifique sua caixa de entrada/i),
        ).toBeInTheDocument();
      });
    });

    it('hides the form after successful submission', async () => {
      const user = userEvent.setup();
      render(<EsqueciSenhaForm />);

      await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
      await user.click(screen.getByRole('button', { name: /enviar link/i }));

      await waitFor(() => {
        expect(screen.queryByLabelText('E-mail')).not.toBeInTheDocument();
        expect(
          screen.queryByRole('button', { name: /enviar link/i }),
        ).not.toBeInTheDocument();
      });
    });

    it('shows server error when action returns error', async () => {
      mockRequestPasswordReset.mockResolvedValue({
        error: 'Não foi possível enviar o e-mail. Tente novamente.',
      });
      const user = userEvent.setup();
      render(<EsqueciSenhaForm />);

      await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
      await user.click(screen.getByRole('button', { name: /enviar link/i }));

      await waitFor(() => {
        expect(
          screen.getByText(
            'Não foi possível enviar o e-mail. Tente novamente.',
          ),
        ).toBeInTheDocument();
      });
    });

    it("shows 'Enviando...' loading state during submission", async () => {
      mockRequestPasswordReset.mockImplementation(
        () =>
          new Promise(resolve =>
            setTimeout(() => resolve({ success: true }), 200),
          ),
      );
      const user = userEvent.setup();
      render(<EsqueciSenhaForm />);

      await user.type(screen.getByLabelText('E-mail'), 'admin@example.com');
      await user.click(screen.getByRole('button', { name: /enviar link/i }));

      expect(
        screen.getByRole('button', { name: 'Enviando...' }),
      ).toBeDisabled();

      await waitFor(() => {
        expect(screen.getByText('E-mail enviado')).toBeInTheDocument();
      });
    });
  });
});
