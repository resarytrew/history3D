import { expect, test } from '@playwright/test'

test('loads Pokrov and exposes the museum controls', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Покрова на Нерли' })).toBeVisible()
  await expect(page.locator('.viewer-stage')).toBeVisible()
  await expect(page.locator('canvas.viewer-canvas')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Сбросить ракурс' })).toBeVisible()
  await expect(page.getByText('DEV_ONLY • не научная реконструкция')).toBeVisible()
})

test('switches to the Ivan IV helmet and loads its GLB scan', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/')
  await page.getByRole('button', { name: 'Шлем Ивана IV' }).click()
  await expect(page.getByRole('heading', { name: 'Шлем Ивана IV' })).toBeVisible()
  await expect(page.locator('.scene-background img')).toHaveAttribute('src', /interior/)
  const canvas = page.locator('canvas.viewer-canvas')
  await expect(canvas).toHaveAttribute('data-renderer', /webgl|unavailable/, { timeout: 15_000 })
  if (await canvas.getAttribute('data-renderer') === 'webgl') {
    await expect(page.getByRole('button', { name: '1. Высокое навершие' })).toBeVisible({ timeout: 30_000 })
  }
})

test('opens a hotspot, resets camera and opens sources', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas.viewer-canvas')
  await expect(canvas).toHaveAttribute('data-renderer', /webgl|unavailable/, { timeout: 15_000 })
  const renderer = await canvas.getAttribute('data-renderer')
  const hotspot = page.getByRole('button', { name: '1. Каменная резьба' })
  if (renderer === 'webgl') {
    await expect(hotspot).toBeVisible({ timeout: 15_000 })
    await hotspot.click()
    await expect(page.getByText('Какие детали усиливают вертикальное движение фасада?')).toBeVisible()
    await page.getByRole('button', { name: 'Сбросить ракурс' }).click()
    await expect(page.getByText('Какие детали усиливают вертикальное движение фасада?')).toBeHidden()
  } else {
    await expect(hotspot).toHaveCount(0)
    await expect(page.getByRole('alert')).toContainText('3D-viewer не запущен')
  }
  await page.getByRole('button', { name: 'Источники' }).click()
  await expect(page.getByRole('dialog', { name: 'Источники и достоверность' })).toBeVisible()
})

test('orbit changes the camera when WebGL is available', async ({ page }) => {
  await page.goto('/')
  const canvas = page.locator('canvas.viewer-canvas')
  await expect(canvas).toHaveAttribute('data-renderer', /webgl|unavailable/, { timeout: 15_000 })
  test.skip(await canvas.getAttribute('data-renderer') !== 'webgl', 'test browser did not provide WebGL2')
  const bounds = await canvas.boundingBox()
  expect(bounds).toBeTruthy()
  if (!bounds) return
  await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.5)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * 0.72, bounds.y + bounds.height * 0.5, { steps: 8 })
  await page.mouse.up()
  await expect(canvas).toHaveAttribute('data-orbit-changed', 'true')
})

test('keeps explanation behind an observation step', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Исследовать' }).click()
  await expect(page.getByText('Сначала наблюдение')).toBeVisible()
  await expect(page.getByText(/Впечатление создаёт/)).toBeHidden()
  await page.getByRole('button', { name: 'Показать объяснение' }).click()
  await expect(page.getByText(/Впечатление создаёт/)).toBeVisible()
})

test('uses a separate mobile composition and remains keyboard accessible', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile project only')
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Покрова на Нерли' })).toBeVisible()
  await expect(page.locator('.left-panel-wrap')).toHaveCSS('bottom', '10px')
  await page.keyboard.press('Tab')
  await expect(page.locator(':focus')).toBeVisible()
})

test('honours reduced motion and survives repeated reloads', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.locator('canvas.viewer-canvas')).toHaveCount(1, { timeout: 15_000 })
  await page.reload()
  await page.reload()
  await expect(page.locator('canvas.viewer-canvas')).toHaveCount(1, { timeout: 15_000 })
})
