import { Mesh, Raycaster, Vector2, type Camera, type Object3D } from 'three'
import type { PickOcclusionMode } from '../content/assembly'
import type { SemanticSceneIndex } from './SemanticSceneIndex'

export class SemanticPicker {
  private readonly ray = new Raycaster()
  pick(x: number, y: number, rect: { left: number; top: number; width: number; height: number }, camera: Camera,
    root: Object3D, index: SemanticSceneIndex, policy: (mesh: Mesh) => PickOcclusionMode): string | null {
    if (rect.width <= 0 || rect.height <= 0 || x < rect.left || y < rect.top || x > rect.left + rect.width || y > rect.top + rect.height) return null
    root.updateWorldMatrix(true, true); camera.updateWorldMatrix(true, false)
    const meshes: Mesh[] = []
    root.traverseVisible(object => { if (object instanceof Mesh) meshes.push(object) })
    this.ray.setFromCamera(new Vector2((x - rect.left) / rect.width * 2 - 1, 1 - (y - rect.top) / rect.height * 2), camera)
    for (const hit of this.ray.intersectObjects(meshes, false)) {
      if (policy(hit.object as Mesh) === 'pick-through') continue
      return index.getEntityForObject(hit.object) ?? null
    }
    return null
  }
}

/** Sticky maximum displacement: returning to the starting point is still a drag. */
export class SelectionGesture {
  private pointers = new Map<number, { x: number; y: number; limit: number; canceled: boolean }>()
  get active(): boolean { return this.pointers.size > 0 }
  down(id: number, x: number, y: number, type: string): void {
    const multiple = this.active
    if (multiple) for (const pointer of this.pointers.values()) pointer.canceled = true
    this.pointers.set(id, { x, y, limit: type === 'touch' ? 10 : 6, canceled: multiple })
  }
  move(id: number, x: number, y: number): void {
    const pointer = this.pointers.get(id)
    if (pointer && Math.hypot(x - pointer.x, y - pointer.y) > pointer.limit) pointer.canceled = true
  }
  up(id: number, x: number, y: number): boolean {
    this.move(id, x, y)
    const pointer = this.pointers.get(id)
    this.pointers.delete(id)
    return !!pointer && !pointer.canceled
  }
  cancel(id?: number): void { if (id === undefined) this.pointers.clear(); else this.pointers.delete(id) }
}
