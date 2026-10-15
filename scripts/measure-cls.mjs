import { chromium, devices } from '@playwright/test'

/**
 * Mobile layout shift on the demo's two first screens, Lighthouse-like: a Pixel 7, 4× CPU slowdown,
 * a slow-4G network, and the sum of every shift without recent input over load plus three seconds
 * (an upper bound on Lighthouse's windowed CLS). Recorded, not gated: the target is 0.1 or less.
 */
const base = process.argv[2]
if (!base) throw new Error('Usage: pnpm measure:cls <base-url>, e.g. http://localhost:4195')
const ROUTES = ['/', '/t/th-brief']
const RUNS = 3

async function measure(browser, url) {
  const context = await browser.newContext({ ...devices['Pixel 7'] })
  const page = await context.newPage()
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await cdp.send('Network.enable')
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
  await page.addInitScript(() => {
    window.__shifts = []
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) {
        if (!e.hadRecentInput) window.__shifts.push({ value: e.value, nodes: (e.sources ?? []).map((s) => s.node?.nodeName ?? '?').join(',') })
      }
    }).observe({ type: 'layout-shift', buffered: true })
  })
  await page.goto(url, { waitUntil: 'load' })
  // On a phone `/` opens on the Threads pane, so the page's h1 is rendered but sits in a hidden pane.
  await page.getByRole('heading', { level: 1, includeHidden: true }).waitFor({ state: 'attached', timeout: 60_000 })
  await page.waitForTimeout(3_000)
  const shifts = await page.evaluate(() => window.__shifts)
  await context.close()
  return { cls: shifts.reduce((sum, s) => sum + s.value, 0), shifts }
}

const browser = await chromium.launch()
for (const route of ROUTES) {
  const runs = []
  for (let i = 0; i < RUNS; i++) runs.push(await measure(browser, `${base}${route}`))
  const worst = runs.reduce((a, b) => (b.cls > a.cls ? b : a))
  console.log(`${route}: CLS ${runs.map((r) => r.cls.toFixed(3)).join(', ')} (worst ${worst.cls.toFixed(3)})`)
  for (const s of worst.shifts) console.log(`  ${s.value.toFixed(3)} ${s.nodes}`)
}
await browser.close()
