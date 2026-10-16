// public/icons/icon.svg から PWA・ホーム画面用の PNG アイコンを作る。
// 使い方: node scripts/generate-icons.mjs （Playwright の Chromium を使う）
import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'

const svg = await readFile(new URL('../public/icons/icon.svg', import.meta.url), 'utf8')
const targets = [
  { file: 'public/icons/icon-192.png', size: 192, pad: 0 },
  { file: 'public/icons/icon-512.png', size: 512, pad: 0 },
  // maskable：端末が丸や角丸に切り抜いても欠けないよう、図柄を中央80%に収める
  { file: 'public/icons/maskable-512.png', size: 512, pad: 0.1 },
  { file: 'app/apple-icon.png', size: 180, pad: 0 },
  { file: 'app/icon.png', size: 64, pad: 0 },
]

const browser = await chromium.launch()
const page = await browser.newPage()
for (const t of targets) {
  const inner = Math.round(t.size * (1 - t.pad * 2))
  await page.setViewportSize({ width: t.size, height: t.size })
  await page.setContent(`<html><body style="margin:0;background:#030712;display:flex;align-items:center;justify-content:center;width:${t.size}px;height:${t.size}px">
    <img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${inner}" height="${inner}"></body></html>`)
  await page.screenshot({ path: t.file, omitBackground: false })
  console.log('wrote', t.file)
}
await browser.close()
