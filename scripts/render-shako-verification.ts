/// <reference lib="dom" />
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const pass = Number(process.argv.find((a) => a.startsWith('--pass='))?.split('=')[1] ?? 5)
const out = resolve('docs/verification/russian-shako-1808')
await mkdir(out, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 4187, hmr: false, watch: null }, logLevel: 'error' })
await server.listen()
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 1 })
  await page.addInitScript({ content: 'window.__name = (fn) => fn' })
  await page.route('**/__shako-review', (route) => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto(server.resolvedUrls!.local[0] + '__shako-review')
  const metrics = await page.evaluate(async (passNumber) => {
    // Imports are resolved by the running Vite dev server, using the real Three.js WebGL renderer.
    const threeUrl = '/node_modules/three/build/three.module.js'
    const modelUrl = '/src/content/exhibits/russian-shako-1808/procedural/createRussianShako1808.ts'
    const envUrl = '/node_modules/three/examples/jsm/environments/RoomEnvironment.js'
    const T = await import(/* @vite-ignore */ threeUrl)
    const { createRussianShako1808ForPass } = await import(/* @vite-ignore */ modelUrl)
    const { RoomEnvironment } = await import(/* @vite-ignore */ envUrl)
    document.body.innerHTML = ''
    document.body.style.cssText = 'margin:0;background:#eeeae2'
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(800, 900)
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.85
    document.body.append(renderer.domElement)
    const scene = new T.Scene()
    scene.background = new T.Color('#eeeae2')
    const pmrem = new T.PMREMGenerator(renderer), room = new RoomEnvironment()
    scene.environment = pmrem.fromScene(room, 0.04).texture
    scene.environmentIntensity = 0.7
    scene.add(new T.HemisphereLight('#e7efff', '#777063', 0.9))
    const key = new T.DirectionalLight('#fff0da', 2); key.position.set(1, 2, 3); scene.add(key)
    const fill = new T.DirectionalLight('#dce8ff', 1); fill.position.set(-2, 1, -1); scene.add(fill)
    const root = createRussianShako1808ForPass(passNumber)
    scene.add(root)
    const camera = new T.PerspectiveCamera(34, 800 / 900, 0.001, 10)
    const target = new T.Vector3(0, 0.16, 0), radius = 0.91
    const review = (angle: number, top = false) => {
      camera.position.set(top ? 0 : Math.sin(angle) * radius, top ? target.y + Math.hypot(radius, 0.12) : target.y + 0.12, top ? 0.00001 : Math.cos(angle) * radius)
      camera.lookAt(target); renderer.render(scene, camera)
      return { drawCalls: renderer.info.render.calls, renderedTriangles: renderer.info.render.triangles }
    }
    Object.assign(window, { shakoReview: review })
    Object.assign(window, { shakoThumbnail: () => {
      renderer.setSize(320, 240)
      camera.aspect = 320 / 240
      camera.updateProjectionMatrix()
      review(Math.PI / 4)
    } })
    let triangles = 0, meshes = 0, visibleTriangles = 0
    root.traverse((o: InstanceType<typeof T.Mesh>) => {
      if (!o.isMesh) return
      meshes++; triangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3
    })
    root.traverseVisible((o: InstanceType<typeof T.Mesh>) => {
      if (o.isMesh) visibleTriangles += (o.geometry.index?.count ?? o.geometry.attributes.position.count) / 3
    })
    const box = new T.Box3()
    root.updateMatrixWorld(true)
    root.traverseVisible((o: InstanceType<typeof T.Mesh>) => { if (o.isMesh) box.expandByObject(o) })
    const sizeOf = (name: string) => new T.Box3().setFromObject(root.getObjectByName(name)).getSize(new T.Vector3())
    const body = root.getObjectByName('FeltLowerWithRearSlit').geometry.attributes.position
    let bottomRadius = 0
    for (let i = 0; i < body.count; i++) if (Math.abs(body.getY(i) - 0.08) < 1e-6) bottomRadius = Math.max(bottomRadius, Math.hypot(body.getX(i), body.getZ(i)))
    const arm = root.getObjectByName('VArm1')?.geometry.attributes.position
    const dimensionsMm = {
      shellHeight: sizeOf('Shell').y * 1000,
      topDiameter: sizeOf('OuterTopRim').x * 1000,
      bottomDiameter: bottomRadius * 2000,
      visorProjection: (new T.Box3().setFromObject(root.getObjectByName('Visor')).max.z - bottomRadius) * 1000,
      vStrapWidth: arm ? new T.Vector3().fromBufferAttribute(arm, 80).distanceTo(new T.Vector3().fromBufferAttribute(arm, 84)) * 1000 : null,
      lowerBand: sizeOf('LowerBand').y * 1000,
    }
    return { pass: passNumber, triangles, visibleTriangles, meshes, dimensionsMm, boundingBox: { min: box.min.toArray(), max: box.max.toArray(), size: box.getSize(new T.Vector3()).toArray() }, ...review(0) }
  }, pass)
  const views = { front: 0, 'front-right': 45, right: 90, 'rear-right': 135, rear: 180, left: 270, top: 0 }
  const renders: Record<string, unknown> = {}
  for (const [name, degrees] of Object.entries(views)) {
    renders[name] = await page.evaluate(({ angle, top }) => {
      return (window as unknown as { shakoReview: (angle: number, top: boolean) => unknown }).shakoReview(angle, top)
    }, { angle: degrees * Math.PI / 180, top: name === 'top' })
    await page.screenshot({ path: resolve(out, `pass-${pass}-${name}.png`) })
  }
  await writeFile(resolve(out, `pass-${pass}-metrics.json`), JSON.stringify({ ...metrics, renders }, null, 2) + '\n')
  if (pass === 5) {
    const assets = resolve('src/content/exhibits/russian-shako-1808')
    await mkdir(resolve(assets, 'images'), { recursive: true })
    await mkdir(resolve(assets, 'backgrounds'), { recursive: true })
    await copyFile(resolve(out, 'pass-5-front-right.png'), resolve(assets, 'images/poster.png'))
    await page.setViewportSize({ width: 320, height: 240 })
    await page.evaluate(() => (window as unknown as { shakoThumbnail: () => void }).shakoThumbnail())
    await page.screenshot({ path: resolve(assets, 'images/thumbnail.png') })
    await page.evaluate(() => { document.body.innerHTML = ''; document.body.style.background = '#dedbd2' })
    await page.screenshot({ path: resolve(assets, 'backgrounds/studio.png') })
  }
  console.log(JSON.stringify(metrics, null, 2))
} finally { await browser.close(); await server.close() }
