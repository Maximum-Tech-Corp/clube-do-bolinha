import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppLogo } from '../app-logo';

describe('AppLogo', () => {
  it('renders image with correct alt text', () => {
    render(<AppLogo />);
    expect(
      screen.getByRole('img', { name: 'Clube do Bolinha' }),
    ).toBeInTheDocument();
  });

  it('defaults to md size (120px wide)', () => {
    render(<AppLogo />);
    const img = screen.getByRole('img', { name: 'Clube do Bolinha' });
    expect(img).toHaveAttribute('width', '120');
  });

  it('applies sm size (80px wide)', () => {
    render(<AppLogo size="sm" />);
    const img = screen.getByRole('img', { name: 'Clube do Bolinha' });
    expect(img).toHaveAttribute('width', '80');
  });

  it('applies lg size (160px wide)', () => {
    render(<AppLogo size="lg" />);
    const img = screen.getByRole('img', { name: 'Clube do Bolinha' });
    expect(img).toHaveAttribute('width', '160');
  });
});
