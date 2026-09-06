import type { Group } from 'three'
/** New models register lazy factories here; the loader remains independent of exhibit identity. */
export const proceduralModelRegistry: Readonly<Record<string, () => Promise<() => Group>>> = Object.freeze({
  'pokrov-na-nerli-procedural-v2': async () => (await import('../content/exhibits/pokrov-na-nerli/procedural/createPokrovNaNerliModel')).createPokrovNaNerliModel,
  'russian-shako-1808-v1': async () => (await import('../content/exhibits/russian-shako-1808/procedural/createRussianShako1808')).createRussianShako1808,
})
