import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { chromium } from '@playwright/test'
import {
  Color,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Vector3,
} from 'three'
import {
  createPokrovNaNerliModel,
  createPokrovNaNerliModelForPass,
  type ReconstructionPass,
} from '../src/content/exhibits/pokrov-na-nerli/procedural/createPokrovNaNerliModel'

type ViewName = 'front' | 'right' | 'rear' | 'left'

interface ProjectedTriangle {
  readonly points: string
  readonly depth: number
  readonly fill: string
}

const width = 640
const height = 760
const outputDirectory = resolve('docs/verification/pokrov-na-nerli')
const lightDirection = new Vector3(8, 11, 7).normalize()
const target = new Vector3(0, 3.8, 0)
const views: Readonly<Record<ViewName, Vector3>> = {
  front: new Vector3(0, 4.8, 17.5),
  right: new Vector3(17.5, 4.8, 0),
  rear: new Vector3(0, 4.8, -17.5),
  left: new Vector3(-17.5, 4.8, 0),
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function materialColour(mesh: Mesh): Color {
  const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material
  return material instanceof MeshStandardMaterial ? material.color.clone() : new Color(0xe3decf)
}

function shadeColour(base: Color, normal: Vector3): string {
  const diffuse = clamp(normal.dot(lightDirection) * 0.48 + 0.58, 0.32, 1.06)
  const shaded = base.clone().multiplyScalar(diffuse)
  return `#${shaded.getHexString()}`
}

function renderView(name: string, cameraPosition: Vector3, pass: ReconstructionPass = 3): { svg: string; signature: string; visibleTriangles: number } {
  const root = createPokrovNaNerliModelForPass(pass)
  root.updateMatrixWorld(true)
  const camera = new PerspectiveCamera(34, width / height, 0.1, 100)
  camera.position.copy(cameraPosition)
  camera.lookAt(target)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  const triangles: ProjectedTriangle[] = []
  const a = new Vector3()
  const b = new Vector3()
  const c = new Vector3()
  const ab = new Vector3()
  const ac = new Vector3()
  const normal = new Vector3()
  const centre = new Vector3()
  const viewDirection = new Vector3()

  root.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const position = object.geometry.getAttribute('position')
    if (!position) return
    const index = object.geometry.index
    const triangleCount = index ? index.count / 3 : position.count / 3
    const base = materialColour(object)

    for (let triangle = 0; triangle < triangleCount; triangle += 1) {
      const ia = index ? index.getX(triangle * 3) : triangle * 3
      const ib = index ? index.getX(triangle * 3 + 1) : triangle * 3 + 1
      const ic = index ? index.getX(triangle * 3 + 2) : triangle * 3 + 2
      a.fromBufferAttribute(position, ia).applyMatrix4(object.matrixWorld)
      b.fromBufferAttribute(position, ib).applyMatrix4(object.matrixWorld)
      c.fromBufferAttribute(position, ic).applyMatrix4(object.matrixWorld)
      ab.subVectors(b, a)
      ac.subVectors(c, a)
      normal.crossVectors(ab, ac).normalize()
      centre.copy(a).add(b).add(c).multiplyScalar(1 / 3)
      viewDirection.subVectors(camera.position, centre).normalize()
      if (normal.dot(viewDirection) <= 0.01) continue

      const pa = a.clone().project(camera)
      const pb = b.clone().project(camera)
      const pc = c.clone().project(camera)
      if ([pa, pb, pc].some((point) => point.z < -1 || point.z > 1)) continue
      const screen = [pa, pb, pc].map((point) => ({
        x: (point.x * 0.5 + 0.5) * width,
        y: (-point.y * 0.5 + 0.5) * height,
      }))
      const area = Math.abs(
        screen[0].x * (screen[1].y - screen[2].y)
        + screen[1].x * (screen[2].y - screen[0].y)
        + screen[2].x * (screen[0].y - screen[1].y),
      ) / 2
      if (area < 0.025) continue
      triangles.push({
        points: screen.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(' '),
        depth: (pa.z + pb.z + pc.z) / 3,
        fill: shadeColour(base, normal),
      })
    }
  })

  triangles.sort((left, right) => right.depth - left.depth)
  const polygons = triangles.map((triangle) => `<polygon points="${triangle.points}" fill="${triangle.fill}"/>`).join('')
  const signature = createHash('sha256').update(polygons).digest('hex')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#b8d6e5"/><stop offset="0.68" stop-color="#e9e2cf"/><stop offset="1" stop-color="#809477"/></linearGradient></defs>
  <rect width="${width}" height="${height}" fill="url(#sky)"/>
  <ellipse cx="320" cy="665" rx="210" ry="36" fill="#314a3d" opacity="0.2"/>
  <g stroke="#3b413e" stroke-opacity="0.08" stroke-width="0.35" stroke-linejoin="round">${polygons}</g>
  <rect x="20" y="20" width="220" height="34" rx="17" fill="#123d33" opacity="0.9"/>
  <text x="34" y="42" font-family="Arial, sans-serif" font-size="13" fill="#fff8e7">${name.toUpperCase()}</text>
</svg>`
  return { svg, signature, visibleTriangles: triangles.length }
}

await mkdir(outputDirectory, { recursive: true })
const model = createPokrovNaNerliModel()
let meshCount = 0
let vertexCount = 0
let triangleCount = 0
model.traverse((object) => {
  if (!(object instanceof Mesh)) return
  meshCount += 1
  const position = object.geometry.getAttribute('position')
  vertexCount += position?.count ?? 0
  triangleCount += object.geometry.index ? object.geometry.index.count / 3 : (position?.count ?? 0) / 3
})

const renderedViews: Record<string, { signature: string; visibleTriangles: number; svg: string; screenshot: string }> = {}
for (const [name, cameraPosition] of Object.entries(views) as [ViewName, Vector3][]) {
  const rendered = renderView(name, cameraPosition)
  const svgName = `${name}.svg`
  await writeFile(resolve(outputDirectory, svgName), rendered.svg, 'utf8')
  renderedViews[name] = { signature: rendered.signature, visibleTriangles: rendered.visibleTriangles, svg: svgName, screenshot: `${name}.png` }
}

const refinementViews = {
  front: new Vector3(0, 4.8, 17.5),
  'three-quarter': new Vector3(11.4, 5.1, 14.8),
  side: new Vector3(17.5, 4.8, 0),
  rear: new Vector3(0, 4.8, -17.5),
} as const
for (const pass of [1, 2, 3] as const) {
  for (const [name, cameraPosition] of Object.entries(refinementViews)) {
    const rendered = renderView(`PASS ${pass} · ${name}`, cameraPosition, pass)
    const artifactName = `pass-${pass}-${name}`
    const svgName = `${artifactName}.svg`
    await writeFile(resolve(outputDirectory, svgName), rendered.svg, 'utf8')
    renderedViews[artifactName] = {
      signature: rendered.signature,
      visibleTriangles: rendered.visibleTriangles,
      svg: svgName,
      screenshot: `${artifactName}.png`,
    }
  }
}

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
for (const [name, view] of Object.entries(renderedViews)) {
  await page.goto(pathToFileURL(resolve(outputDirectory, view.svg)).href)
  await page.screenshot({ path: resolve(outputDirectory, `${name}.png`) })
}
await browser.close()

const report = {
  generatedAt: '2026-09-01',
  renderer: 'deterministic CPU triangle projection for headless verification; production uses Three.WebGLRenderer',
  meshCount,
  vertexCount,
  triangleCount,
  distinctProjectionCount: new Set(['front', 'right', 'rear', 'left'].map((name) => renderedViews[name].signature)).size,
  distinctArtifactProjectionCount: new Set(Object.values(renderedViews).map((view) => view.signature)).size,
  views: renderedViews,
}
await writeFile(resolve(outputDirectory, 'metrics.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
