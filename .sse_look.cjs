const { chromium, devices } = require('playwright')
const URL = 'http://localhost:5177/projects/iowa-soybean-season-explorer/'
;(async () => {
  const b = await chromium.launch()
  const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 })
  const errs = []
  p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
  p.on('console', (m) => { if (m.type() === 'error' && !/arcgisonline|cartocdn|ERR_/.test(m.text())) errs.push('CONSOLE ' + m.text()) })
  await p.goto(URL, { waitUntil: 'networkidle' })
  await p.waitForSelector('.sse-timeline', { timeout: 40000 })
  await p.waitForTimeout(5500)
  console.log('opening frame:', await p.locator('.sse-clock').textContent())
  await p.screenshot({ path: process.argv[2] + '/look-top.png' })
  // select a field so the place card is in the shot
  await p.locator('.sse-stage').scrollIntoViewIfNeeded(); await p.waitForTimeout(900)
  const box = await p.locator('.sse-map').boundingBox()
  outer: for (let r = 1; r <= 6; r++) for (let c = 1; c <= 7; c++) {
    await p.mouse.click(box.x + box.width * c / 8, box.y + box.height * r / 7)
    await p.waitForTimeout(200)
    if (await p.locator('.sse-card').count()) break outer
  }
  await p.waitForTimeout(1400)
  await p.screenshot({ path: process.argv[2] + '/look-map.png' })
  await p.screenshot({ path: process.argv[2] + '/look-full.png', fullPage: true })
  console.log('card:', await p.locator('.sse-card__title').textContent().catch(() => 'none'))
  console.log(errs.length ? errs.join('\n') : 'no page errors')
  const m = await b.newContext(devices['iPhone 14'])
  const mp = await m.newPage()
  await mp.goto(URL, { waitUntil: 'networkidle' })
  await mp.waitForSelector('.sse-timeline', { timeout: 40000 }); await mp.waitForTimeout(5000)
  console.log('mobile overflow:', await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth))
  await mp.screenshot({ path: process.argv[2] + '/look-mobile.png', fullPage: true })
  await b.close()
})()
