export type Point3 = readonly [number, number, number]
export interface SemanticAnchor {
  readonly entityId: string
  readonly localPoint: Point3
  readonly localNormal?: Point3
}
export interface SemanticEntity {
  readonly id: string
  readonly kind: 'object' | 'assembly' | 'part' | 'region' | 'feature'
  readonly label: { readonly ru: string; readonly en?: string }
  readonly parentId?: string
  readonly geometry: { readonly objectNames: readonly string[] }
  /** Translation in the exhibit coordinate frame, in model units. */
  readonly explodeOffset?: Point3
}
