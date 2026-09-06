import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera, Vector3 } from 'three'
import { afterAll, describe, expect, it } from 'vitest'
import { russianShako1808 } from '../src/content/exhibits/russian-shako-1808/exhibit'
import { createRussianShako1808 } from '../src/content/exhibits/russian-shako-1808/procedural/createRussianShako1808'
import { bindSurfaceAnchor, projectSurfaceHotspots } from '../src/three/hotspotProjection'
import { disposeObject3D } from '../src/three/dispose'

const root = createRussianShako1808(), exhibit = russianShako1808
root.updateMatrixWorld(true)
const anchors = new Map(exhibit.hotspots.map((h) => [h.id, bindSurfaceAnchor(root, h)]))
const camera = new PerspectiveCamera(34, 1, 0.001, 10)
function view(position: number[], target = [0, 0.17, 0]) {
  camera.position.fromArray(position); camera.lookAt(new Vector3().fromArray(target)); camera.updateMatrixWorld(true)
  return projectSurfaceHotspots(root, camera, exhibit.hotspots, anchors, 0.00035)
}
afterAll(() => disposeObject3D(root))

describe('surface-bound hotspot projection', () => {
  it('shows the six visible detail anchors in the initial camera', () => {
    const projected = view([...exhibit.presentation.cameraPosition])
    expect(projected.filter((p) => p.visible).map((p) => p.id)).toEqual(exhibit.hotspots.map((h) => h.id))
  })
  it('hides front insignia and the front cord on the rear, including above the silhouette', () => {
    const rear = view([0, 0.32, -0.79])
    for (const id of ['shako-grenade', 'shako-repyok', 'shako-cord', 'shako-form']) expect(rear.find((p) => p.id === id)?.visible, id).toBe(false)
  })
  it('projects the exact bound point across a continuous orbit, without clamping or offsets', () => {
    for (let i = 0; i < 48; i++) {
      const angle = i / 48 * Math.PI * 2
      for (const p of view([Math.sin(angle) * 0.8, 0.31, Math.cos(angle) * 0.8])) {
        const ndc = root.localToWorld(anchors.get(p.id)!.point.clone()).project(camera)
        expect(p.x).toBeCloseTo((ndc.x * 0.5 + 0.5) * 100, 8)
        expect(p.y).toBeCloseTo((-ndc.y * 0.5 + 0.5) * 100, 8)
      }
    }
  })
  it('ignores hidden internal meshes but hides anchors blocked by a visible object', () => {
    const obstruction = new Mesh(new BoxGeometry(1, 1, 0.01), new MeshBasicMaterial())
    const hidden = new Group(); hidden.visible = false; hidden.add(obstruction); obstruction.position.set(0, 0.17, 0.4); root.add(hidden); root.updateMatrixWorld(true)
    expect(view([0, 0.27, 0.8]).find((p) => p.id === 'shako-grenade')?.visible).toBe(true)
    hidden.visible = true
    expect(view([0, 0.27, 0.8]).filter((p) => p.visible)).toHaveLength(0)
    disposeObject3D(hidden)
  })
})
