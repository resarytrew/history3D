import { Color, Material, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { isWithin, resolveSelection, selectionMembers, type AssemblyConfig, type AssemblyContext, type DisplayMode, type PickOcclusionMode, type Selection } from '../content/assembly'
import { SemanticSceneIndex } from './SemanticSceneIndex'

export type SemanticDisplayMode = DisplayMode
type Variant = 'original' | 'selected' | 'hover' | 'ghost'
/** Cached variants belong to this presentation, never to the imported asset. */
export class SemanticPresentation {
  private readonly originals = new Map<Mesh, { material: Material | Material[]; visible: boolean; castShadow: boolean }>()
  private readonly variants = new Map<Mesh, Partial<Record<Variant, Material | Material[]>>>()
  private readonly policies = new Map<Mesh, PickOcclusionMode>()
  private state: { selection: Selection; mode: DisplayMode; context: AssemblyContext; config?: AssemblyConfig } = { selection: null, mode: 'all', context: { kind: 'assembled' } }
  private hover: Selection = null
  constructor(private readonly index: SemanticSceneIndex) {
    index.root.traverse(object => { if (object instanceof Mesh) this.originals.set(object, { material: object.material, visible: object.visible, castShadow: object.castShadow }) })
  }
  show(entityId: string | null, mode: DisplayMode): void { this.update(entityId ? { kind: 'entity', entityId } : null, mode, { kind: 'assembled' }) }
  update(selection: Selection, mode: DisplayMode, context: AssemblyContext, config?: AssemblyConfig): void {
    this.state = { selection, mode, context, config }; this.refresh()
  }
  setHover(hover: Selection): void { this.hover = hover; this.refresh() }
  policy = (mesh: Mesh): PickOcclusionMode => this.policies.get(mesh) ?? 'solid'
  private meshes(selection: Selection): Set<Mesh> {
    const result = new Set<Mesh>()
    for (const id of selectionMembers(selection, this.state.config)) for (const object of this.index.getSupportingObjects(id)) object.traverse(child => { if (child instanceof Mesh) result.add(child) })
    return result
  }
  private material(mesh: Mesh, variant: Variant): Material | Material[] {
    const original = this.originals.get(mesh)!.material
    if (variant === 'original') return original
    const cache = this.variants.get(mesh) ?? {}
    if (cache[variant]) return cache[variant]!
    const materials = (Array.isArray(original) ? original : [original]).map(source => {
      const clone = source.clone()
      if (variant === 'ghost') { clone.transparent = true; clone.opacity = .16; clone.depthWrite = false }
      else if (clone instanceof MeshStandardMaterial) { clone.emissive = new Color('#816326'); clone.emissiveIntensity = variant === 'selected' ? .22 : .1 }
      return clone
    })
    cache[variant] = Array.isArray(original) ? materials : materials[0]; this.variants.set(mesh, cache)
    return cache[variant]!
  }
  private refresh(): void {
    const { selection, mode, context, config } = this.state
    const selected = this.meshes(selection), hovered = this.meshes(this.hover)
    const layout = context.kind === 'layout' ? config?.layouts.find(layout => layout.id === context.layoutId) : undefined
    for (const [mesh, original] of this.originals) {
      const owner = this.index.getEntityForObject(mesh)
      const allowed = !!resolveSelection(owner ?? null, context, this.index.definitions, config)
      const inContext = !layout?.parentLayoutId || !!owner && layout.groups.some(group => group.memberEntityIds.some(id => isWithin(owner, id, this.index.definitions)))
      const ghost = !!selection && !selected.has(mesh) && mode === 'ghost'
      const visible = original.visible && inContext && !(selection && mode === 'isolate' && !selected.has(mesh))
      const variant: Variant = selected.has(mesh) ? 'selected' : ghost ? 'ghost' : hovered.has(mesh) ? 'hover' : 'original'
      const material = this.material(mesh, variant)
      if (mesh.material !== material) mesh.material = material
      if (mesh.visible !== visible) mesh.visible = visible
      mesh.castShadow = original.castShadow && !ghost
      this.policies.set(mesh, ghost && !allowed ? 'pick-through' : 'solid')
    }
  }
  getWorldPosition(entityId: string): Vector3 { return this.index.getWorldPosition(entityId) }
  dispose(): void {
    for (const [mesh, original] of this.originals) { mesh.material = original.material; mesh.visible = original.visible; mesh.castShadow = original.castShadow }
    for (const variants of this.variants.values()) for (const material of Object.values(variants)) for (const item of Array.isArray(material) ? material : [material]) item.dispose()
    this.variants.clear(); this.originals.clear(); this.policies.clear()
  }
}
