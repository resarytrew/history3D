import { Box3, Matrix4, Mesh, PerspectiveCamera, Vector3 } from 'three'
import { assemblyPose, groupContains, type AssemblyLayout, type AssemblyPose, type ReferenceView } from '../content/assembly'
import type { Point3, SemanticEntity } from '../content/semantics'
import type { SemanticSceneIndex } from './SemanticSceneIndex'

export interface BoundsSnapshot { readonly entityId: string; readonly min: Point3; readonly max: Point3; readonly matrix: readonly number[] }
export interface LayoutInput {
  readonly objects: readonly BoundsSnapshot[]; readonly entities: readonly SemanticEntity[]
  readonly layout: AssemblyLayout; readonly referenceView: ReferenceView
  readonly width: number; readonly height: number
}
export interface ScreenRect { left: number; top: number; right: number; bottom: number }
export type LayoutResult = { ok: true; pose: AssemblyPose; view: ReferenceView; rectangles: readonly ScreenRect[]; diagnostics: readonly string[] }
  | { ok: false; error: string; diagnostics: readonly string[] }

/** Capture once at baseline. The solver never receives the scene or its mutable matrices. */
export function snapshotBounds(index: SemanticSceneIndex): BoundsSnapshot[] {
  index.root.updateWorldMatrix(true, true)
  const inverse = index.root.matrixWorld.clone().invert(), result: BoundsSnapshot[] = []
  index.root.traverse(object => {
    const entityId = index.getEntityForObject(object)
    if (!(object instanceof Mesh) || !entityId) return
    object.geometry.computeBoundingBox()
    const box = object.geometry.boundingBox!
    result.push({ entityId, min: box.min.toArray(), max: box.max.toArray(), matrix: inverse.clone().multiply(object.matrixWorld).toArray() })
  })
  return result
}
function corners(object: BoundsSnapshot, offset: Vector3): Vector3[] {
  const matrix = new Matrix4().fromArray(object.matrix)
  return Array.from({ length: 8 }, (_, i) => new Vector3(object[i & 1 ? 'max' : 'min'][0], object[i & 2 ? 'max' : 'min'][1], object[i & 4 ? 'max' : 'min'][2]).applyMatrix4(matrix).add(offset))
}
function cameraFor(view: ReferenceView, aspect: number): PerspectiveCamera {
  const camera = new PerspectiveCamera(34, aspect, .0001, 1000)
  camera.position.fromArray(view.cameraPosition); camera.lookAt(new Vector3().fromArray(view.cameraTarget)); camera.updateMatrixWorld(true)
  return camera
}
export function rectanglesOverlap(a: ScreenRect, b: ScreenRect, gap = 16): boolean {
  return a.left < b.right + gap && a.right + gap > b.left && a.top < b.bottom + gap && a.bottom + gap > b.top
}
export class AssemblyLayoutSolver {
  solve(input: LayoutInput): LayoutResult {
    const { width, height, layout } = input, diagnostics: string[] = []
    if (input.objects.some(object => object.matrix.length !== 16 || ![...object.min, ...object.max, ...object.matrix].every(Number.isFinite) || object.min.some((v, i) => v > object.max[i])) || ![...input.referenceView.cameraPosition, ...input.referenceView.cameraTarget].every(Number.isFinite)) return { ok: false, error: 'Invalid bounds or reference camera', diagnostics }
    if (![width, height].every(Number.isFinite) || width <= 48 || height <= 48) return { ok: false, error: 'Workspace too small', diagnostics }
    const groups = layout.groups.map(group => input.objects.filter(object => groupContains(group, object.entityId, input.entities)))
    if (groups.some(objects => !objects.length)) return { ok: false, error: 'Group has no bounds', diagnostics }
    let offsets = groups.map(() => new Vector3())
    let camera = cameraFor(input.referenceView, width / height)
    const right = new Vector3().setFromMatrixColumn(camera.matrixWorld, 0), up = new Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
    const points = (i: number) => groups[i].flatMap(object => corners(object, offsets[i]))
    const project = (): ScreenRect[] => groups.map((_, i) => {
      const rect = { left: Infinity, top: Infinity, right: -Infinity, bottom: -Infinity }
      for (const point of points(i)) {
        const p = point.project(camera), x = (p.x + 1) * width / 2, y = (1 - p.y) * height / 2
        if (p.z <= -1 || p.z >= 1) return { left: NaN, top: NaN, right: NaN, bottom: NaN }
        rect.left = Math.min(rect.left, x); rect.right = Math.max(rect.right, x); rect.top = Math.min(rect.top, y); rect.bottom = Math.max(rect.bottom, y)
      }
      return rect
    })
    const valid = (rects: ScreenRect[]) => rects.every((r, i) => Object.values(r).every(Number.isFinite) && r.left >= 24 && r.top >= 24 && r.right <= width - 24 && r.bottom <= height - 24 && rects.slice(0, i).every(other => !rectanglesOverlap(r, other)))
    const units = () => 2 * camera.position.distanceTo(new Vector3().fromArray(input.referenceView.cameraTarget)) * Math.tan(34 * Math.PI / 360) / height
    const separate = () => {
      for (let pass = 0; pass < 64; pass++) {
        let changed = false
        for (let i = 0; i < groups.length; i++) {
          if (layout.groups[i].fixed) continue
          const rects = project(), r = rects[i]
          const blockers = rects.filter((_, j) => j !== i && (j < i || layout.groups[j].fixed))
          if (!blockers.some(other => rectanglesOverlap(r, other, 32))) continue
          const [x, y] = layout.groups[i].preferredDirection, length = Math.hypot(x, y)
          offsets[i].addScaledVector(right, x / length * units() * 12).addScaledVector(up, -y / length * units() * 12)
          changed = true
        }
        if (!changed) return
      }
      diagnostics.push('pass-limit')
    }
    const fit = () => {
      const all = groups.flatMap((_, i) => points(i)), bounds = new Box3().setFromPoints(all), target = bounds.getCenter(new Vector3())
      const back = new Vector3().setFromMatrixColumn(camera.matrixWorld, 2)
      const tan = Math.tan(34 * Math.PI / 360), usableX = (width - 64) / width, usableY = (height - 64) / height
      let distance = .001
      for (const point of all) {
        const v = point.clone().sub(target), z = v.dot(back)
        distance = Math.max(distance, z + Math.abs(v.dot(right)) / (tan * camera.aspect * usableX), z + Math.abs(v.dot(up)) / (tan * usableY))
      }
      camera = cameraFor({ cameraPosition: target.clone().addScaledVector(back, distance * 1.015).toArray(), cameraTarget: target.toArray() }, width / height)
      return { cameraPosition: camera.position.toArray(), cameraTarget: target.toArray() } satisfies ReferenceView
    }
    separate(); let view = fit(); let rects = project()
    if (!valid(rects)) { diagnostics.push('corrective-solve'); separate(); rects = project() }
    if (!valid(rects)) {
      diagnostics.push('fallback')
      offsets = groups.map(() => new Vector3())
      // Reserve generous CSS gaps before the final perspective fit. Stable ordering.
      const raw = groups.map((_, i) => {
        const values = points(i).map(p => [p.dot(right), p.dot(up)])
        return { minX: Math.min(...values.map(p => p[0])), maxX: Math.max(...values.map(p => p[0])), minY: Math.min(...values.map(p => p[1])), maxY: Math.max(...values.map(p => p[1])) }
      })
      const columns = width < 600 ? 1 : 2, rows = Math.ceil(groups.length / columns)
      const maxW = Math.max(...raw.map(r => r.maxX - r.minX))
      const rowHeights = Array.from({ length: rows }, (_, row) => Math.max(...raw.slice(row * columns, (row + 1) * columns).map(r => r.maxY - r.minY)))
      const scale = Math.max(maxW * columns / Math.max(1, width - 64 - (columns - 1) * 40), rowHeights.reduce((a, b) => a + b, 0) / Math.max(1, height - 64 - (rows - 1) * 40))
      const cellW = maxW + 40 * scale
      const rowCenters = rowHeights.map((height, row) => rowHeights.slice(0, row).reduce((a, b) => a + b, 0) + height / 2 + row * 40 * scale)
      const desired = raw.map((r, i) => right.clone().multiplyScalar(i % columns * cellW - (r.minX + r.maxX) / 2).addScaledVector(up, -rowCenters[Math.floor(i / columns)] - (r.minY + r.maxY) / 2))
      const fixed = layout.groups.findIndex(group => group.fixed), origin = fixed >= 0 ? desired[fixed].clone() : new Vector3()
      offsets = desired.map(v => v.sub(origin)); view = fit(); rects = project()
    }
    diagnostics.push('final-validation')
    if (!valid(rects)) return { ok: false, error: 'Layout cannot meet CSS gap and workspace constraints', diagnostics }
    const entries = layout.groups.flatMap((group, i) => group.moveEntityIds.map(id => [id, offsets[i].toArray()] as const))
    try { return { ok: true, pose: assemblyPose(entries), view, rectangles: rects, diagnostics } }
    catch (error) { return { ok: false, error: String(error), diagnostics } }
  }
}
