import { describe, expect, it } from 'vitest'
import { ancientRusCollection } from '../src/content/collections/ancient-rus'
import { exhibitById, exhibits } from '../src/content/catalog'

describe('exhibit catalog', () => {
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
