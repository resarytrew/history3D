import { Color, Material, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { SemanticSceneIndex } from './SemanticSceneIndex'

export type SemanticDisplayMode = 'all' | 'isolate' | 'ghost'

/** Owns only material clones; restores source materials before model disposal. */
export class SemanticPresentation {
  private readonly originals = new Map<Mesh, { material: Material | Material[]; visible: boolean; castShadow: boolean }>()
  private readonly clones: Material[] = []
  constructor(private readonly index: SemanticSceneIndex) {
    index.root.traverse(object => {
      if (object instanceof Mesh) this.originals.set(object, { material: object.material, visible: object.visible, castShadow: object.castShadow })
    })
  }
  show(entityId: string | null, mode: SemanticDisplayMode): void {
    this.restore()
    if (!entityId) return
    const selected = new Set<Mesh>()
    for (const object of this.index.getSupportingObjects(entityId)) object.traverse(child => { if (child instanceof Mesh) selected.add(child) })
    for (const [mesh, original] of this.originals) {
      if (!selected.has(mesh) && mode === 'isolate') { mesh.visible = false; continue }
      const materials = (Array.isArray(original.material) ? original.material : [original.material]).map(material => {
        const clone = material.clone()
        this.clones.push(clone)
        if (selected.has(mesh) && clone instanceof MeshStandardMaterial) {
          clone.emissive = new Color('#816326')
          clone.emissiveIntensity = .22
        } else if (!selected.has(mesh) && mode === 'ghost') {
          clone.transparent = true
          clone.opacity = .16
          clone.depthWrite = false
          mesh.castShadow = false
        }
        return clone
      })
      mesh.material = Array.isArray(original.material) ? materials : materials[0]
    }
  }
  getWorldPosition(entityId: string): Vector3 {
    return this.index.getWorldPosition(entityId)
  }
  private restore(): void {
    for (const [mesh, original] of this.originals) { mesh.material = original.material; mesh.visible = original.visible; mesh.castShadow = original.castShadow }
    for (const material of this.clones) material.dispose()
    this.clones.length = 0
  }
  dispose(): void { this.restore(); this.originals.clear() }
}
