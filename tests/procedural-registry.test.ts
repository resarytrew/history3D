import { describe, expect, it } from 'vitest'
import { loadExhibitModel } from '../src/three/model-runtime'
import { proceduralModelRegistry } from '../src/three/proceduralModelRegistry'
import { russianShako1808 } from '../src/content/exhibits/russian-shako-1808/exhibit'

describe('lazy procedural registry', () => {
  it('keeps procedural exhibits registered and loads the shako through runtime', async () => {
    expect(Object.keys(proceduralModelRegistry)).toHaveLength(3)
    const loaded = await loadExhibitModel(russianShako1808.model, new AbortController().signal)
    expect(loaded.root.name).toBe('RussianShako1808')
    loaded.dispose()
  })
  it('rejects unknown ids and object-prototype names', async () => {
    for (const factoryId of ['missing', 'toString', '__proto__']) {
      await expect(loadExhibitModel({ kind: 'procedural', factoryId, developmentOnly: true, approximateTriangles: 0 }, new AbortController().signal)).rejects.toThrow('Unknown procedural factory')
    }
  })
  it('respects cancellation before creating geometry', async () => {
    const controller = new AbortController(); controller.abort()
    await expect(loadExhibitModel(russianShako1808.model, controller.signal)).rejects.toThrow()
  })
})
