import { expect, test } from '@playwright/test'

test('uses the same animated loader for viewer and model, without a poster', async ({ page }, testInfo) => {
  test.setTimeout(90_000)
  let releaseViewer!: () => void, releaseModel!: () => void
  const viewerGate = new Promise<void>((resolve) => { releaseViewer = resolve })
  const modelGate = new Promise<void>((resolve) => { releaseModel = resolve })
  await page.route('**/src/features/exhibit-viewer/ExhibitViewer.tsx*', async (route) => { await viewerGate; await route.continue() })
  await page.route('**/src/content/exhibits/russian-musket-1808/procedural/createRussianMusket1808.ts*', async (route) => { await modelGate; await route.continue() })
  const posterRequests: string[] = []
  page.on('request', (request) => {
    if (request.resourceType() === 'image' && /\/images\/poster\./.test(request.url())) posterRequests.push(request.url())
  })
  try {
    await page.goto('/?exhibit=russian-musket-1808', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('.viewer-suspense .viewer-loading')).toBeVisible()
    await expect(page.locator('.viewer-stage img')).toHaveCount(0)
    await expect(page.locator('.viewer-loading-fill')).toHaveCSS('animation-name','exhibit-loading')
    await page.screenshot({ path: `artifacts/loading-${testInfo.project.name}.png` })
    releaseViewer()
    await expect(page.locator('canvas.viewer-canvas')).toHaveCount(1)
    await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state','loading')
    await expect(page.locator('.viewer-loading')).toBeVisible()
    await expect(page.locator('canvas.viewer-canvas')).toBeHidden()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await expect(page.locator('.viewer-loading-fill')).toHaveCSS('animation-name','none')
    releaseModel()
    await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state','ready',{timeout:30_000})
    await expect(page.locator('.viewer-loading')).toHaveCount(0)
    await expect(page.locator('canvas.viewer-canvas')).toBeVisible()
    await page.getByRole('button',{name:'Кивер 1808 года',exact:true}).click()
    await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state','ready',{timeout:30_000})
    await expect(page.locator('.viewer-stage img')).toHaveCount(0)
    expect(posterRequests).toEqual([])
  } finally { releaseViewer(); releaseModel() }
})

test('stops loading and shows a text error when WebGL is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    Object.defineProperty(HTMLCanvasElement.prototype,'getContext',{value:function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      return type === 'webgl2' ? null : Reflect.apply(original,this,[type,...args])
    }})
  })
  await page.goto('/?exhibit=russian-musket-1808')
  await expect(page.locator('.viewer-stage')).toHaveAttribute('data-state','error')
  await expect(page.getByRole('alert')).toContainText('Не удалось загрузить 3D-экспонат')
  await expect(page.locator('.viewer-loading')).toHaveCount(0)
  await expect(page.locator('.viewer-stage img')).toHaveCount(0)
  await page.getByRole('button',{name:'Переключить язык'}).click()
  await expect(page.getByRole('alert')).toContainText('The 3D exhibit could not be loaded')
})
