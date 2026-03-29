import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { mockRedirect } from '@/test/mocks/next';
import { mockSupabaseFrom, createQueryMock } from '@/test/mocks/supabase';

vi.mock('@/lib/admin-context', () => ({
  getAdminContext: vi.fn(),
}));

vi.mock('@/components/dashboard/dashboard-menu', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    DashboardMenu: ({
      teamName,
      isCoAdmin,
      appUrl,
    }: {
      teamName: string;
      isCoAdmin: boolean;
      appUrl: string;
      matchDurationMinutes: number;
    }) =>
      React.createElement('div', {
        'data-testid': 'dashboard-menu',
        'data-team': teamName,
        'data-co-admin': String(isCoAdmin),
        'data-app-url': appUrl,
      }),
  };
});

import { getAdminContext } from '@/lib/admin-context';
import { AdminPageHeader } from '../admin-page-header';

const mockGetAdminContext = vi.mocked(getAdminContext);

const DEFAULT_CTX = {
  userId: 'user-1',
  adminId: 'admin-1',
  effectiveAdminId: 'admin-1',
  adminName: 'João',
  isCoAdmin: false,
};

const DEFAULT_TEAM = { name: 'Bolinha FC', match_duration_minutes: 15 };

describe('AdminPageHeader', () => {
  beforeEach(() => {
    mockGetAdminContext.mockResolvedValue(DEFAULT_CTX);
    mockSupabaseFrom.mockReturnValue(
      createQueryMock({ data: DEFAULT_TEAM, error: null }),
    );
  });

  describe('rendering', () => {
    it('renders the page title', async () => {
      render(await AdminPageHeader({ title: 'Jogos' }));
      expect(
        screen.getByRole('heading', { name: 'Jogos' }),
      ).toBeInTheDocument();
    });

    it('renders with yellow background', async () => {
      const { container } = render(await AdminPageHeader({ title: 'Jogos' }));
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper.style.backgroundColor).toBe('#fed015');
    });

    it('renders DashboardMenu', async () => {
      render(await AdminPageHeader({ title: 'Jogos' }));
      expect(screen.getByTestId('dashboard-menu')).toBeInTheDocument();
    });
  });

  describe('back navigation', () => {
    it('renders back arrow link when backHref is provided', async () => {
      render(
        await AdminPageHeader({
          title: 'Novo jogo',
          backHref: '/dashboard/jogos',
        }),
      );
      const backLink = screen.getByRole('link', { name: 'Voltar' });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/dashboard/jogos');
    });

    it('does not render back arrow when backHref is omitted', async () => {
      render(await AdminPageHeader({ title: 'Jogos' }));
      expect(
        screen.queryByRole('link', { name: 'Voltar' }),
      ).not.toBeInTheDocument();
    });
  });

  describe('DashboardMenu props', () => {
    it('passes teamName to DashboardMenu', async () => {
      render(await AdminPageHeader({ title: 'Jogos' }));
      expect(screen.getByTestId('dashboard-menu')).toHaveAttribute(
        'data-team',
        'Bolinha FC',
      );
    });

    it('passes isCoAdmin=false for a regular admin', async () => {
      render(await AdminPageHeader({ title: 'Jogos' }));
      expect(screen.getByTestId('dashboard-menu')).toHaveAttribute(
        'data-co-admin',
        'false',
      );
    });

    it('passes isCoAdmin=true for a co-admin', async () => {
      mockGetAdminContext.mockResolvedValue({
        ...DEFAULT_CTX,
        isCoAdmin: true,
      });
      render(await AdminPageHeader({ title: 'Jogos' }));
      expect(screen.getByTestId('dashboard-menu')).toHaveAttribute(
        'data-co-admin',
        'true',
      );
    });

    it('uses NEXT_PUBLIC_APP_URL when defined', async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'https://app.example.com';
      render(await AdminPageHeader({ title: 'Jogos' }));
      expect(screen.getByTestId('dashboard-menu')).toHaveAttribute(
        'data-app-url',
        'https://app.example.com',
      );
    });

    it('falls back to localhost when NEXT_PUBLIC_APP_URL is not set', async () => {
      delete process.env.NEXT_PUBLIC_APP_URL;
      render(await AdminPageHeader({ title: 'Jogos' }));
      expect(screen.getByTestId('dashboard-menu')).toHaveAttribute(
        'data-app-url',
        'http://localhost:3000',
      );
    });
  });

  describe('auth redirects', () => {
    it('redirects to /login when admin context is not found', async () => {
      mockGetAdminContext.mockResolvedValue(null);
      try {
        await AdminPageHeader({ title: 'Test' });
      } catch {}
      expect(mockRedirect).toHaveBeenCalledWith('/login');
    });

    it('redirects to /login when team is not found', async () => {
      mockSupabaseFrom.mockReturnValue(
        createQueryMock({ data: null, error: null }),
      );
      try {
        await AdminPageHeader({ title: 'Test' });
      } catch {}
      expect(mockRedirect).toHaveBeenCalledWith('/login');
    });
  });
});
