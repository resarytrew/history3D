/// <reference lib="dom" />
import { copyFile, mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { chromium } from '@playwright/test'
import { createServer } from 'vite'

const pass = Number(process.argv.find((a) => a.startsWith('--pass='))?.split('=')[1] ?? 5)
const hero = process.argv.includes('--hero')
const before = process.argv.includes('--before')
const historical = process.argv.includes('--1810')
const out = resolve('docs/verification/russian-shako-1808', historical ? '1810' : hero ? (before ? 'hero-before' : 'hero') : '.')
await mkdir(out, { recursive: true })
const server = await createServer({ server: { host: '127.0.0.1', port: 4187, hmr: false, watch: null }, logLevel: 'error' })
await server.listen()
const browser = await chromium.launch({ headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] })
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 1 })
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
  await page.addInitScript({ content: 'window.__name = (fn) => fn' })
  await page.route('**/__shako-review', (route) => route.fulfill({ contentType: 'text/html', body: '<html><body></body></html>' }))
  await page.goto(server.resolvedUrls!.local[0] + '__shako-review')
  const metrics = await page.evaluate(async ({ passNumber, hero }) => {
    // Imports are resolved by the running Vite dev server, using the real Three.js WebGL renderer.
    const threeUrl = '/node_modules/three/build/three.module.js'
    const modelUrl = '/src/content/exhibits/russian-shako-1808/procedural/createRussianShako1808.ts'
    const envUrl = '/src/three/artifactStudio.ts'
    const T = await import(/* @vite-ignore */ threeUrl)
    const { createRussianShako1808ForPass } = await import(/* @vite-ignore */ modelUrl)
    const { createArtifactEnvironment, createArtifactLights, artifactStudioExposure } = await import(/* @vite-ignore */ envUrl)
    document.body.innerHTML = ''
    document.body.style.cssText = 'margin:0;background:#eeeae2'
    const renderer = new T.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true })
    renderer.setSize(800, 900)
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = artifactStudioExposure
    document.body.append(renderer.domElement)
    const scene = new T.Scene()
    scene.background = new T.Color('#eeeae2')
    scene.environment = createArtifactEnvironment(renderer).texture
    scene.add(createArtifactLights())
    const shadowSun = new T.DirectionalLight('#ffe8c4', 0.35); shadowSun.position.set(8, 11, 7); scene.add(shadowSun)
    const root = createRussianShako1808ForPass(passNumber)
    scene.add(root)
    if (hero) {
      scene.environmentRotation.y = 0.25
      const grazing = new T.DirectionalLight('#f4eee1', 0.4)
      grazing.name = 'HeroReviewRakingLight'; grazing.position.set(3, 1, 4); scene.add(grazing)
    }
    const camera = new T.PerspectiveCamera(34, 800 / 900, 0.001, 10)
    const target = new T.Vector3(0, 0.16, 0), radius = 0.91
    const review = (angle: number, top = false) => {
      camera.position.set(top ? 0 : Math.sin(angle) * radius, top ? target.y + Math.hypot(radius, 0.12) : target.y + 0.12, top ? 0.00001 : Math.cos(angle) * radius)
      camera.lookAt(target); renderer.render(scene, camera)
      return { drawCalls: renderer.info.render.calls, renderedTriangles: renderer.info.render.triangles }
    }
    Object.assign(window, { shakoReview: review, shakoDetail: (part: string) => {
      const points: Record<string, { target: number[], position: number[] }> = {
        badge: { target: [0, 0.157, 0.127], position: [0.022, 0.18, 0.34] },
        leather: { target: [0.074, 0.13, 0.08], position: [0.36, 0.27, 0.44] },
        textile: { target: [-0.123, 0.125, 0], position: [-0.38, 0.17, 0.12] },
      }
      camera.position.fromArray(points[part].position); camera.lookAt(new T.Vector3().fromArray(points[part].target)); renderer.render(scene, camera)
    } })
    Object.assign(window, { shakoInterior: (section: boolean) => {
      renderer.clippingPlanes = section ? [new T.Plane(new T.Vector3(-1, 0, 0), 0)] : []
      camera.position.set(section ? 0.5 : 0.06, section ? 0.22 : -0.48, section ? 0.45 : 0.10)
      camera.lookAt(new T.Vector3(0, 0.16, 0)); renderer.render(scene, camera)
      renderer.clippingPlanes = []
    } })
    Object.assign(window, { shakoHero: (name: string) => {
      const repyok = new T.Box3().setFromObject(root.getObjectByName('Repyok')).getCenter(new T.Vector3())
      const badge = new T.Box3().setFromObject(root.getObjectByName('FrontBadge_OneFlameGrenade')).getCenter(new T.Vector3())
      const frame = (target: InstanceType<typeof T.Vector3>, offset: number[]) => {
        camera.position.copy(target).add(new T.Vector3().fromArray(offset)); camera.lookAt(target); renderer.render(scene, camera)
      }
      if (name.startsWith('repyok-')) {
        const angle = name.endsWith('side') ? Math.PI / 2 : name.endsWith('three-quarter') ? Math.PI / 4 : 0
        frame(repyok, [Math.sin(angle) * 0.16, 0.008, Math.cos(angle) * 0.16]); return
      }
      if (name.startsWith('badge-')) {
        const angle = name.endsWith('side') ? Math.PI * 0.47 : name.endsWith('three-quarter') ? Math.PI / 4 : 0
        frame(badge, [Math.sin(angle) * 0.20, 0.012, Math.cos(angle) * 0.20]); return
      }
      const close: Record<string, { target: number[], offset: number[] }> = {
        '01-shell-material-close': { target: [0.061, 0.18, 0.100], offset: [0.100, 0.01, 0.18] },
        '02-leather-band-close': { target: [0.035, 0.24, 0.121], offset: [0.1, 0.045, 0.19] },
        '03-visor-close': { target: [0.032, 0.052, 0.15], offset: [0.13, 0.20, 0.21] },
        '04-grenade-close': { target: badge.toArray(), offset: [0.065, 0.025, 0.20] },
        '05-repyok-close': { target: repyok.toArray(), offset: [0.055, 0.012, 0.16] },
        '06-etishkhet-close': { target: [0.073, 0.139, 0.10], offset: [0.15, 0.025, 0.16] },
        '07-tassel-close': { target: [-0.14, 0.075, 0], offset: [-0.15, 0.025, 0.075] },
        '08-rear-buckle-close': { target: [0, 0.10, -0.112], offset: [-0.075, 0.02, -0.145] },
      }
      if (close[name]) { frame(new T.Vector3().fromArray(close[name].target), close[name].offset); return }
      if (name === 'distance-macro') { frame(badge, [0.035, 0.02, 0.19]); return }
      // A 0.86 m distance frames approximately 60% height; research uses half that distance.
      const distance = name === 'distance-research' ? 0.43 : 0.86
      frame(new T.Vector3(0, 0.164, 0), [Math.sin(Math.PI / 6) * distance, distance * 0.14, Math.cos(Math.PI / 6) * distance])
    } })
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
  }, { passNumber: pass, hero })
  const views = { front: 0, 'front-right': 45, right: 90, 'rear-right': 135, rear: 180, left: 270, top: 0 }
  const renders: Record<string, unknown> = {}
  for (const [name, degrees] of Object.entries(views)) {
    renders[name] = await page.evaluate(({ angle, top }) => {
      return (window as unknown as { shakoReview: (angle: number, top: boolean) => unknown }).shakoReview(angle, top)
    }, { angle: degrees * Math.PI / 180, top: name === 'top' })
    await page.screenshot({ path: resolve(out, `pass-${pass}-${name}.png`) })
  }
  if (pass === 5) for (const part of ['badge', 'leather', 'textile']) {
    await page.evaluate((part) => (window as unknown as { shakoDetail: (part: string) => void }).shakoDetail(part), part)
    await page.screenshot({ path: resolve(out, `fidelity-${part}.png`) })
  }
  if (hero) {
    const names = ['repyok-front', 'repyok-three-quarter', 'repyok-side', 'badge-front', 'badge-three-quarter', 'badge-side',
      '01-shell-material-close', '02-leather-band-close', '03-visor-close', '04-grenade-close', '05-repyok-close', '06-etishkhet-close', '07-tassel-close', '08-rear-buckle-close',
      'distance-hero', 'distance-research', 'distance-macro']
    for (const name of names) {
      await page.evaluate((name) => (window as unknown as { shakoHero: (name: string) => void }).shakoHero(name), name)
      await page.screenshot({ path: resolve(out, `${name}.png`) })
    }
  }
  if (historical) for (const name of ['bottom', 'section']) {
    await page.evaluate((section) => (window as unknown as { shakoInterior: (section: boolean) => void }).shakoInterior(section), name === 'section')
    await page.screenshot({ path: resolve(out, `pass-${pass}-${name}.png`) })
  }
  await writeFile(resolve(out, `pass-${pass}-metrics.json`), JSON.stringify({ ...metrics, renders }, null, 2) + '\n')
  if (pass === 5 && !before) {
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
  if (errors.length) throw new Error(`WebGL review errors:\n${errors.join('\n')}`)
  console.log(JSON.stringify(metrics, null, 2))
} finally { await browser.close(); await server.close() }
