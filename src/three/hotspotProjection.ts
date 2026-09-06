import { Matrix3, Mesh, Object3D, PerspectiveCamera, Raycaster, Vector3 } from 'three'
import type { Hotspot } from '../content/types'

export interface SurfaceAnchor { point: Vector3; normal?: Vector3 }
export interface ProjectedHotspot { readonly id: string; readonly x: number; readonly y: number; readonly visible: boolean }

/** Resolve approximate authoring coordinates onto the named detail once after loading. */
export function bindSurfaceAnchor(root: Object3D, hotspot: Hotspot): SurfaceAnchor {
  const point = new Vector3().fromArray(hotspot.position)
  if (!hotspot.surface) return { point }
  const detail = root.getObjectByName(hotspot.surface.objectName)
  const normal = new Vector3().fromArray(hotspot.surface.normal).normalize()
  if (!detail) return { point, normal }
  root.updateMatrixWorld(true)
  const world = root.localToWorld(point.clone())
  const direction = normal.clone().transformDirection(root.matrixWorld)
  const distance = hotspot.surface.searchDistance
  const ray = new Raycaster(world.clone().addScaledVector(direction, distance), direction.clone().negate(), 0, distance * 2)
  const hit = ray.intersectObject(detail, true)[0]
  if (!hit) return { point, normal }
  return { point: root.worldToLocal(hit.point.clone()), normal }
}

export function projectSurfaceHotspots(root: Object3D, camera: PerspectiveCamera, hotspots: readonly Hotspot[], anchors: ReadonlyMap<string, SurfaceAnchor>, tolerance: number): ProjectedHotspot[] {
  const occluders: Mesh[] = []
  root.traverseVisible((object) => { if (object instanceof Mesh) occluders.push(object) })
  const ray = new Raycaster(), normalMatrix = new Matrix3().getNormalMatrix(root.matrixWorld)
  return hotspots.map((hotspot) => {
    const anchor = anchors.get(hotspot.id) ?? { point: new Vector3().fromArray(hotspot.position) }
    const world = root.localToWorld(anchor.point.clone()), toCamera = camera.position.clone().sub(world)
    const projected = world.clone().project(camera)
    const facing = !anchor.normal || anchor.normal.clone().applyMatrix3(normalMatrix).normalize().dot(toCamera.clone().normalize()) > 0.035
    const inFrame = projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1
    let visible = facing && inFrame
    if (visible) {
      ray.set(camera.position, toCamera.clone().negate().normalize())
      ray.far = Math.max(0, toCamera.length() - tolerance)
      visible = ray.intersectObjects(occluders, false).length === 0
    }
    return { id: hotspot.id, x: (projected.x * 0.5 + 0.5) * 100, y: (-projected.y * 0.5 + 0.5) * 100, visible }
  })
}
