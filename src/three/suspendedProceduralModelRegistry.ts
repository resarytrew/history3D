import type { Group } from 'three'

/** Retained model factories for hidden collections; not imported by the viewer. */
export const suspendedProceduralModelRegistry: Readonly<Record<string, () => Promise<() => Group>>> = Object.freeze({
  'pokrov-na-nerli-procedural-v2': async () => (await import('../content/exhibits/pokrov-na-nerli/procedural/createPokrovNaNerliModel')).createPokrovNaNerliModel,
})
