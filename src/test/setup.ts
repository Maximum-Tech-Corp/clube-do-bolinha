import "@testing-library/jest-dom";
import { vi, beforeEach, afterEach } from "vitest";

// ─── Global mocks ────────────────────────────────────────────────────────────

// next/navigation, next/cache, next/headers, next/link
import "./mocks/next";

// @/lib/supabase/server
import "./mocks/supabase";

// ─── Browser APIs not in happy-dom ───────────────────────────────────────────

// ResizeObserver — class-based so vi.restoreAllMocks() doesn't remove it
class MockResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// IntersectionObserver — class-based so vi.restoreAllMocks() doesn't remove it
class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
global.IntersectionObserver =
  MockIntersectionObserver as unknown as typeof IntersectionObserver;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  localStorage.clear();
  sessionStorage.clear();

  // Re-define after vi.restoreAllMocks() (called in afterEach) clears these.
  // configurable: true allows repeated re-definition across tests.
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
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

  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    writable: true,
    value: {
      writeText: vi.fn(() => Promise.resolve()),
      readText: vi.fn(() => Promise.resolve("")),
    },
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});
