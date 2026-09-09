import { expect, test } from '@playwright/test'

test('semantic pistol controls move hotspots, isolate parts, reset and survive exhibit replacement', async ({ page }, info) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?exhibit=russian-pistol-1798-1804')
  await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 })
  await expect(page.locator('.hotspot-marker:visible')).toHaveCount(6)
  await page.getByText('Устройство', { exact: true }).click()
  const marker = page.locator('[data-hotspot-id="pistol-cock"]')
  const initial = await marker.evaluate(element => ({ left: element.style.left, top: element.style.top }))
  await page.getByRole('button', { name: 'Разнести', exact: true }).click()
  await expect(page.locator('canvas.viewer-canvas')).toHaveAttribute('data-assembly-amount', '1')
  await expect.poll(() => marker.evaluate(element => element.style.top)).not.toBe(initial.top)
  await page.screenshot({ path: `artifacts/assembly-${info.project.name}.png` })
  await page.getByLabel('Элемент', { exact: true }).selectOption('lock.frizzen')
  await expect(page.getByRole('navigation', { name: 'Путь элемента' })).toContainText('Пистолет › Кремнёвый замок › Батарея')
  await page.getByLabel('Окружение', { exact: true }).selectOption('isolate')
  await expect(page.locator('[data-hotspot-id="pistol-stock"]')).toBeHidden()
  await page.getByLabel('Окружение', { exact: true }).selectOption('ghost')
  await page.getByRole('button', { name: 'Собрать', exact: true }).click()
  await page.getByRole('button', { name: 'Сбросить ракурс', exact: true }).click()
  await expect(page.locator('canvas.viewer-canvas')).toHaveAttribute('data-assembly-amount', '0')
  await expect.poll(() => marker.evaluate(element => element.style.top)).toBe(initial.top)
  await expect(page.locator('.hotspot-marker:visible')).toHaveCount(6)
  await page.getByText('Устройство', { exact: true }).click()
  await page.getByRole('button', { name: 'Кивер 1808 года', exact: true }).click()
  await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 })
  await expect(page.locator('.assembly-controls')).toHaveCount(0)
  await page.getByRole('button', { name: 'Пистолет 1798/1804 гг.', exact: true }).click()
  await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.getByText('Устройство', { exact: true }).click()
  await page.locator('canvas.viewer-canvas').evaluate(canvas => {
    const observer = new MutationObserver(() => {
      const value = Number(canvas.getAttribute('data-assembly-amount'))
      if (value > 0 && value < 1) canvas.setAttribute('data-assembly-intermediate', 'true')
      if (value === 1) observer.disconnect()
    })
    observer.observe(canvas, { attributes: true, attributeFilter: ['data-assembly-amount'] })
  })
  await page.getByRole('button', { name: 'Разнести', exact: true }).click()
  await expect(page.locator('canvas.viewer-canvas')).toHaveAttribute('data-assembly-amount', '1')
  await expect(page.locator('canvas.viewer-canvas')).toHaveAttribute('data-assembly-intermediate', 'true')
  expect(errors).toEqual([])
})

test('the actual GLB uses the same semantics and entity-local movement contract', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/?exhibit=russian-pistol-1798-1804')
  await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 })
  const result = await page.evaluate(async () => {
    // Vite serves these actual project modules; this verifies the existing binary,
    // loader, bindings and transforms together in a browser with texture decoding.
    const runtimePath = '/src/three/model-runtime.ts'
    const indexPath = '/src/three/SemanticSceneIndex.ts'
    const assemblyPath = '/src/three/AssemblySystem.ts'
    const contentPath = '/src/content/exhibits/russian-pistol-1798-1804/semantics.ts'
    const [{ loadExhibitModel }, { SemanticSceneIndex }, { AssemblySystem }, { pistolSemantics }] = await Promise.all([
      import(/* @vite-ignore */ runtimePath), import(/* @vite-ignore */ indexPath), import(/* @vite-ignore */ assemblyPath), import(/* @vite-ignore */ contentPath),
    ])
    const model = await loadExhibitModel({ kind: 'glb', src: '/src/content/exhibits/russian-pistol-1798-1804/models/pistol_1798_1804.glb' }, new AbortController().signal)
    try {
      const index = new SemanticSceneIndex(model.root, pistolSemantics)
      const assembly = new AssemblySystem(index)
      const anchor = { entityId: 'lock.frizzen', localPoint: [.01, .02, .03] }
      const before = index.getWorldPoint(anchor)
      assembly.setAmount(1)
      const moved = index.getWorldPoint(anchor).sub(before).toArray()
      assembly.reset()
      return { moved, resetError: index.getWorldPoint(anchor).distanceTo(before), count: index.getObjects('lock.frizzen').length }
    } finally { model.dispose() }
  })
  expect(result.count).toBe(8)
  expect(result.moved[0]).toBeCloseTo(.03, 8)
  expect(result.moved[1]).toBeCloseTo(.055, 8)
  expect(result.moved[2]).toBeCloseTo(.11, 8)
  expect(result.resetError).toBeLessThan(1e-10)
})
