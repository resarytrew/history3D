import { expect, test } from '@playwright/test'

test('musket loads, opens five details, resets and switches exhibits', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?exhibit=russian-musket-1808')
  await expect(page.getByRole('heading', { name: 'Пехотное ружьё' })).toBeVisible()
  const canvas = page.locator('canvas.viewer-canvas')
  await expect(canvas).toHaveAttribute('data-renderer', 'webgl', { timeout: 30_000 })
  await expect(page.locator('.viewer-poster')).toHaveCSS('opacity', '0', { timeout: 30_000 })
  for (const marker of await page.locator('.hotspot-marker').all()) {
    await expect(marker).toBeVisible()
    const offset = await marker.evaluate((b) => Math.abs(parseFloat(b.style.marginTop)))
    expect(offset).toBeGreaterThanOrEqual(48)
  }
  await page.screenshot({ path: `docs/verification/russian-musket-1808/integration-${testInfo.project.name}.png` })
  for (const [i, label] of ['Деревянная ложа', 'Кремнёвый замок', 'Латунные обоймицы', 'Длинный ствол', 'Передняя обоймица'].entries()) {
    const marker = page.getByRole('button', { name: `${i + 1}. ${label}`, exact: true })
    await expect(marker).toBeVisible()
    await marker.click()
    await expect(page.locator('.hotspot-card')).toBeVisible()
    await page.getByRole('button', { name: 'Сбросить ракурс' }).click()
    await expect(page.locator('.hotspot-card')).toHaveCount(0)
  }
  await page.getByRole('button', { name: 'Источники', exact: true }).click()
  await expect(page.getByRole('dialog')).toContainText('1811')
  await expect(page.getByRole('dialog')).toContainText('Обратная сторона')
  await expect(page.getByRole('dialog')).not.toContainText('TODO_RESEARCH')
  await page.getByRole('button', { name: 'Закрыть', exact: true }).click()
  const compare = page.getByRole('button', { name: 'Сравнить масштаб', exact: true })
  if (await compare.isVisible()) {
    await compare.click(); await expect(compare).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.hotspot-marker:visible')).toHaveCount(0)
    await page.screenshot({ path: `docs/verification/russian-musket-1808/scale-${testInfo.project.name}.png` })
    await compare.click()
  }
  await page.getByRole('button', { name: 'Кивер 1808 года', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Пехотный кивер' })).toBeVisible()
  await expect(page.locator('.viewer-poster')).toHaveCSS('opacity', '0', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Ружьё 1808 года', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Пехотное ружьё' })).toBeVisible()
  await expect(page.locator('.viewer-poster')).toHaveCSS('opacity', '0', { timeout: 30_000 })
  await page.getByRole('button', { name: 'Переключить язык' }).click()
  await expect(page.getByRole('heading', { name: 'Infantry musket' })).toBeVisible()
  expect(errors).toEqual([])
})

test('musket markers follow rotation, hide behind the object and return on reset', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?exhibit=russian-musket-1808')
  await expect(page.locator('.viewer-poster')).toHaveCSS('opacity', '0', { timeout: 30_000 })
  const canvas = page.locator('canvas.viewer-canvas'), bounds = (await canvas.boundingBox())!
  const lock = page.locator('[data-hotspot-id="musket-lock"]')
  await expect(lock).toBeVisible()
  const initial = await lock.evaluate((b) => b.style.left)
  const startX = bounds.x + bounds.width * 0.90, y = bounds.y + bounds.height * 0.31
  const delta = (Math.PI - Math.atan2(0.12, 2.10)) / (Math.PI * 2) * bounds.height
  await page.mouse.move(startX, y); await page.mouse.down()
  await page.mouse.move(startX - delta * 0.10, y, { steps: 4 })
  await expect.poll(() => lock.evaluate((b) => b.style.left)).not.toBe(initial)
  await page.mouse.move(startX - delta, y, { steps: 20 }); await page.mouse.up()
  await expect(lock).toBeHidden()
  await expect(page.locator('.hotspot-marker:visible')).toHaveCount(0)
  await page.screenshot({ path: `docs/verification/russian-musket-1808/orbit-${testInfo.project.name}.png` })
  await page.getByRole('button', { name: 'Сбросить ракурс' }).click()
  await expect(lock).toBeVisible()
  await expect.poll(async () => Math.abs(parseFloat(await lock.evaluate((b) => b.style.left)) - parseFloat(initial)) * bounds.width / 100).toBeLessThan(0.25)
})
