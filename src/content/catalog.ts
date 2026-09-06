import { ancientRusCollection } from './collections/ancient-rus'
import { russianEmpireCollection } from './collections/russian-empire'
import { russianShako1808 } from './exhibits/russian-shako-1808/exhibit'
import { ivanIvHelmet } from './exhibits/ivan-iv-helmet/exhibit'
import { pokrovNaNerli } from './exhibits/pokrov-na-nerli/exhibit'
import type { Exhibit } from './types'

export const exhibits: readonly Exhibit[] = [pokrovNaNerli, ivanIvHelmet, russianShako1808]
export const exhibitById: ReadonlyMap<string, Exhibit> = new Map(
  exhibits.map((exhibit) => [exhibit.id, exhibit]),
)
export const collections = [ancientRusCollection, russianEmpireCollection] as const

export function getExhibit(id: string): Exhibit | undefined {
  return exhibitById.get(id)
}
