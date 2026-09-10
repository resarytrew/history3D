import { expect, test } from '@playwright/test'
test.use({ actionTimeout: 12_000 })

test('named layouts, virtual groups, keyboard tree and exhibit replacement', async ({ page }, info) => {
  test.setTimeout(180_000)
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?exhibit=russian-pistol-1798-1804')
  const canvas = page.locator('canvas.viewer-canvas')
  await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 })
  await expect(page.locator('.hotspot-marker')).toHaveCount(0)
  const tree = page.getByRole('tree', { name: 'Структура' })
  await expect(tree.getByText('Спусковой узел', { exact: true })).toHaveCount(0)
  await tree.getByRole('treeitem', { name: 'Пистолет', exact: true }).focus()
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
  await expect(canvas).toHaveAttribute('data-selection', 'entity:stock')
  for (const width of [320, 390, 768, 1280]) {
    await page.setViewportSize({ width, height: 900 })
    await page.getByRole('button', { name: 'Схема разборки', exact: true }).click()
    await expect(canvas).toHaveAttribute('data-assembly-context', 'overview')
    await expect(page.getByRole('alert')).toHaveCount(0)
    await page.screenshot({ path: `artifacts/assembly-overview-${width}-${info.project.name}.png` })
    await page.getByRole('button', { name: 'Спусковой узел', exact: true }).click()
    await expect(page.locator('.semantic-card')).toContainText('Группа схемы')
    await expect(tree.locator('[data-group-member="true"]')).toHaveCount(2)
    await page.getByRole('button', { name: 'Раскрыть узел', exact: true }).click()
    await expect(canvas).toHaveAttribute('data-assembly-context', 'trigger')
    await page.getByRole('button', { name: 'Назад', exact: true }).click()
    await expect(canvas).toHaveAttribute('data-selection', 'group:overview:trigger-group')
    await page.getByRole('button', { name: 'Кремнёвый замок', exact: true }).click()
    await page.getByRole('button', { name: 'Раскрыть узел', exact: true }).click()
    await expect(canvas).toHaveAttribute('data-assembly-context', 'lock')
    await page.getByRole('button', { name: 'Батарея', exact: true }).click()
    await page.getByRole('button', { name: 'Изолировать', exact: true }).click()
    await page.getByRole('button', { name: 'Полупрозрачное окружение', exact: true }).click()
    await page.getByRole('button', { name: 'Вернуть схему', exact: true }).click()
    await page.screenshot({ path: `artifacts/assembly-v2-${width}-${info.project.name}.png` })
    await page.getByRole('button', { name: 'Собрать всё', exact: true }).click()
    await expect(canvas).toHaveAttribute('data-assembly-context', 'assembled')
  }
  await page.getByText('Устройство', { exact: true }).click()
  await page.getByRole('button', { name: 'Кивер 1808 года', exact: true }).click()
  await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 })
  await expect(page.locator('.hotspot-marker:visible')).not.toHaveCount(0)
  await expect(page.locator('.assembly-controls')).toHaveCount(0)
  expect(errors).toEqual([])
})

test('actual GLB snapshots solve all layouts at supported CSS sizes', async ({ page }, info) => {
  test.setTimeout(180_000)
  await page.goto('/?exhibit=russian-pistol-1798-1804')
  await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state', 'ready', { timeout: 60_000 })
  const result = await page.evaluate(async () => {
    const load = (path: string) => import(/* @vite-ignore */ path)
    const [{ loadExhibitModel }, { SemanticSceneIndex }, { AssemblySystem }, { pistolSemantics }, { pistolAssembly }, { AssemblyLayoutSolver, snapshotBounds }] = await Promise.all([
      load('/src/three/model-runtime.ts'), load('/src/three/SemanticSceneIndex.ts'), load('/src/three/AssemblySystem.ts'),
      load('/src/content/exhibits/russian-pistol-1798-1804/semantics.ts'), load('/src/content/exhibits/russian-pistol-1798-1804/assembly.ts'), load('/src/three/AssemblyLayoutSolver.ts'),
    ])
    const model = await loadExhibitModel({ kind: 'glb', src: '/src/content/exhibits/russian-pistol-1798-1804/models/pistol_1798_1804.glb' }, new AbortController().signal)
    try {
      const index = new SemanticSceneIndex(model.root, pistolSemantics), assembly = new AssemblySystem(index), objects = snapshotBounds(index)
      const before = index.getWorldPoint(pistolSemantics.find((e: { id: string }) => e.id === 'marking.tula-1803').focusAnchor)
      const results = []
      for (const width of [304, 374, 410, 922]) for (const layout of pistolAssembly.layouts) {
        const solved = new AssemblyLayoutSolver().solve({ objects, entities: pistolSemantics, layout, referenceView: pistolAssembly.referenceView, width, height: width < 400 ? 532 : 520 })
        if (solved.ok) assembly.setPose(solved.pose)
        results.push({ width, layout: layout.id, ok: solved.ok, diagnostics: solved.diagnostics })
      }
      assembly.reset()
      return { results, resetError: index.getWorldPoint(pistolSemantics.find((e: { id: string }) => e.id === 'marking.tula-1803').focusAnchor).distanceTo(before) }
    } finally { model.dispose() }
  })
  expect(result.results.filter(r => !r.ok)).toEqual([])
  expect(result.resetError).toBeLessThan(1e-10)
  await info.attach('glb-layout-results', { body: JSON.stringify(result, null, 2), contentType: 'application/json' })
})
