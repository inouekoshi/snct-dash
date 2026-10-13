import { defineConfig, devices } from '@playwright/test'

// E2E テスト。本番と同じ `next build` + `next start` で動かす。
// API（/api/*）はテストごとに page.route でモックする（DB には繋がない）。
// NEXT_PUBLIC_E2E=1 のビルドだけ、ゲームエンジンを window.__kosendash から触れる（自動操縦・ワープ用）。
const PORT = 3100

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  fullyParallel: true,
  workers: process.env.CI ? 2 : 5,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 720 } } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    timeout: 300_000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_E2E: '1',
      NEXT_PUBLIC_SUPABASE_URL: 'https://e2e.invalid',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'e2e-dummy-key',
    },
  },
})
