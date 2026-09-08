import { expect, test } from '@playwright/test'

test('WebGL sleeps at rest, wakes for orbit, and reports context loss', async ({ page }) => {
  await page.addInitScript(() => {
    const stats = { draws: 0 }
    Object.assign(window, { viewerStats: stats })
    for (const name of ['drawElements', 'drawArrays'] as const) {
      const original = WebGL2RenderingContext.prototype[name]
      // Count actual GPU draw submissions without changing viewer code or rendering.
      Object.defineProperty(WebGL2RenderingContext.prototype, name, {
        value: function (this: WebGL2RenderingContext, ...args: number[]) {
          stats.draws++
          return Reflect.apply(original, this, args)
        },
      })
    }
  })
  await page.goto('/?exhibit=russian-pistol-1798-1804')
  const stage=page.locator('.viewer-stage'), canvas=page.locator('.viewer-canvas')
  await expect(stage).toHaveAttribute('data-state','ready',{timeout:30_000})
  const draws = () => page.evaluate(() => (window as unknown as { viewerStats: { draws: number } }).viewerStats.draws)
  await page.waitForTimeout(1000)
  const resting = await draws()
  await page.waitForTimeout(350)
  expect(await draws()).toBe(resting)
  const box=(await canvas.boundingBox())!
  await page.mouse.move(box.x+box.width*.7,box.y+box.height*.3)
  await page.mouse.down(); await page.mouse.move(box.x+box.width*.9,box.y+box.height*.35,{steps:8}); await page.mouse.up()
  await expect(canvas).toHaveAttribute('data-orbit-changed','true')
  expect(await draws()).toBeGreaterThan(resting)
  await canvas.evaluate(node => node.dispatchEvent(new Event('webglcontextlost',{cancelable:true})))
  await expect(stage).toHaveAttribute('data-state','error')
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page.locator('.hotspot-marker:visible')).toHaveCount(0)
})
