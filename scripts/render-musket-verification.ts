/// <reference lib="dom" />
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const out = resolve('docs/verification/russian-musket-1808')
const assets = resolve('src/content/exhibits/russian-musket-1808')
for (const path of [out, resolve(assets, 'images'), resolve(assets, 'backgrounds')]) await mkdir(path, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 4189, hmr: false, watch: null }, logLevel: 'error' })
await server.listen()
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 750 }, deviceScaleFactor: 1 })
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (e) => { if (e.type() === 'error') errors.push(e.text()) })
  await page.addInitScript({ content: 'window.__name = (fn) => fn' })
  await page.route('**/__musket-review', (route) => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto(server.resolvedUrls!.local[0] + '__musket-review')
  const metrics = await page.evaluate(async () => {
    const threeUrl = '/node_modules/three/build/three.module.js'
    const modelUrl = '/src/content/exhibits/russian-musket-1808/procedural/createRussianMusket1808.ts'
    const envUrl = '/src/three/artifactStudio.ts'
    const T = await import(/* @vite-ignore */ threeUrl)
    const { createRussianMusket1808 } = await import(/* @vite-ignore */ modelUrl)
    const { createArtifactEnvironment, createArtifactLights, artifactStudioExposure } = await import(/* @vite-ignore */ envUrl)
    document.body.style.cssText = 'margin:0;background:#eeeae2'
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(1500, 750); renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = artifactStudioExposure
    document.body.append(renderer.domElement)
    const scene = new T.Scene(); scene.background = new T.Color('#eeeae2')
    const environment = createArtifactEnvironment(renderer); scene.environment = environment.texture
    scene.add(createArtifactLights())
    const root = createRussianMusket1808(); scene.add(root); root.updateMatrixWorld(true)
    const camera = new T.PerspectiveCamera(28, 2, 0.001, 20)
    const render = (name: string) => {
      const views: Record<string, number[][]> = {
        right: [[0, 0.215, 1.85], [0, 0.215, 0]], left: [[0, 0.215, -1.85], [0, 0.215, 0]],
        hero: [[0.12, 0.74, 1.78], [0, 0.21, 0]], top: [[0, 2.05, 0.0001], [0, 0.21, 0]],
        bottom: [[0, -1.64, 0.0001], [0, 0.21, 0]],
        muzzle: [[1.04, 0.255, 0.12], [0.665, 0.23, 0]], butt: [[-1.16, 0.22, 0.25], [-0.62, 0.17, 0]],
        lock: [[-0.36, 0.31, 0.36], [-0.358, 0.248, 0.022]],
        furniture: [[0.58, 0.34, 0.39], [0.62, 0.229, 0]],
        wood: [[-0.50, 0.29, 0.46], [-0.515, 0.173, 0]],
        reverse: [[-0.36, 0.31, -0.36], [-0.358, 0.23, -0.022]],
      }
      const view = views[name]; camera.position.fromArray(view[0]); camera.up.set(0, 1, 0)
      camera.lookAt(new T.Vector3().fromArray(view[1])); renderer.render(scene, camera)
      return { calls: renderer.info.render.calls, renderedTriangles: renderer.info.render.triangles }
    }
    Object.assign(window, { musketReview: render, musketThumbnail: () => { renderer.setSize(640, 320); render('hero') } })
    let triangles = 0, meshes = 0
    root.traverse((o: InstanceType<typeof T.Mesh>) => { if (o.isMesh) { meshes++; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3 } })
    const box = new T.Box3().setFromObject(root)
    return { triangles, meshes, bounds: { min: box.min.toArray(), max: box.max.toArray(), size: box.getSize(new T.Vector3()).toArray() }, ...render('hero') }
  })
  const renders: Record<string, unknown> = {}
  for (const name of ['right', 'left', 'hero', 'top', 'bottom', 'muzzle', 'butt', 'lock', 'furniture', 'wood', 'reverse']) {
    renders[name] = await page.evaluate((name) => (window as unknown as { musketReview: (name: string) => unknown }).musketReview(name), name)
    await page.screenshot({ path: resolve(out, `${name}.png`) })
  }
  await copyFile(resolve(out, 'hero.png'), resolve(assets, 'images/poster.png'))
  await page.setViewportSize({ width: 640, height: 320 })
  await page.evaluate(() => (window as unknown as { musketThumbnail: () => void }).musketThumbnail())
  await page.screenshot({ path: resolve(assets, 'images/thumbnail.png') })
  await page.evaluate(() => { document.body.innerHTML = ''; document.body.style.background = '#dedbd2' })
  await page.screenshot({ path: resolve(assets, 'backgrounds/studio.png') })
  await writeFile(resolve(out, 'metrics.json'), JSON.stringify({ ...metrics, renders, errors }, null, 2) + '\n')
  if (errors.length) throw new Error(errors.join('\n'))
  console.log(JSON.stringify(metrics, null, 2))
} finally { await browser.close(); await server.close() }
