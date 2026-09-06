import { describe, expect, it } from 'vitest'
import { ancientRusCollection } from '../src/content/collections/ancient-rus'
import { collections, exhibitById, exhibits } from '../src/content/catalog'

describe('exhibit catalog', () => {
  it('places the source-based shako in its own collection with six grounded hotspots', () => {
    const shako = exhibitById.get('russian-shako-1808')!
    expect(shako.collectionId).toBe('russian-empire')
    expect(shako.status).toBe('historical-review')
    expect(shako.reconstruction.type).toBe('source-based-reconstruction')
    expect(shako.hotspots).toHaveLength(6)
    expect(collections.find((c) => c.id === shako.collectionId)?.entries[0].exhibitId).toBe(shako.id)
    const evidence = [...shako.reconstruction.known, ...shako.reconstruction.inferred, ...shako.reconstruction.unknown].map((e) => e.id)
    shako.hotspots.forEach((h) => h.evidenceIds.forEach((id) => expect(evidence).toContain(id)))
    expect(shako.reconstruction.inferred.find((e) => e.id === 'bottom-derived')?.kind).toBe('DERIVED')
    expect(shako.chronology.from).toBe(1810)
    expect(shako.chronology.to).toBe(1810)
    for (const item of shako.reconstruction.known) {
      expect(item.sourceRefs?.length).toBeGreaterThan(0)
      for (const ref of item.sourceRefs ?? []) {
        expect(shako.sources.some((source) => source.id === ref.sourceId)).toBe(true)
        expect(item.sourceIds).toContain(ref.sourceId)
        expect(ref.locator).toMatch(/с\./)
      }
    }
  })
  it('discovers a self-contained Pokrov package', () => {
    const exhibit = exhibitById.get('pokrov-na-nerli')
    expect(exhibit).toBeDefined()
    expect(exhibit?.model.kind).toBe('procedural')
    expect(exhibit?.hotspots).toHaveLength(3)
    expect(exhibit?.sources.length).toBeGreaterThan(0)
    expect(exhibit?.content.ru?.title).toBe('Покрова на Нерли')
  })

  it('discovers the Ivan IV helmet scan package', () => {
    const exhibit = exhibitById.get('ivan-iv-helmet')
    expect(exhibit).toBeDefined()
    expect(exhibit?.model.kind).toBe('glb')
    expect(exhibit?.reconstruction.type).toBe('scan')
    expect(exhibit?.hotspots).toHaveLength(3)
    expect(exhibit?.content.ru?.title).toBe('Шлем Ивана IV')
  })

  it('keeps all ids and slugs unique', () => {
    expect(new Set(exhibits.map((exhibit) => exhibit.id)).size).toBe(exhibits.length)
    expect(new Set(exhibits.map((exhibit) => exhibit.slug)).size).toBe(exhibits.length)
  })

  it('does not publish draft carousel entries', () => {
    const drafts = ancientRusCollection.entries.filter((entry) => entry.status === 'draft')
    expect(drafts).toHaveLength(3)
    expect(drafts.every((entry) => entry.exhibitId === undefined)).toBe(true)
  })
})
