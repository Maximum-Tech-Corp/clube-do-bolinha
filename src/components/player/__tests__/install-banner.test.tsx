import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { InstallBanner } from '../install-banner';

// matchMedia is already mocked in setup.ts to return { matches: false }
// (isStandalone returns false → banner can render)

function setUserAgent(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    get: () => ua,
    configurable: true,
  });
}

describe('InstallBanner', () => {
  beforeEach(() => {
    // Reset matchMedia mock to return matches: false (not standalone)
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it("renders nothing on 'other' platform (desktop/unknown)", async () => {
    setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    );
    await act(async () => {
      render(<InstallBanner />);
    });
    expect(screen.queryByText(/Instale/)).not.toBeInTheDocument();
  });

  it('renders iOS install instructions for iPhone userAgent', async () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    );
    await act(async () => {
      render(<InstallBanner />);
    });
    expect(screen.getByText(/Instale no iPhone/)).toBeInTheDocument();
    expect(screen.getByText(/Safari/)).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à Tela de Início/)).toBeInTheDocument();
  });

  it('renders Android install instructions for Android userAgent', async () => {
    setUserAgent(
      'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/112',
    );
    await act(async () => {
      render(<InstallBanner />);
    });
    expect(screen.getByText(/Instale no celular/)).toBeInTheDocument();
    expect(screen.getByText(/Chrome/)).toBeInTheDocument();
    expect(screen.getByText(/Adicionar à tela inicial/)).toBeInTheDocument();
  });

  it('renders nothing when already installed (standalone mode)', async () => {
    setUserAgent(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    );
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === '(display-mode: standalone)' ? true : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
    await act(async () => {
      render(<InstallBanner />);
    });
    expect(screen.queryByText(/Instale/)).not.toBeInTheDocument();
  });

  it('renders iOS instructions for iPad userAgent', async () => {
    setUserAgent(
      'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    );
    await act(async () => {
      render(<InstallBanner />);
    });
    expect(screen.getByText(/Instale no iPhone/)).toBeInTheDocument();
  });

  it('renders iOS instructions for iPod userAgent', async () => {
    setUserAgent('Mozilla/5.0 (iPod touch; CPU iPhone OS 17_0 like Mac OS X)');
    await act(async () => {
      render(<InstallBanner />);
    });
    expect(screen.getByText(/Instale no iPhone/)).toBeInTheDocument();
  });
});
