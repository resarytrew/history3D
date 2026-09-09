import type { Group } from 'three'
/** New models register lazy factories here; the loader remains independent of exhibit identity. */
export const proceduralModelRegistry: Readonly<Record<string, () => Promise<() => Group>>> = Object.freeze({
  'russian-pistol-1798-1804-v1': async () => (await import('../content/exhibits/russian-pistol-1798-1804/source/createPistol')).createPistol,
  'russian-shako-1808-v1': async () => (await import('../content/exhibits/russian-shako-1808/procedural/createRussianShako1808')).createRussianShako1808,
  'russian-musket-1808-v1': async () => (await import('../content/exhibits/russian-musket-1808/procedural/createRussianMusket1808')).createRussianMusket1808,
})
