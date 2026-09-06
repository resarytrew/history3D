import { expect, test } from '@playwright/test'

test('allows an underside inspection and returns to the initial view', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?exhibit=russian-shako-1808')
  await expect(page.locator('.viewer-poster')).toHaveCSS('opacity', '0', { timeout: 30_000 })
  const canvas = page.locator('canvas.viewer-canvas')
  const box = (await canvas.boundingBox())!
  const x = box.x + box.width * 0.85, y = box.y + box.height * 0.47
  await page.mouse.move(x, y); await page.mouse.down()
  await page.mouse.move(x, y - box.height * 0.26, { steps: 10 }); await page.mouse.up()
  await expect(canvas).toHaveAttribute('data-orbit-changed', 'true')
  await expect(page.locator('[data-hotspot-id="shako-repyok"]')).toBeHidden()
  await page.screenshot({ path: `docs/verification/russian-shako-1808/1810/underside-${testInfo.project.name}.png` })
  await page.getByRole('button', { name: 'Сбросить ракурс' }).click()
  await expect(page.locator('[data-hotspot-id="shako-repyok"]')).toBeVisible()
  await page.getByRole('button', { name: 'Источники', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('1810')
  await expect(page.getByRole('dialog')).toContainText('Обмеры гренады')
})

test('detail markers follow the orbit and disappear on the back of the shako', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?exhibit=russian-shako-1808')
  await expect(page.locator('.viewer-poster')).toHaveCSS('opacity', '0', { timeout: 30_000 })
  const canvas = page.locator('canvas.viewer-canvas'), bounds = (await canvas.boundingBox())!
  const badge = page.locator('[data-hotspot-id="shako-grenade"]')
  const repyok = page.locator('[data-hotspot-id="shako-repyok"]')
  await expect(badge).toBeVisible(); await expect(repyok).toBeVisible()
  const before = await badge.evaluate((button) => ({ x: button.style.left, y: button.style.top }))
  // OrbitControls uses viewport height to convert pointer delta to a full revolution.
  const startX = bounds.x + bounds.width * 0.9, y = bounds.y + bounds.height * 0.44
  const initialAzimuth = Math.atan2(0.37, 0.79)
  const delta = (Math.PI - initialAzimuth) / (Math.PI * 2) * bounds.height
  await page.mouse.move(startX, y); await page.mouse.down()
  await page.mouse.move(startX - delta * 0.1, y, { steps: 4 })
  await expect.poll(() => badge.evaluate((button) => button.style.left)).not.toBe(before.x)
  await page.mouse.move(startX - delta, y, { steps: 28 }); await page.mouse.up()
  await expect(badge).toBeHidden(); await expect(repyok).toBeHidden()
  await expect(page.locator('[data-hotspot-id="shako-cord"]')).toBeHidden()
  await page.screenshot({ path: `docs/verification/russian-shako-1808/1810/markers-rear-${testInfo.project.name}.png` })
  await page.getByRole('button', { name: 'Сбросить ракурс' }).click()
  await expect(badge).toBeVisible(); await expect(repyok).toBeVisible()
  // OrbitControls round-trips through spherical coordinates; compare screen pixels,
  // not decimal serialisations of otherwise identical floating-point positions.
  await expect.poll(async () => Math.abs(parseFloat(await badge.evaluate((button) => button.style.left)) - parseFloat(before.x)) * bounds.width / 100).toBeLessThan(0.25)
  await expect.poll(async () => Math.abs(parseFloat(await badge.evaluate((button) => button.style.top)) - parseFloat(before.y)) * bounds.height / 100).toBeLessThan(0.25)
})

test('shako loads in WebGL, exposes all six details and survives collection switching', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error' && /WebGL|shader/i.test(message.text())) errors.push(message.text()) })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?exhibit=russian-shako-1808')
  await expect(page.getByRole('heading', { name: 'Пехотный кивер' })).toBeVisible()
  const canvas = page.locator('canvas.viewer-canvas')
  const originalCanvas = await canvas.elementHandle()
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl', { timeout: 30_000 })
  await expect(canvas).toHaveAttribute('data-lighting', 'artifact-studio')
  await expect(page.locator('.viewer-poster')).toHaveClass(/is-hidden/, { timeout: 30_000 })
  await expect(page.locator('.viewer-poster')).toHaveCSS('opacity', '0', { timeout: 30_000 })
  await page.screenshot({ path: `docs/verification/russian-shako-1808/1810/integration-${testInfo.project.name}.png` })
  const labels = ['Форма тульи', 'V-образное усиление', 'Гренада об одном огне', 'Репеёк', 'Этишкет', 'Козырёк']
  for (const [i, label] of labels.entries()) {
    const marker = page.getByRole('button', { name: `${i + 1}. ${label}`, exact: true })
    await expect(marker).toBeVisible()
    await marker.click()
    await expect(page.locator('.hotspot-card')).toBeVisible()
    await expect(page.locator('.hotspot-card details')).not.toHaveAttribute('open')
    await page.locator('.hotspot-card summary').click()
    await expect(page.locator('.hotspot-card details p')).toBeVisible()
    await page.getByRole('button', { name: 'Сбросить ракурс' }).click()
    await expect(page.locator('.hotspot-card')).toHaveCount(0)
  }
  if (testInfo.project.name === 'chromium') {
    const compare = page.getByRole('button', { name: 'Сравнить масштаб', exact: true })
    await compare.click()
    await expect(compare).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.hotspot-marker:visible')).toHaveCount(0)
    await page.screenshot({ path: 'docs/verification/russian-shako-1808/1810/scale-comparison.png' })
    await compare.click()
    await expect(compare).toHaveAttribute('aria-pressed', 'false')
  }
  const bounds = (await canvas.boundingBox())!
  await page.mouse.move(bounds.x + bounds.width * 0.6, bounds.y + bounds.height * 0.4)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * 0.9, bounds.y + bounds.height * 0.4, { steps: 12 })
  await page.mouse.up()
  await expect(canvas).toHaveAttribute('data-orbit-changed', 'true')
  await page.getByRole('button', { name: 'Источники', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('Восстановлено')
  await expect(page.getByRole('dialog')).toContainText('Пока неизвестно')
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
  await page.getByRole('combobox', { name: 'Коллекция' }).selectOption('ancient-rus')
  await page.getByRole('button', { name: 'Шлем Ивана IV', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Шлем Ивана IV' })).toBeVisible()
  await expect(canvas).toHaveAttribute('data-lighting', 'default', { timeout: 30_000 })
  await page.getByRole('combobox', { name: 'Коллекция' }).selectOption('russian-empire')
  await expect(page.getByRole('heading', { name: 'Пехотный кивер' })).toBeVisible()
  await expect(page.locator('.viewer-poster')).toHaveClass(/is-hidden/, { timeout: 30_000 })
  expect(await originalCanvas!.evaluate((element) => element.isConnected)).toBe(true)
  await expect(canvas).toHaveAttribute('data-lighting', 'artifact-studio')
  await page.getByRole('button', { name: 'Переключить язык' }).click()
  await expect(page.getByRole('heading', { name: 'Infantry shako' })).toBeVisible()
  expect(errors).toEqual([])
})
