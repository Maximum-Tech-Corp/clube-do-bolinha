import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DashboardMenu } from '../dashboard-menu';

const mockUpdateTeamSettings = vi.fn();

vi.mock('@/actions/team', () => ({
  updateTeamSettings: (...args: unknown[]) => mockUpdateTeamSettings(...args),
  updateAccessCodePrefix: vi.fn(),
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

const DEFAULT_PROPS = {
  appUrl: 'https://clube.app',
  teamName: 'Bolinha FC',
  matchDurationMinutes: 20,
};

describe('DashboardMenu', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateTeamSettings.mockResolvedValue({});
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
