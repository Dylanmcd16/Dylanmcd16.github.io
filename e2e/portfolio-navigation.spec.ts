import { expect, test } from '@playwright/test'

const routes = [
  '/',
  '/work/',
  '/work/corteva-field-sensing/',
  '/work/plrb-weather-systems/',
  '/work/land-use-convective-weather/',
  '/projects/iowa-soybean-season-explorer/',
  '/projects/iowa-severe-weather-explorer/',
]

for (const width of [320, 390, 1440]) {
  test(`portfolio pages fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const route of routes) {
      await page.goto(route)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), route).toBe(true)
    }
  })
}

test('mobile navigation hides closed links from keyboard users and follows a section link', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const navigation = page.getByRole('navigation', { name: 'Primary', includeHidden: true })
  await expect(navigation).toBeHidden()
  await page.getByRole('button', { name: 'Toggle navigation' }).click()
  await expect(navigation).toBeVisible()
  await navigation.getByRole('link', { name: 'Skills', exact: true }).click()
  await expect(page).toHaveURL(/#skills$/)
  await expect(navigation).toBeHidden()
  // A hidden decorative globe must not initialize WebGL on a phone.
  await expect(page.locator('.globe-wrap')).toHaveCount(0)
})

test('soybean explorer responds to timeline and rainfall controls', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/projects/iowa-soybean-season-explorer/')
  await expect(page.locator('.sse-map canvas')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.sse-map__veil')).toHaveCount(0, { timeout: 30_000 })
  const timeline = page.getByRole('slider', { name: 'Usable Sentinel-2 acquisition date' })
  const initial = Number(await timeline.inputValue())
  await page.getByRole('button', { name: 'Next acquisition date' }).click()
  await expect(timeline).toHaveValue(String(initial + 1))
  await page.locator('label').filter({ hasText: /^Last 14 days$/ }).click()
  await expect(page.getByRole('radio', { name: 'Last 14 days' })).toBeChecked()
  await page.locator('label').filter({ hasText: /^Soybean fields$/ }).click()
  await expect(page.getByRole('checkbox', { name: 'Soybean fields' })).not.toBeChecked()
})
