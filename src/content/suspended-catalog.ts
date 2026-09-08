import { ancientRusCollection } from './collections/ancient-rus'
import { ivanIvHelmet } from './exhibits/ivan-iv-helmet/exhibit'
import { pokrovNaNerli } from './exhibits/pokrov-na-nerli/exhibit'
import type { Exhibit } from './types'

/** Retained for further development. Do not import into the published runtime catalog
 * until the collection is ready: its content and asset imports must remain inactive. */
export const suspendedCollections = [ancientRusCollection] as const
export const suspendedExhibits: readonly Exhibit[] = [pokrovNaNerli, ivanIvHelmet]
