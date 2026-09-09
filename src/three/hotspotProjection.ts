import { Matrix3, Mesh, Object3D, PerspectiveCamera, Raycaster, Vector3 } from 'three'
import type { Hotspot } from '../content/types'
import type { SemanticSceneIndex } from './SemanticSceneIndex'

export interface SurfaceAnchor { point: Vector3; normal?: Vector3; frame?: Object3D; entityId?: string; geometry?: Object3D[] }
export interface ProjectedHotspot { readonly id: string; readonly x: number; readonly y: number; readonly visible: boolean }

/** Resolve approximate authoring coordinates onto the named detail once after loading. */
export function bindSurfaceAnchor(root: Object3D, hotspot: Hotspot, semanticScene?: SemanticSceneIndex): SurfaceAnchor {
  if (hotspot.anchor) {
    if (!semanticScene) throw new Error(`Semantic index required: ${hotspot.id}`)
    const { entityId, localPoint, localNormal } = hotspot.anchor
    if (!localPoint.every(Number.isFinite) || (localNormal && (!localNormal.every(Number.isFinite) || !localNormal.some(value => value !== 0)))) throw new Error(`Invalid semantic anchor: ${hotspot.id}`)
    return { entityId, geometry: supportingGeometry(semanticScene, entityId), frame: semanticScene.getFrame(entityId), point: new Vector3().fromArray(localPoint), normal: localNormal ? new Vector3().fromArray(localNormal).normalize() : undefined }
  }
  const legacy = bindLegacySurfaceAnchor(root, hotspot)
  const entityId = hotspot.target?.entityId
  if (!entityId) return legacy
  if (!semanticScene) throw new Error(`Semantic index required: ${hotspot.id}`)
  const frame = semanticScene.getFrame(entityId)
  frame.updateWorldMatrix(true, false)
  const point = frame.worldToLocal(root.localToWorld(legacy.point.clone()))
  const normal = legacy.normal?.clone().applyMatrix3(new Matrix3().getNormalMatrix(root.matrixWorld))
    .applyMatrix3(new Matrix3().setFromMatrix4(frame.matrixWorld).transpose()).normalize()
  return { entityId, geometry: supportingGeometry(semanticScene, entityId), frame, point, normal }
}

function supportingGeometry(index: SemanticSceneIndex, entityId: string): Object3D[] {
  let entity = index.getEntity(entityId)
  while (!index.getObjects(entity.id).length && entity.parentId) entity = index.getEntity(entity.parentId)
  return index.getObjects(entity.id)
}

function isVisible(object: Object3D): boolean {
  for (let current: Object3D | null = object; current; current = current.parent) if (!current.visible) return false
  return true
}

function bindLegacySurfaceAnchor(root: Object3D, hotspot: Hotspot): SurfaceAnchor {
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
  root.updateWorldMatrix(true, true)
  const occluders: Mesh[] = []
  root.traverseVisible((object) => {
    if (object instanceof Mesh) {
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      if (materials.some(material => !material.transparent || material.opacity > .2)) occluders.push(object)
    }
  })
  const ray = new Raycaster()
  return hotspots.map((hotspot) => {
    const anchor = anchors.get(hotspot.id) ?? { point: new Vector3().fromArray(hotspot.position) }
    const frame = anchor.frame ?? root
    const normalMatrix = new Matrix3().getNormalMatrix(frame.matrixWorld)
    const world = frame.localToWorld(anchor.point.clone()), toCamera = camera.getWorldPosition(new Vector3()).sub(world)
    const projected = world.clone().project(camera)
    const facing = !anchor.normal || anchor.normal.clone().applyMatrix3(normalMatrix).normalize().dot(toCamera.clone().normalize()) > 0.035
    const inFrame = projected.z >= -1 && projected.z <= 1 && Math.abs(projected.x) < 1 && Math.abs(projected.y) < 1
    const frameVisible = isVisible(frame) && (!anchor.geometry || anchor.geometry.some(isVisible))
    let visible = facing && inFrame && frameVisible
    if (visible) {
      ray.set(camera.getWorldPosition(new Vector3()), toCamera.clone().negate().normalize())
      ray.far = Math.max(0, toCamera.length() - tolerance)
      visible = ray.intersectObjects(occluders, false).length === 0
    }
    return { id: hotspot.id, x: (projected.x * 0.5 + 0.5) * 100, y: (-projected.y * 0.5 + 0.5) * 100, visible }
  })
}
