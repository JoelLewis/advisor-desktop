import { defineConfig, devices } from '@playwright/test'

// Each worktree runs its own dev server on VISUAL_PORT so parallel runs never share a server.
const port = Number(process.env.VISUAL_PORT ?? 5173)
const isolated = process.env.VISUAL_PORT !== undefined

export default defineConfig({
  testDir: './e2e-visual',
  snapshotPathTemplate: 'e2e-visual/__baselines__/{arg}{ext}',
  reporter: 'list',
  use: { baseURL: `http://localhost:${port}` },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: { command: `pnpm dev --port ${port} --strictPort`, url: `http://localhost:${port}`, reuseExistingServer: !isolated, timeout: 120_000 },
})
