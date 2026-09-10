import type { Point3, SemanticEntity } from './semantics'

export type Selection = { readonly kind: 'entity'; readonly entityId: string }
  | { readonly kind: 'layout-group'; readonly layoutId: string; readonly groupId: string } | null
export type AssemblyContext = { readonly kind: 'assembled' } | { readonly kind: 'layout'; readonly layoutId: string }
export type DisplayMode = 'all' | 'isolate' | 'ghost'
export interface SemanticState { readonly selection: Selection; readonly displayMode: DisplayMode; readonly assemblyContext: AssemblyContext }
export const assembledState: SemanticState = { selection: null, displayMode: 'all', assemblyContext: { kind: 'assembled' } }
export type PickOcclusionMode = 'solid' | 'pick-through'
export interface ReferenceView { readonly cameraPosition: Point3; readonly cameraTarget: Point3 }
export interface AssemblyLayoutGroup {
  readonly id: string
  readonly label: { readonly ru: string; readonly en: string }
  readonly selectionTarget: { readonly kind: 'entity'; readonly entityId: string } | { readonly kind: 'layout-group' }
  readonly memberEntityIds: readonly string[]
  readonly moveEntityIds: readonly string[]
  readonly preferredDirection: readonly [number, number]
  readonly fixed?: boolean
  readonly drilldownLayoutId?: string
}
export interface AssemblyLayout { readonly id: string; readonly parentLayoutId?: string; readonly groups: readonly AssemblyLayoutGroup[] }
export interface AssemblyConfig { readonly referenceView: ReferenceView; readonly layouts: readonly AssemblyLayout[] }
/** Absolute total translations from baseline in exhibit coordinates. Sparse children inherit. */
export interface AssemblyPose { readonly offsets: ReadonlyMap<string, Point3> }

export function assemblyPose(entries: readonly (readonly [string, Point3])[]): AssemblyPose {
  const offsets = new Map<string, Point3>()
  for (const [id, point] of entries) {
    if (offsets.has(id)) throw new Error(`Duplicate pose offset: ${id}`)
    if (point.length !== 3 || !point.every(Number.isFinite)) throw new Error(`Invalid pose offset: ${id}`)
    offsets.set(id, [...point])
  }
  return { offsets }
}

export function isWithin(id: string, parentId: string, entities: readonly SemanticEntity[]): boolean {
  const seen = new Set<string>()
  let current: string | undefined = id
  while (current && !seen.has(current)) {
    if (current === parentId) return true
    seen.add(current); current = entities.find(entity => entity.id === current)?.parentId
  }
  return false
}
export function groupContains(group: AssemblyLayoutGroup, id: string, entities: readonly SemanticEntity[]): boolean {
  return group.memberEntityIds.some(member => isWithin(id, member, entities))
}
export function groupSelection(layoutId: string, group: AssemblyLayoutGroup): Selection {
  return group.selectionTarget.kind === 'entity' ? group.selectionTarget : { kind: 'layout-group', layoutId, groupId: group.id }
}
export function resolveSelection(id: string | null, context: AssemblyContext, entities: readonly SemanticEntity[], config?: AssemblyConfig): Selection {
  if (!id || !entities.some(entity => entity.id === id)) return null
  if (context.kind === 'assembled') return { kind: 'entity', entityId: id }
  const group = config?.layouts.find(layout => layout.id === context.layoutId)?.groups.find(group => groupContains(group, id, entities))
  return group ? groupSelection(context.layoutId, group) : null
}
export function selectionMembers(selection: Selection, config?: AssemblyConfig): readonly string[] {
  if (!selection) return []
  return selection.kind === 'entity' ? [selection.entityId]
    : config?.layouts.find(layout => layout.id === selection.layoutId)?.groups.find(group => group.id === selection.groupId)?.memberEntityIds ?? []
}
export function selectionKey(selection: Selection): string {
  return !selection ? '' : selection.kind === 'entity' ? `entity:${selection.entityId}` : `group:${selection.layoutId}:${selection.groupId}`
}

export function validateAssembly(config: AssemblyConfig, entities: readonly SemanticEntity[]): void {
  const layouts = new Map(config.layouts.map(layout => [layout.id, layout]))
  if (layouts.size !== config.layouts.length || !layouts.has('overview')) throw new Error('Assembly needs unique layouts and overview')
  const view = config.referenceView
  if (view.cameraPosition.length !== 3 || view.cameraTarget.length !== 3 || ![...view.cameraPosition, ...view.cameraTarget].every(Number.isFinite) || view.cameraPosition.every((v, i) => v === view.cameraTarget[i])) throw new Error('Invalid reference view')
  for (const layout of config.layouts) {
    const seen = new Set<string>([layout.id]); let parent = layout.parentLayoutId
    while (parent) {
      if (seen.has(parent) || !layouts.has(parent)) throw new Error(`Invalid layout parent/cycle: ${layout.id}`)
      seen.add(parent); parent = layouts.get(parent)!.parentLayoutId
    }
    if (!layout.groups.length || new Set(layout.groups.map(group => group.id)).size !== layout.groups.length) throw new Error(`Invalid groups: ${layout.id}`)
    const occupied = new Set<string>(), moved = new Set<string>()
    for (const group of layout.groups) {
      if (new Set(group.memberEntityIds).size !== group.memberEntityIds.length) throw new Error(`Duplicate group member: ${group.id}`)
      if (!group.memberEntityIds.length || !group.moveEntityIds.length || group.preferredDirection.length !== 2 || !group.preferredDirection.every(Number.isFinite) || (!group.fixed && Math.hypot(...group.preferredDirection) === 0)) throw new Error(`Invalid group: ${group.id}`)
      if (group.drilldownLayoutId && layouts.get(group.drilldownLayoutId)?.parentLayoutId !== layout.id) throw new Error(`Invalid drilldown: ${group.id}`)
      for (const id of [...group.memberEntityIds, ...group.moveEntityIds]) if (!entities.some(entity => entity.id === id)) throw new Error(`Unknown assembly entity: ${id}`)
      const members = entities.filter(entity => groupContains(group, entity.id, entities))
      for (const entity of members) {
        if (occupied.has(entity.id)) throw new Error(`Overlapping layout membership: ${entity.id}`)
        occupied.add(entity.id)
      }
      if (group.selectionTarget.kind === 'entity' && !groupContains(group, group.selectionTarget.entityId, entities)) throw new Error(`Selection outside group: ${group.id}`)
      for (const id of group.moveEntityIds) {
        const entity = entities.find(entity => entity.id === id)!
        if (!['part', 'assembly'].includes(entity.kind) || moved.has(id) || !group.memberEntityIds.includes(id)) throw new Error(`Conflicting/invalid move frame: ${id}`)
        if (group.moveEntityIds.some(other => other !== id && isWithin(id, other, entities))) throw new Error(`Nested move ownership: ${id}`)
        moved.add(id)
      }
      for (const id of group.memberEntityIds) if (!group.moveEntityIds.some(move => isWithin(id, move, entities))) throw new Error(`Member is not moved by group: ${id}`)
    }
  }
}
