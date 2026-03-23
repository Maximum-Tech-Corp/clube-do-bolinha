import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { YearSelect } from '../year-select';
import { mockPush } from '@/test/mocks/next';

const YEARS = [2023, 2024, 2025];

describe('YearSelect', () => {
  describe('rendering', () => {
    it('renders all year options', () => {
      render(<YearSelect years={YEARS} current={2025} />);
      expect(screen.getByRole('option', { name: '2023' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '2024' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: '2025' })).toBeInTheDocument();
    });

    it('pre-selects the current year', () => {
      render(<YearSelect years={YEARS} current={2024} />);
      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('2024');
    });

    it('renders a select element', () => {
      render(<YearSelect years={YEARS} current={2025} />);
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    it('calls router.push with selected year on change', async () => {
      const user = userEvent.setup();
      render(<YearSelect years={YEARS} current={2025} />);

      await user.selectOptions(screen.getByRole('combobox'), '2023');

      expect(mockPush).toHaveBeenCalledWith('/dashboard/rankings?ano=2023');
    });

    it('pushes the new year when a different year is selected', async () => {
      const user = userEvent.setup();
      render(<YearSelect years={YEARS} current={2024} />);

      await user.selectOptions(screen.getByRole('combobox'), '2025');

      expect(mockPush).toHaveBeenCalledWith('/dashboard/rankings?ano=2025');
    });
  });
});
