import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AttendanceChart, type GameAttendance } from '../attendance-chart';

function makeGame(
  id: string,
  confirmed: number,
  waitlist = 0,
  date = new Date('2026-03-15'),
): GameAttendance {
  return { gameId: id, date, confirmed, waitlist };
}

describe('AttendanceChart', () => {
  describe('empty state', () => {
    it('renders nothing when data is empty', () => {
      const { container } = render(<AttendanceChart data={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('SVG structure', () => {
    it('renders an SVG with accessible label', () => {
      render(<AttendanceChart data={[makeGame('g1', 10)]} />);
      expect(
        screen.getByRole('img', { name: 'Confirmações por jogo' }),
      ).toBeInTheDocument();
    });

    it('renders one confirmed rect per data entry when no waitlist', () => {
      const { container } = render(
        <AttendanceChart
          data={[makeGame('g1', 10), makeGame('g2', 8), makeGame('g3', 12)]}
        />,
      );
      expect(container.querySelectorAll('rect')).toHaveLength(3);
    });

    it('renders two rects per entry when waitlist > 0', () => {
      const { container } = render(
        <AttendanceChart
          data={[makeGame('g1', 10, 3), makeGame('g2', 8, 0)]}
        />,
      );
      // g1: confirmed + waitlist = 2 rects; g2: confirmed only = 1 rect
      expect(container.querySelectorAll('rect')).toHaveLength(3);
    });

    it('renders eight confirmed rects for eight games with no waitlist', () => {
      const data = Array.from({ length: 8 }, (_, i) =>
        makeGame(`g${i}`, i + 1),
      );
      const { container } = render(<AttendanceChart data={data} />);
      expect(container.querySelectorAll('rect')).toHaveLength(8);
    });
  });

  describe('count labels', () => {
    it('shows the confirmed count above each bar', () => {
      render(
        <AttendanceChart data={[makeGame('g1', 7), makeGame('g2', 13)]} />,
      );
      expect(screen.getByText('7')).toBeInTheDocument();
      expect(screen.getByText('13')).toBeInTheDocument();
    });

    it('shows 0 for a game with no confirmations', () => {
      render(<AttendanceChart data={[makeGame('g1', 0)]} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('shows waitlist count when waitlist > 0', () => {
      render(<AttendanceChart data={[makeGame('g1', 10, 4)]} />);
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    it('does not show waitlist label when waitlist is 0', () => {
      render(
        <AttendanceChart
          data={[makeGame('g1', 10, 0), makeGame('g2', 5, 2)]}
        />,
      );
      // Only one waitlist label should appear (for g2's waitlist of 2)
      expect(screen.getByText('2')).toBeInTheDocument();
      // Confirmed labels
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });
  });

  describe('date labels', () => {
    it('formats the date as day/month-abbr in Portuguese', () => {
      const months: [number, string][] = [
        [0, 'jan'],
        [1, 'fev'],
        [2, 'mar'],
        [3, 'abr'],
        [4, 'mai'],
        [5, 'jun'],
        [6, 'jul'],
        [7, 'ago'],
        [8, 'set'],
        [9, 'out'],
        [10, 'nov'],
        [11, 'dez'],
      ];

      for (const [monthIndex, abbr] of months) {
        const date = new Date(2026, monthIndex, 5);
        const { unmount } = render(
          <AttendanceChart
            data={[{ gameId: 'g1', date, confirmed: 1, waitlist: 0 }]}
          />,
        );
        expect(screen.getByText(`5/${abbr}`)).toBeInTheDocument();
        unmount();
      }
    });

    it('shows the correct day number in the label', () => {
      render(
        <AttendanceChart
          data={[
            {
              gameId: 'g1',
              date: new Date(2026, 2, 27),
              confirmed: 1,
              waitlist: 0,
            },
          ]}
        />,
      );
      expect(screen.getByText('27/mar')).toBeInTheDocument();
    });
  });

  describe('average line', () => {
    it('shows rounded average of confirmed in the label', () => {
      render(
        <AttendanceChart
          data={[makeGame('g1', 10, 5), makeGame('g2', 11, 2)]}
        />,
      );
      // avg confirmed = (10 + 11) / 2 = 10.5 → rounds to 11
      expect(screen.getByText('média 11')).toBeInTheDocument();
    });

    it('average line reflects only confirmed, not waitlist', () => {
      render(
        <AttendanceChart
          data={[makeGame('g1', 8, 10), makeGame('g2', 12, 10)]}
        />,
      );
      // avg confirmed = (8 + 12) / 2 = 10
      expect(screen.getByText('média 10')).toBeInTheDocument();
    });

    it('renders two lines (baseline + average dashed line)', () => {
      const { container } = render(
        <AttendanceChart data={[makeGame('g1', 10)]} />,
      );
      expect(container.querySelectorAll('line')).toHaveLength(2);
    });
  });
});
