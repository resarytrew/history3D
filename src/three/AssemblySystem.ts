import { Matrix3, Matrix4, Vector3 } from 'three'
import { assemblyPose, type AssemblyPose } from '../content/assembly'
import { SemanticSceneIndex } from './SemanticSceneIndex'

/** Applies absolute exhibit-space translations, never accumulates commands. */
export class AssemblySystem {
  private current = new Map<string, Vector3>()
  private transition?: { from: Map<string, Vector3>; to: Map<string, Vector3>; started: number }
  constructor(readonly semanticScene: SemanticSceneIndex) { this.setPose(assemblyPose([])) }
  get animating(): boolean { return !!this.transition }
  get pose(): AssemblyPose { return assemblyPose([...this.current].map(([id, v]) => [id, v.toArray()] as const)) }
  private expand(pose: AssemblyPose): Map<string, Vector3> {
    const explicit = assemblyPose([...pose.offsets])
    for (const id of explicit.offsets.keys()) this.semanticScene.getEntity(id)
    const result = new Map<string, Vector3>()
    const resolve = (id: string): Vector3 => {
      const cached = result.get(id)
      if (cached) return cached
      const entity = this.semanticScene.getEntity(id), point = explicit.offsets.get(id)
      const value = point ? new Vector3().fromArray(point) : entity.parentId ? resolve(entity.parentId).clone() : new Vector3()
      result.set(id, value)
      return value
    }
    for (const entity of this.semanticScene.definitions) resolve(entity.id)
    return result
  }
  setPose(pose: AssemblyPose): void { const target = this.expand(pose); this.transition = undefined; this.apply(target) }
  animateTo(pose: AssemblyPose, time: number, reducedMotion = false): void {
    const target = this.expand(pose)
    if (reducedMotion) { this.setPose(pose); return }
    this.update(time)
    this.transition = { from: new Map([...this.current].map(([id, v]) => [id, v.clone()])), to: target, started: time }
  }
  update(time: number): boolean {
    if (!this.transition) return false
    const { from, to, started } = this.transition
    const t = Math.max(0, Math.min(1, (time - started) / 550)), eased = t * t * (3 - 2 * t)
    this.apply(new Map([...to].map(([id, target]) => [id, from.get(id)!.clone().lerp(target, eased)])))
    if (t === 1) this.transition = undefined
    return !!this.transition
  }
  private apply(offsets: Map<string, Vector3>): void {
    const index = this.semanticScene
    const ordered = [...index.definitions].sort((a, b) => index.getPath(a.id).length - index.getPath(b.id).length)
    index.root.updateWorldMatrix(true, true)
    for (const entity of ordered) {
      const frame = index.getFrame(entity.id)
      const delta = offsets.get(entity.id)!.clone().sub(entity.parentId ? offsets.get(entity.parentId)! : new Vector3())
      const conversion = new Matrix3().setFromMatrix4(frame.parent!.matrixWorld).invert().multiply(new Matrix3().setFromMatrix4(index.root.matrixWorld))
      delta.applyMatrix3(conversion)
      frame.matrix.copy(new Matrix4().makeTranslation(delta).multiply(index.baselines.get(entity.id)!))
      frame.matrix.decompose(frame.position, frame.quaternion, frame.scale)
      frame.updateWorldMatrix(false, true)
    }
    this.current = offsets
  }
  reset(): void { this.setPose(assemblyPose([])) }
}
