import { ancientRusCollection } from './collections/ancient-rus'
import { ivanIvHelmet } from './exhibits/ivan-iv-helmet/exhibit'
import { pokrovNaNerli } from './exhibits/pokrov-na-nerli/exhibit'
import type { Exhibit } from './types'

export const exhibits: readonly Exhibit[] = [pokrovNaNerli, ivanIvHelmet]
export const exhibitById: ReadonlyMap<string, Exhibit> = new Map(
  exhibits.map((exhibit) => [exhibit.id, exhibit]),
)
export const collections = [ancientRusCollection] as const

export function getExhibit(id: string): Exhibit | undefined {
  return exhibitById.get(id)
}
