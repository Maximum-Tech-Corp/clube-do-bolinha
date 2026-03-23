import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MatchTimer } from '../match-timer';

const GAME_ID = 'game-timer-test';
const STORAGE_KEY = `match_timer_${GAME_ID}`;

describe('MatchTimer', () => {
  describe('initial render', () => {
    it('shows the configured time on first render', () => {
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);
      expect(screen.getByText('20:00')).toBeInTheDocument();
    });

    it("shows 'Iniciar' button when timer is not started", () => {
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);
      expect(
        screen.getByRole('button', { name: /iniciar/i }),
      ).toBeInTheDocument();
    });

    it("shows 'Reset' button always", () => {
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);
      expect(
        screen.getByRole('button', { name: /reset/i }),
      ).toBeInTheDocument();
    });

    it('shows configured duration label', () => {
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={30} />);
      expect(screen.getByText(/30 min/)).toBeInTheDocument();
    });
  });

  describe('localStorage persistence', () => {
    it('restores paused state from localStorage', () => {
      const durationMs = 20 * 60_000;
      const state = {
        startedAt: Date.now() - 5000,
        pausedAt: Date.now() - 2000, // paused 2 seconds ago, 3 seconds elapsed
        durationMs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);

      // Should show "Continuar" (not "Iniciar") because startedAt is set
      expect(
        screen.getByRole('button', { name: /continuar/i }),
      ).toBeInTheDocument();
    });

    it("shows 'Tempo encerrado!' when timer is finished", () => {
      const durationMs = 1000; // 1 second
      const state = {
        startedAt: Date.now() - 3000,
        pausedAt: Date.now() - 1500, // elapsed = 1.5s > 1s
        durationMs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);

      expect(screen.getByText('Tempo encerrado!')).toBeInTheDocument();
    });

    it('saves state to localStorage when play is clicked', async () => {
      const user = userEvent.setup();
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);

      await user.click(screen.getByRole('button', { name: /iniciar/i }));

      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
      expect(saved).not.toBeNull();
      expect(saved.startedAt).not.toBeNull();
      expect(saved.pausedAt).toBeNull();
    });
  });

  describe('localStorage error recovery', () => {
    it('falls back to default state when localStorage has invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, 'not-valid-json!!!');
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);
      // Should fall back to the default 20:00
      expect(screen.getByText('20:00')).toBeInTheDocument();
    });
  });

  describe('controls', () => {
    it("shows 'Pausar' after clicking Iniciar", async () => {
      const user = userEvent.setup();
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);

      await user.click(screen.getByRole('button', { name: /iniciar/i }));

      expect(
        screen.getByRole('button', { name: /pausar/i }),
      ).toBeInTheDocument();
    });

    it("shows 'Continuar' after Pausar is clicked", async () => {
      const user = userEvent.setup();
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);

      await user.click(screen.getByRole('button', { name: /iniciar/i }));
      await user.click(screen.getByRole('button', { name: /pausar/i }));

      expect(
        screen.getByRole('button', { name: /continuar/i }),
      ).toBeInTheDocument();
    });

    it("shows 'Iniciar' again after Reset", async () => {
      const user = userEvent.setup();
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);

      await user.click(screen.getByRole('button', { name: /iniciar/i }));
      await user.click(screen.getByRole('button', { name: /reset/i }));

      expect(
        screen.getByRole('button', { name: /iniciar/i }),
      ).toBeInTheDocument();
    });

    it('restores full time after Reset', async () => {
      const user = userEvent.setup();
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);

      await user.click(screen.getByRole('button', { name: /iniciar/i }));
      await user.click(screen.getByRole('button', { name: /reset/i }));

      expect(screen.getByText('20:00')).toBeInTheDocument();
    });

    it('resumes from pause (resume path in handlePlay)', async () => {
      const user = userEvent.setup();
      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);

      await user.click(screen.getByRole('button', { name: /iniciar/i }));
      await user.click(screen.getByRole('button', { name: /pausar/i }));
      // Now click "Continuar" — triggers the resume branch (lines 106-110)
      await user.click(screen.getByRole('button', { name: /continuar/i }));

      expect(
        screen.getByRole('button', { name: /pausar/i }),
      ).toBeInTheDocument();
    });

    it('play button is disabled when timer is finished', () => {
      const durationMs = 1000;
      const state = {
        startedAt: Date.now() - 3000,
        pausedAt: Date.now() - 1500,
        durationMs,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

      render(<MatchTimer gameId={GAME_ID} defaultMinutes={20} />);

      const playBtn = screen.getByRole('button', {
        name: /iniciar|continuar/i,
      });
      expect(playBtn).toBeDisabled();
    });

    it("interval reaches zero and shows 'Tempo encerrado!' while running", async () => {
      vi.useFakeTimers();

      try {
        // Short 1-second duration, start from now so it's still "running"
        const durationMs = 200; // 200ms — will tick to zero very fast
        const state = {
          startedAt: Date.now(),
          pausedAt: null,
          durationMs,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

        const { getByText } = render(
          <MatchTimer gameId={GAME_ID} defaultMinutes={20} />,
        );

        // Advance time past the duration
        await act(async () => {
          vi.advanceTimersByTime(600); // 3 ticks of 250ms
        });

        expect(getByText('Tempo encerrado!')).toBeInTheDocument();
      } finally {
        vi.useRealTimers();
      }
    });
  });
});
