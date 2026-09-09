import { access, readdir, stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { createServer } from 'vite'
import { collectAssetReferences, validateCatalog, formatContentIssue, type ContentIssue } from '../src/content/validation'
import { proceduralModelRegistry } from '../src/three/proceduralModelRegistry'
import { suspendedProceduralModelRegistry } from '../src/three/suspendedProceduralModelRegistry'

const root = process.cwd(), production = process.argv.includes('--production')
const errors: ContentIssue[] = [], warnings: ContentIssue[] = []
const requiredDocs = ['README.md', ...['PRODUCT_VISION', 'ARCHITECTURE', 'REFERENCE_ANALYSIS', 'EXHIBIT_AUTHORING_GUIDE',
  'HISTORICAL_ACCURACY_POLICY', 'RECONSTRUCTION_WORKFLOW', 'IMG2THREEJS_WORKFLOW', 'MODEL_PIPELINE', 'CONTENT_SCHEMA', 'ROADMAP', 'workshop-architecture'].map(name => `docs/${name}.md`)]
for (const path of requiredDocs) {
  try { await access(join(root, path)) } catch { errors.push({ entity: 'Repository', field: path, message: 'Missing required document' }) }
}

// SSR transforms the exact content graph used by the application, including imported asset URLs.
// Never inspect TypeScript source text to infer its runtime values.
const server = await createServer({
  // SSR validation must not invalidate an already-running dev viewer's optimized imports.
  cacheDir: resolve(root, 'node_modules/.vite-content-validation'),
  server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', logLevel: 'silent',
})
let count: number
try {
  const packages = (await readdir(join(root, 'src/content/exhibits'), { withFileTypes: true })).filter(entry => entry.isDirectory())
  const packageExhibits: unknown[] = []
  for (const directory of packages) {
    const entity = `Exhibit: ${directory.name}`
    for (const file of ['exhibit.ts', 'content.ru.ts', 'content.en.ts', 'reconstruction.ts', 'hotspots.ts']) {
      try { await access(join(root, 'src/content/exhibits', directory.name, file)) }
      catch { errors.push({ entity, field: file, message: 'Missing package file' }) }
    }
    try {
      const module = await server.ssrLoadModule(`/src/content/exhibits/${directory.name}/exhibit.ts`)
      const values = Object.values(module).filter(value => value && typeof value === 'object' && 'id' in value)
      if (values.length !== 1) errors.push({ entity, field: 'exhibit.ts', message: 'Package must export exactly one exhibit record' })
      for (const value of values) {
        packageExhibits.push(value)
        const record = value as Record<string, unknown>
        for (const field of ['id', 'slug']) if (record[field] !== directory.name) errors.push({ entity, field, message: 'Must match the package directory' })
      }
    } catch (error) { errors.push({ entity, field: 'exhibit.ts', message: `Cannot load runtime module: ${String(error)}` }) }
  }
  let collections: unknown[] = []
  let activeIds = new Set<string>()
  let suspendedIds = new Set<string>()
  try {
    const catalog = await server.ssrLoadModule('/src/content/catalog.ts')
    const suspended = await server.ssrLoadModule('/src/content/suspended-catalog.ts')
    collections = [...catalog.collections, ...suspended.suspendedCollections]
    suspendedIds = new Set((suspended.suspendedExhibits as { id: string }[]).map(e => e.id))
    const exported = new Set((catalog.exhibits as { id: string }[]).map(e => e.id))
    activeIds = exported
    for (const id of suspendedIds) if (exported.has(id)) errors.push({ entity: `Exhibit: ${id}`, field: 'catalog', message: 'Exhibit cannot be both active and suspended' })
    for (const e of packageExhibits as { id: string }[]) if (!exported.has(e.id) && !suspendedIds.has(e.id)) errors.push({ entity: `Exhibit: ${e.id}`, field: 'catalog', message: 'Package is missing from both active and suspended catalogs' })
    const packaged = new Set((packageExhibits as { id: string }[]).map(e => e.id))
    for (const e of catalog.exhibits as { id: string }[]) if (!packaged.has(e.id)) errors.push({ entity: `Exhibit: ${e.id}`, field: 'catalog', message: 'Catalog exhibit has no loadable package' })
    // Validate catalog duplicates too; package enumeration alone cannot find repeated imports.
    const seen = new Set<string>()
    for (const e of catalog.exhibits as { id: string }[]) {
      if (seen.has(e.id)) errors.push({ entity: 'Catalog', field: 'exhibits', message: `Duplicate exhibit id "${e.id}"` })
      seen.add(e.id)
    }
  } catch (error) { errors.push({ entity: 'Catalog', field: 'catalog.ts', message: `Cannot load runtime catalog: ${String(error)}` }) }
  const report = validateCatalog(packageExhibits, collections, false)
  if (production) {
    const activeCatalog = await server.ssrLoadModule('/src/content/catalog.ts')
    const productionReport = validateCatalog(packageExhibits.filter(value => activeIds.has((value as { id: string }).id)), activeCatalog.collections, true)
    errors.push(...productionReport.errors)
  }
  errors.push(...report.errors); warnings.push(...report.warnings); count = packageExhibits.length
  for (const value of packageExhibits) {
    const e = value as { id?: unknown; model?: { kind?: unknown; factoryId?: unknown } }, entity = `Exhibit: ${String(e.id)}`
    const assets = collectAssetReferences(value)
    const registry = suspendedIds.has(String(e.id)) ? { ...proceduralModelRegistry, ...suspendedProceduralModelRegistry } : proceduralModelRegistry
    if (e.model?.kind === 'procedural' && typeof e.model.factoryId === 'string' && !Object.hasOwn(registry, e.model.factoryId))
      errors.push({ entity, field: 'model.factoryId', message: `Unknown procedural factory "${e.model.factoryId}"` })
    let backgroundBytes = 0
    const backgrounds = new Set<string>()
    for (const [field, url] of assets) {
      if (url.startsWith('https://')) continue // Remote availability is not a deterministic build gate.
      let path: string
      try { path = decodeURIComponent(url.split('?')[0]) }
      catch { errors.push({ entity, field, message: 'Malformed URL encoding in asset path' }); continue }
      const local = path.startsWith('/@fs/') ? path.slice(5) : resolve(root, path.startsWith('/src/') ? path.slice(1) : `public/${path.replace(/^\//, '')}`)
      const relativePath = relative(root, local)
      if (relativePath.startsWith('..') || isAbsolute(relativePath)) { errors.push({ entity, field, message: 'Asset must be inside the repository' }); continue }
      try {
        const file = await stat(local)
        if (!file.isFile() || file.size === 0) errors.push({ entity, field, message: `Asset is empty or not a file: ${url}` })
        if (field.startsWith('assets.backgrounds') && !backgrounds.has(local)) { backgroundBytes += file.size; backgrounds.add(local) }
      } catch { errors.push({ entity, field, message: `Missing asset: ${url}` }) }
    }
    if (backgroundBytes > 3_000_000) warnings.push({ entity, field: 'assets.backgrounds', message: 'Backgrounds exceed the 3 MB review target' })
  }
} finally { await server.close() }

for (const warning of warnings) console.warn(`Warning: ${warning.entity} / ${warning.field}: ${warning.message}`)
if (errors.length) {
  console.error(`Content validation failed with ${errors.length} error(s):\n`)
  errors.forEach(error => console.error(`${formatContentIssue(error)}\n`))
  process.exitCode = 1
} else console.log(`Content validation passed: ${count} package(s), ${warnings.length} review warning(s).`)
