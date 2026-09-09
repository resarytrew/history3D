import { describe, expect, it } from 'vitest'
import { exhibits, collections } from '../src/content/catalog'
import { collectAssetReferences, validateCatalog, formatContentIssue } from '../src/content/validation'
import { ExhibitSchema, HotspotSchema, PresentationSchema, HistoricalSourceSchema } from '../src/content/schema'

describe('runtime content validation', () => {
  it('retains asset checks when unrelated schema fields are malformed', () => {
    expect(collectAssetReferences({ content: null, assets: { poster: '/missing.png' }, model: { kind: 'glb', src: '/missing.glb' } }))
      .toEqual([['assets.poster', '/missing.png'], ['model.src', '/missing.glb']])
    expect(collectAssetReferences(null)).toEqual([])
  })
  it('validates actual catalog values', () => {
    expect(validateCatalog(exhibits, collections).errors).toEqual([])
  })
  it('reports unrelated shape and graph errors together with exact paths', () => {
    const e = structuredClone(exhibits[0])
    const broken = { ...e, content: { ru: { ...e.content.ru, title: '' } },
      sources: e.sources.map(s => ({ ...s, url: 'javascript:alert(1)' })),
      reconstruction: { ...e.reconstruction, known: [{ ...e.reconstruction.known[0], sourceIds: ['missing-source'] }] },
      hotspots: [{ ...e.hotspots[0], evidenceIds: ['missing-evidence'] }, ...e.hotspots.slice(1)],
    }
    const report = validateCatalog([broken, ...exhibits.slice(1)], collections)
    const fields = report.errors.map(e => e.field)
    expect(fields).toContain('sources[0].url'); expect(fields).toContain('content.ru.title')
    expect(fields).toContain('reconstruction.known[0].sourceIds[0]'); expect(fields).toContain('hotspots[0].evidenceIds[0]')
    expect(formatContentIssue(report.errors.find(e => e.field === 'reconstruction.known[0].sourceIds[0]')!))
      .toContain('Field: reconstruction.known[0].sourceIds[0]\nError: Unknown source id "missing-source"')
  })
  it('checks duplicate ids across evidence groups and collection references', () => {
    const e = exhibits[0], item = e.reconstruction.known[0]
    const broken = { ...e, sources: [...e.sources, e.sources[0]], reconstruction: { ...e.reconstruction, inferred: [item] } }
    const report = validateCatalog([broken, broken, ...exhibits.slice(1)], [{ ...collections[0], defaultExhibitId: 'absent', entries: [{ ...collections[0].entries[0], exhibitId: 'absent' }] }, ...collections.slice(1)])
    expect(report.errors.some(e => e.message === `Duplicate evidence id "${item.id}"`)).toBe(true)
    expect(report.errors.some(error => error.field === `sources[${e.sources.length}].id`)).toBe(true)
    expect(report.errors.some(e => e.field === 'exhibits[1].id')).toBe(true)
    expect(report.errors.some(e => e.field === 'entries[0].exhibitId')).toBe(true)
  })
  it('blocks unpublished and development-only content in production without changing review status', () => {
    const report = validateCatalog(exhibits, collections, true)
    expect(report.errors.filter(e => e.field === 'status')).toHaveLength(exhibits.filter(e => e.status !== 'published').length)
    expect(report.errors.filter(e => e.field === 'model.developmentOnly')).toHaveLength(exhibits.filter(e => e.model.developmentOnly).length)
    const published = exhibits.map(e => ({ ...e, status: 'published', model: { kind: 'glb', src: '/model.glb' },
      sources: e.sources.map(s => ({ ...s, url: 'https://museum.example/source' })) }))
    expect(validateCatalog(published, collections, true).errors).toEqual([])
  })
  it('rejects malformed dates, missing assets, invalid vectors and camera constraints', () => {
    expect(ExhibitSchema.safeParse({ ...exhibits[0], assets: {} }).success).toBe(false)
    expect(HistoricalSourceSchema.safeParse({ ...exhibits[0].sources[0], accessDate: '2026-02-30' }).success).toBe(false)
    expect(HotspotSchema.safeParse({ ...exhibits[0].hotspots[0], position: [0, NaN, 0] }).success).toBe(false)
    expect(PresentationSchema.safeParse({ ...exhibits[0].presentation, minDistance: 2, maxDistance: 1 }).success).toBe(false)
  })
})
