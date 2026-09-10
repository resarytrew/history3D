import { AssemblyConfigSchema, CollectionSchema, ExhibitSchema } from './schema'
import { validateAssembly } from './assembly'

export interface ContentIssue { entity: string; field: string; message: string }
export interface ValidationReport { errors: ContentIssue[]; warnings: ContentIssue[] }
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const array = (value: unknown): unknown[] => Array.isArray(value) ? value : []
const fieldPath = (path: readonly PropertyKey[]) => path.reduce<string>((out, part) => typeof part === 'number' ? `${out}[${part}]` : `${out}${out ? '.' : ''}${String(part)}`, '')

/** Inspect usable asset references even when unrelated exhibit fields fail their schema. */
export function collectAssetReferences(value: unknown): [string, string][] {
  const e = record(value), assets = record(e.assets), backgrounds = record(assets.backgrounds), model = record(e.model)
  const references: [string, unknown][] = [
    ['assets.thumbnail', assets.thumbnail], ['assets.poster', assets.poster],
    ['assets.backgrounds.landscape', backgrounds.landscape], ['assets.backgrounds.portrait', backgrounds.portrait],
  ]
  if (model.kind === 'glb') references.push(['model.src', model.src])
  for (const [locale, content] of Object.entries(record(e.content)))
    references.push([`content.${locale}.narration.audioSrc`, record(record(content).narration).audioSrc])
  return references.filter((ref): ref is [string, string] => typeof ref[1] === 'string' && ref[1].length > 0)
}

/** Schema and graph passes are independent: one malformed field cannot hide broken references. */
export function validateCatalog(exhibits: readonly unknown[], collections: readonly unknown[], production = false): ValidationReport {
  const report: ValidationReport = { errors: [], warnings: [] }
  const add = (entity: string, field: string, message: string) => report.errors.push({ entity, field, message })
  const unique = (items: readonly unknown[], entity: string, path: string, key = 'id') => {
    const seen = new Set<unknown>()
    items.forEach((value, i) => {
      const id = record(value)[key]
      if (id !== undefined && seen.has(id)) add(entity, `${path}[${i}].${key}`, `Duplicate ${key} "${String(id)}"`)
      seen.add(id)
    })
  }
  unique(exhibits, 'Catalog', 'exhibits'); unique(exhibits, 'Catalog', 'exhibits', 'slug'); unique(collections, 'Catalog', 'collections')
  const exhibitMap = new Map(exhibits.map(e => [record(e).id, record(e)]))
  const collectionMap = new Map(collections.map(c => [record(c).id, record(c)]))
  exhibits.forEach((value, index) => {
    const e = record(value), entity = `Exhibit: ${String(e.id ?? index)}`
    const parsed = ExhibitSchema.safeParse(value)
    if (!parsed.success) for (const issue of parsed.error.issues) add(entity, fieldPath(issue.path), issue.message)
    const assembly = AssemblyConfigSchema.safeParse(e.assembly), definitions = ExhibitSchema.shape.semantics.safeParse(e.semantics)
    if (e.assembly && assembly.success && definitions.success) {
      try { validateAssembly(assembly.data, definitions.data ?? []) }
      catch (error) { add(entity, 'assembly', error instanceof Error ? error.message : String(error)) }
    }
    const semantics = array(e.semantics).map(record)
    const semanticIds = new Map(semantics.map(item => [item.id, item]))
    unique(semantics, entity, 'semantics')
    semantics.forEach((item, i) => {
      if (item.focusAnchor && record(item.focusAnchor).entityId !== item.id) add(entity, `semantics[${i}].focusAnchor.entityId`, 'Focus anchor must belong to its own entity')
      const seen = new Set([item.id])
      let parent = item.parentId
      while (parent !== undefined) {
        if (seen.has(parent)) { add(entity, `semantics[${i}].parentId`, 'Semantic part-of cycle'); break }
        seen.add(parent)
        const ancestor = semanticIds.get(parent)
        if (!ancestor) { add(entity, `semantics[${i}].parentId`, `Unknown semantic parent "${String(parent)}"`); break }
        parent = ancestor.parentId
      }
      if (item.kind === 'part' && !array(record(item.geometry).objectNames).length) add(entity, `semantics[${i}].geometry`, 'Physical part requires geometry')
      if (item.explodeOffset && item.kind !== 'part' && item.kind !== 'assembly') add(entity, `semantics[${i}].explodeOffset`, 'Only parts and assemblies can move')
    })
    array(e.hotspots).forEach((hotspot, i) => {
      for (const key of ['anchor', 'target']) {
        const reference = record(record(hotspot)[key])
        if (reference.entityId !== undefined && !semanticIds.has(reference.entityId)) add(entity, `hotspots[${i}].${key}.entityId`, `Unknown semantic entity "${String(reference.entityId)}"`)
      }
    })
    const sources = array(e.sources), sourceIds = new Set(sources.map(s => record(s).id))
    unique(sources, entity, 'sources'); unique(array(e.hotspots), entity, 'hotspots'); unique(array(e.hotspots), entity, 'hotspots', 'number'); unique(array(e.credits), entity, 'credits')
    const reconstruction = record(e.reconstruction), evidenceIds = new Set<unknown>()
    unique(array(reconstruction.versions), entity, 'reconstruction.versions', 'version')
    for (const group of ['known', 'inferred', 'uncertain', 'unknown']) array(reconstruction[group]).forEach((value, i) => {
      const item = record(value), path = `reconstruction.${group}[${i}]`
      if (evidenceIds.has(item.id)) add(entity, `${path}.id`, `Duplicate evidence id "${String(item.id)}"`)
      evidenceIds.add(item.id)
      array(item.sourceIds).forEach((id, j) => { if (!sourceIds.has(id)) add(entity, `${path}.sourceIds[${j}]`, `Unknown source id "${String(id)}"`) })
      array(item.sourceRefs).forEach((value, j) => {
        const ref = record(value)
        if (!sourceIds.has(ref.sourceId)) add(entity, `${path}.sourceRefs[${j}].sourceId`, `Unknown source id "${String(ref.sourceId)}"`)
        else if (!array(item.sourceIds).includes(ref.sourceId)) add(entity, `${path}.sourceRefs[${j}].sourceId`, 'Source reference must also appear in sourceIds')
      })
      if (item.kind === 'FACT' && !array(item.sourceIds).length) add(entity, `${path}.sourceIds`, 'FACT requires a supporting source')
    })
    array(e.hotspots).forEach((value, i) => array(record(value).evidenceIds).forEach((id, j) => {
      if (!evidenceIds.has(id)) add(entity, `hotspots[${i}].evidenceIds[${j}]`, `Unknown evidence id "${String(id)}"`)
    }))
    unique(array(e.annotations), entity, 'annotations')
    array(e.annotations).forEach((value, i) => {
      const annotation = record(value)
      if (!semanticIds.has(annotation.entityId)) add(entity, `annotations[${i}].entityId`, 'Unknown semantic annotation target')
      if (annotation.anchor && !semanticIds.has(record(annotation.anchor).entityId)) add(entity, `annotations[${i}].anchor.entityId`, 'Unknown anchor frame')
      array(annotation.evidenceIds).forEach((id, j) => { if (!evidenceIds.has(id)) add(entity, `annotations[${i}].evidenceIds[${j}]`, 'Unknown annotation evidence') })
    })
    if (!collectionMap.has(e.collectionId)) add(entity, 'collectionId', `Unknown collection id "${String(e.collectionId)}"`)
    const chronology = record(e.chronology)
    if (typeof chronology.from === 'number' && typeof chronology.to === 'number' && chronology.to < chronology.from) add(entity, 'chronology.to', 'Must be at least chronology.from')
    const architecture = record(e.architecture)
    if (e.architecture && !array(architecture.modes).includes(architecture.initialMode)) add(entity, 'architecture.initialMode', 'Initial mode must appear in modes')
    const model = record(e.model)
    if (production) {
      if (e.status !== 'published') add(entity, 'status', `Production accepts only published exhibits; found ${String(e.status)}`)
      if (model.developmentOnly === true) add(entity, 'model.developmentOnly', 'DEV_ONLY model is forbidden in production')
      if (!sources.some(s => typeof record(s).url === 'string')) add(entity, 'sources', 'Published content requires a web source')
      sources.forEach((value, i) => {
        const s = record(value)
        if (!s.url && !(s.author && s.publication) && !(s.museum && s.inventoryNumber)) add(entity, `sources[${i}]`, 'Source requires a URL, bibliography (author and publication), or museum inventory reference')
      })
      if (!record(e.content).en) add(entity, 'content.en', 'Published content requires the English visitor record')
    } else if (model.developmentOnly === true) report.warnings.push({ entity, field: 'model.developmentOnly', message: 'DEV_ONLY model included in review; blocked from production' })
  })
  collections.forEach((value, index) => {
    const c = record(value), entity = `Collection: ${String(c.id ?? index)}`
    const parsed = CollectionSchema.safeParse(value)
    if (!parsed.success) for (const issue of parsed.error.issues) add(entity, fieldPath(issue.path), issue.message)
    unique(array(c.entries), entity, 'entries')
    const defaultExhibit = exhibitMap.get(c.defaultExhibitId)
    if (!defaultExhibit) add(entity, 'defaultExhibitId', `Unknown exhibit id "${String(c.defaultExhibitId)}"`)
    else if (defaultExhibit.collectionId !== c.id) add(entity, 'defaultExhibitId', 'Default exhibit belongs to another collection')
    if (!array(c.entries).some(entry => record(entry).exhibitId === c.defaultExhibitId)) add(entity, 'defaultExhibitId', 'Default exhibit must appear in collection entries')
    array(c.entries).forEach((value, i) => {
      const entry = record(value)
      if (entry.exhibitId === undefined) {
        if (entry.status === 'published') add(entity, `entries[${i}].exhibitId`, 'Published entry requires an exhibit')
        return
      }
      const target = exhibitMap.get(entry.exhibitId)
      if (!target) add(entity, `entries[${i}].exhibitId`, `Unknown exhibit id "${String(entry.exhibitId)}"`)
      else if (target.collectionId !== c.id) add(entity, `entries[${i}].exhibitId`, 'Exhibit belongs to another collection')
    })
  })
  if (production && !exhibits.some(e => record(e).status === 'published')) add('Catalog', 'exhibits', 'Production build has no published exhibits')
  return report
}

export function formatContentIssue(issue: ContentIssue): string {
  return `${issue.entity}\nField: ${issue.field || '(root)'}\nError: ${issue.message}`
}
