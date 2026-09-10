import type { EntityAnnotation } from '../../semantics'
import { pistolHotspots } from './hotspots'

const targets: Readonly<Record<string, string>> = {
  'pistol-barrel': 'barrel', 'pistol-lock': 'lock', 'pistol-cock': 'lock',
  'pistol-stock': 'stock', 'pistol-ramrod': 'ramrod', 'pistol-grip': 'pistol',
}
/** Preserve evidence and qualifications verbatim; spatial anchors do not assign meaning. */
export const pistolAnnotations: readonly EntityAnnotation[] = pistolHotspots.map(hotspot => ({
  id: hotspot.id, entityId: targets[hotspot.id], anchor: hotspot.anchor,
  label: hotspot.id === 'pistol-grip' ? 'Рукоять и затыльник' : hotspot.label,
  description: hotspot.description, observationQuestion: hotspot.observationQuestion, evidenceIds: hotspot.evidenceIds,
}))
