import { russianEmpireCollection } from './collections/russian-empire'
import { russianShako1808 } from './exhibits/russian-shako-1808/exhibit'
import { russianMusket1808 } from './exhibits/russian-musket-1808/exhibit'
import { russianPistol1798 } from './exhibits/russian-pistol-1798-1804/exhibit'
import type { Exhibit } from './types'

// Only published collections belong in this runtime catalog.
// Temporarily hidden content is retained in suspended-catalog.ts, without a runtime import.
export const exhibits: readonly Exhibit[] = [russianShako1808, russianMusket1808, russianPistol1798]
export const exhibitById: ReadonlyMap<string, Exhibit> = new Map(
  exhibits.map((exhibit) => [exhibit.id, exhibit]),
)
export const collections = [russianEmpireCollection] as const

export function getExhibit(id: string): Exhibit | undefined {
  return exhibitById.get(id)
}
