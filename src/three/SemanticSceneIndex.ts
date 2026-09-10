import { Box3, Group, Matrix3, Matrix4, Object3D, Vector3 } from 'three'
import type { SemanticAnchor, SemanticEntity } from '../content/semantics'

/** Validate before modifying the imported scene. Geometry ownership is exclusive;
 * semantic ancestors obtain descendant geometry through the index. */
export function validateSemantics(root: Object3D, entities: readonly SemanticEntity[]): void {
  const ids = new Map<string, SemanticEntity>()
  const names = new Map<string, Object3D[]>()
  root.traverse(object => names.set(object.name, [...(names.get(object.name) ?? []), object]))
  for (const entity of entities) {
    if (!entity.id || ids.has(entity.id)) throw new Error(`Duplicate semantic ID: ${entity.id}`)
    ids.set(entity.id, entity)
  }
  const owners = new Map<Object3D, string>()
  for (const entity of entities) {
    if (entity.focusAnchor && (entity.focusAnchor.entityId !== entity.id || ![...entity.focusAnchor.localPoint, ...(entity.focusAnchor.localNormal ?? [])].every(Number.isFinite) || entity.focusAnchor.localNormal && Math.hypot(...entity.focusAnchor.localNormal) === 0)) throw new Error(`Invalid focus anchor: ${entity.id}`)
    const seen = new Set<string>([entity.id])
    let parent = entity.parentId
    while (parent) {
      if (seen.has(parent)) throw new Error(`Semantic cycle: ${entity.id}`)
      seen.add(parent)
      const ancestor = ids.get(parent)
      if (!ancestor) throw new Error(`Missing semantic parent: ${parent}`)
      parent = ancestor.parentId
    }
    if (entity.kind === 'part' && !entity.geometry.objectNames.length) throw new Error(`Part has no geometry: ${entity.id}`)
    if (entity.explodeOffset && (!['assembly', 'part'].includes(entity.kind) || !entity.explodeOffset.every(Number.isFinite))) throw new Error(`Invalid explode offset: ${entity.id}`)
    for (const name of entity.geometry.objectNames) {
      const matches = names.get(name)
      if (matches?.length !== 1) throw new Error(`Missing or ambiguous geometry: ${name}`)
      if (matches[0] === root) throw new Error('Exhibit root cannot be owned geometry')
      matches[0].traverse(object => {
        if (owners.has(object)) throw new Error(`Conflicting geometry ownership: ${name}`)
        owners.set(object, entity.id)
      })
    }
  }
}

export class SemanticSceneIndex {
  private readonly entities = new Map<string, SemanticEntity>()
  private readonly frames = new Map<string, Object3D>()
  private readonly objects = new Map<string, Object3D[]>()
  private readonly owners = new Map<Object3D, string>()
  readonly baselines = new Map<string, Matrix4>()

  constructor(readonly root: Object3D, readonly definitions: readonly SemanticEntity[]) {
    validateSemantics(root, definitions)
    for (const entity of definitions) {
      this.entities.set(entity.id, entity)
      const objects = entity.geometry.objectNames.map(name => root.getObjectByName(name)!)
      this.objects.set(entity.id, objects)
      for (const object of objects) object.traverse(child => this.owners.set(child, entity.id))
    }
    root.updateWorldMatrix(true, true)
    const createFrame = (id: string): Object3D => {
      const existing = this.frames.get(id)
      if (existing) return existing
      const entity = this.getEntity(id)
      const parent = entity.parentId ? createFrame(entity.parentId) : root
      const frame = new Group()
      frame.name = `semantic:${id}`
      parent.add(frame)
      this.frames.set(id, frame)
      frame.updateWorldMatrix(true, false)
      for (const object of this.objects.get(id)!) {
        // Retain the imported object's local transform verbatim. A frozen bridge
        // preserves its former parent's full affine frame, including any shear.
        const bridge = new Group()
        bridge.name = `binding:${object.name}`
        bridge.matrix.copy(frame.matrixWorld.clone().invert().multiply(object.parent!.matrixWorld))
        bridge.matrixAutoUpdate = false
        frame.add(bridge)
        bridge.add(object)
      }
      frame.updateMatrix()
      this.baselines.set(id, frame.matrix.clone())
      return frame
    }
    for (const entity of definitions) createFrame(entity.id)
    root.updateWorldMatrix(true, true)
  }

  getEntity(id: string): SemanticEntity {
    const entity = this.entities.get(id)
    if (!entity) throw new Error(`Unknown semantic entity: ${id}`)
    return entity
  }
  getFrame(id: string): Object3D { this.getEntity(id); return this.frames.get(id)! }
  getObjects(id: string): Object3D[] {
    this.getEntity(id)
    return this.definitions.filter(entity => this.getPath(entity.id).some(parent => parent.id === id))
      .flatMap(entity => this.objects.get(entity.id)!)
  }
  getPath(id: string): SemanticEntity[] {
    const entity = this.getEntity(id)
    return [...(entity.parentId ? this.getPath(entity.parentId) : []), entity]
  }
  getEntityForObject(object: Object3D): string | undefined { return this.owners.get(object) }
  getSupportingObjects(id: string): Object3D[] {
    let entity = this.getEntity(id)
    while (!this.getObjects(entity.id).length && entity.parentId) entity = this.getEntity(entity.parentId)
    return this.getObjects(entity.id)
  }
  getWorldPosition(id: string): Vector3 {
    this.root.updateWorldMatrix(true, true)
    const bounds = new Box3()
    for (const object of this.getSupportingObjects(id)) bounds.expandByObject(object)
    return bounds.isEmpty() ? this.getFrame(id).getWorldPosition(new Vector3()) : bounds.getCenter(new Vector3())
  }
  /** Author a serializable entity-local anchor from a world-space raycast hit. */
  createAnchor(object: Object3D, worldPoint: Vector3, worldNormal?: Vector3): SemanticAnchor {
    const entityId = this.getEntityForObject(object)
    if (!entityId) throw new Error(`No semantic owner for raycast object: ${object.name}`)
    return this.anchorFromWorld(entityId, worldPoint, worldNormal)
  }
  anchorFromWorld(entityId: string, worldPoint: Vector3, worldNormal?: Vector3): SemanticAnchor {
    if (![...worldPoint.toArray(), ...(worldNormal?.toArray() ?? [])].every(Number.isFinite) || worldNormal?.lengthSq() === 0) throw new Error('Invalid anchor coordinates')
    const frame = this.getFrame(entityId)
    frame.updateWorldMatrix(true, false)
    return {
      entityId, localPoint: frame.worldToLocal(worldPoint.clone()).toArray(),
      localNormal: worldNormal?.clone().applyMatrix3(new Matrix3().setFromMatrix4(frame.matrixWorld).transpose()).normalize().toArray(),
    }
  }
  getWorldPoint(anchor: SemanticAnchor): Vector3 {
    const frame = this.getFrame(anchor.entityId)
    frame.updateWorldMatrix(true, false)
    return frame.localToWorld(new Vector3().fromArray(anchor.localPoint))
  }
  getWorldNormal(anchor: SemanticAnchor): Vector3 | undefined {
    const frame = this.getFrame(anchor.entityId)
    frame.updateWorldMatrix(true, false)
    return anchor.localNormal ? new Vector3().fromArray(anchor.localNormal).applyMatrix3(new Matrix3().getNormalMatrix(frame.matrixWorld)).normalize() : undefined
  }
}
