import { expect, test } from '@playwright/test'

test.describe('homepage', () => {
  test('loads and links to Doppler Atlas', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('heading', { name: 'Dylan McDermott' })).toBeVisible()

    const explorerLink = page.locator('a[href="/work/doppler-atlas/"]')
    await expect(explorerLink).toBeVisible()
    await expect(explorerLink).toHaveAttribute('href', /\/work\/doppler-atlas\/$/)
    await explorerLink.click()
    await expect(page.getByRole('heading', { name: 'Doppler Atlas: VR/3D Radar Viewer', exact: true })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Doppler Atlas website' })).toHaveAttribute('href', 'https://doppleratlas.app/')
  })
})

test.describe('Iowa Severe Weather Data Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/projects/iowa-severe-weather-explorer/')
  })

  test('loads the map container', async ({ page }) => {
    await expect(page.locator('.derecho-map canvas')).toBeVisible({ timeout: 30_000 })
    // The explorer must reach its interactive state, not the loading/error message.
    await expect(page.locator('.swx-explorer--message')).toHaveCount(0)
  })

  test('switching the primary field changes the active layer button', async ({ page }) => {
    await expect(page.locator('.derecho-map canvas')).toBeVisible({ timeout: 30_000 })

    const radarButton = page.getByRole('button', { name: 'Radar', exact: true })
    const satelliteButton = page.getByRole('button', { name: 'Satellite', exact: true })

    await expect(radarButton).toHaveClass(/is-active/)
    await satelliteButton.click()
    await expect(satelliteButton).toHaveClass(/is-active/)
    await expect(radarButton).not.toHaveClass(/is-active/)
  })

  test('moving the timeline advances the event clock', async ({ page }) => {
    await expect(page.locator('.derecho-map canvas')).toBeVisible({ timeout: 30_000 })

    const clock = page.locator('.swx-clock__time')
    const before = await clock.textContent()

    // Step forward a few frames via the Next-frame control.
    const nextButton = page.getByRole('button', { name: 'Next frame' })
    for (let i = 0; i < 4; i += 1) {
      await nextButton.click()
    }

    await expect(clock).not.toHaveText(before ?? '')
  })
})
