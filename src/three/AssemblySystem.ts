import { Matrix4, Vector3 } from 'three'
import { SemanticSceneIndex } from './SemanticSceneIndex'

/** Absolute exhibit-space offsets: a child's authored offset is additional to its parent. */
export class AssemblySystem {
  amount = 0
  constructor(readonly semanticScene: SemanticSceneIndex) {}
  setAmount(amount: number): void {
    if (!Number.isFinite(amount)) throw new Error('Assembly amount must be finite')
    this.amount = Math.max(0, Math.min(1, amount))
    const index = this.semanticScene
    index.root.updateWorldMatrix(true, true)
    const ordered = [...index.definitions].sort((a, b) => index.getPath(a.id).length - index.getPath(b.id).length)
    for (const entity of ordered) {
      const frame = index.getFrame(entity.id)
      const offset = new Vector3().fromArray(entity.explodeOffset ?? [0, 0, 0]).multiplyScalar(this.amount)
      // Convert the exhibit-space displacement into the current parent's linear frame.
      const conversion = frame.parent!.matrixWorld.clone().invert().multiply(index.root.matrixWorld)
      const origin = new Vector3().applyMatrix4(conversion)
      offset.applyMatrix4(conversion).sub(origin)
      frame.matrix.copy(new Matrix4().makeTranslation(offset).multiply(index.baselines.get(entity.id)!))
      frame.matrix.decompose(frame.position, frame.quaternion, frame.scale)
      frame.updateWorldMatrix(false, true)
    }
  }
  reset(): void { this.setAmount(0) }
}
