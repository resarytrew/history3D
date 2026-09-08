import { execFile } from 'node:child_process'
import { createRequire } from 'node:module'
import { promisify } from 'node:util'
import { expect, test } from '@playwright/test'

const execute = promisify(execFile)
const tsxCli = createRequire(import.meta.url).resolve('tsx/cli')

test('runtime validation preserves lazy imports in an already open dev viewer', async ({ page }, info) => {
  await page.goto('/?exhibit=russian-pistol-1798-1804')
  const stage = page.locator('.viewer-stage')
  await expect(stage).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
  await page.evaluate(() => { document.documentElement.dataset.validationDocument = 'original' })
  const result = await execute(process.execPath, [tsxCli, 'scripts/validate-content.ts'], { timeout: 30_000 })
  expect(result.stdout).toContain('Content validation passed')
  await info.attach('runtime-validation', { body: result.stdout + result.stderr, contentType: 'text/plain' })
  // This factory and its optimized modifier import have not been requested in this document yet.
  await page.getByRole('button', { name: 'Ружьё 1808 года', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Пехотное ружьё' })).toBeVisible()
  await expect(stage).toHaveAttribute('data-state', 'ready', { timeout: 30_000 })
  await expect(page.locator('html')).toHaveAttribute('data-validation-document', 'original')
})
