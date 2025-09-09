import { chromium } from 'playwright'

const url = 'http://localhost:5173'
const out = 'schedule.png'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } })
await page.goto(url, { waitUntil: 'networkidle' })
const el = await page.$('div > div') // äußere Capture-Box
await el.screenshot({ path: out })
await browser.close()
console.log('Saved', out)
