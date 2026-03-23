import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "happy-dom",
    setupFiles: ["./src/test/setup.ts"],
    globals: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      thresholds: {
        statements: 95,
        branches: 95,
        functions: 95,
        lines: 95,
      },
      all: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        // shadcn primitives — third-party, not our logic
        "src/components/ui/**",
        // Server Components — data fetching wrappers, not unit testable
        "src/app/**",
        // Supabase infra wrappers
        "src/lib/supabase/**",
        // Type definitions only
        "src/types/**",
        // Auth proxy — integration concern
        "src/proxy.ts",
        // Stripe checkout — integration concern (Supabase Auth + Stripe SDK + redirect)
        "src/actions/stripe.ts",
        // Pure SVG, no logic
        "src/components/football-field-bg.tsx",
        // Browser-only API, no logic
        "src/components/service-worker-registration.tsx",
        // Test helpers themselves
        "src/test/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
