import { access, readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const production = process.argv.includes('--production')
const errors: string[] = []
const warnings: string[] = []

const requiredDocs = [
  'README.md',
  'docs/PRODUCT_VISION.md',
  'docs/ARCHITECTURE.md',
  'docs/REFERENCE_ANALYSIS.md',
  'docs/EXHIBIT_AUTHORING_GUIDE.md',
  'docs/HISTORICAL_ACCURACY_POLICY.md',
  'docs/RECONSTRUCTION_WORKFLOW.md',
  'docs/IMG2THREEJS_WORKFLOW.md',
  'docs/MODEL_PIPELINE.md',
  'docs/CONTENT_SCHEMA.md',
  'docs/ROADMAP.md',
  'docs/workshop-architecture.md',
] as const

async function exists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}

for (const path of requiredDocs) {
  if (!(await exists(join(root, path)))) errors.push(`Missing required document: ${path}`)
}

const exhibitsRoot = join(root, 'src/content/exhibits')
const exhibitDirs = (await readdir(exhibitsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
const seenIds = new Set<string>()
let publishedCount = 0

for (const directory of exhibitDirs) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(directory)) {
    errors.push(`Invalid exhibit directory slug: ${directory}`)
  }
  const packageRoot = join(exhibitsRoot, directory)
  const requiredPackageFiles = [
    'exhibit.ts', 'content.ru.ts', 'content.en.ts', 'reconstruction.ts', 'hotspots.ts',
  ]
  for (const path of requiredPackageFiles) {
    if (!(await exists(join(packageRoot, path)))) errors.push(`${directory}: missing ${path}`)
  }
  const exhibitSource = await readFile(join(packageRoot, 'exhibit.ts'), 'utf8')
  const id = exhibitSource.match(/\bid:\s*'([^']+)'/)?.[1]
  const slug = exhibitSource.match(/\bslug:\s*'([^']+)'/)?.[1]
  const status = exhibitSource.match(/\bstatus:\s*'([^']+)'/)?.[1]
  if (!id || id !== directory) errors.push(`${directory}: package id must match its directory`)
  if (!slug || slug !== directory) errors.push(`${directory}: slug must match its directory`)
  if (id && seenIds.has(id)) errors.push(`Duplicate exhibit id: ${id}`)
  if (id) seenIds.add(id)
  if (!exhibitSource.includes('reconstruction:') || !exhibitSource.includes('sources:') || !exhibitSource.includes('credits:')) {
    errors.push(`${directory}: missing reconstruction, sources, or credits`)
  }
  const hotspotSource = await readFile(join(packageRoot, 'hotspots.ts'), 'utf8')
  const hotspotCount = (hotspotSource.match(/\bnumber:\s*\d+/g) ?? []).length
  if (hotspotCount < 3) errors.push(`${directory}: at least three hotspots are required`)
  if (!hotspotSource.includes('cameraTarget') || !hotspotSource.includes('evidenceIds')) {
    errors.push(`${directory}: hotspot camera targets and evidence references are required`)
  }
  const reconstructionSource = await readFile(join(packageRoot, 'reconstruction.ts'), 'utf8')
  if (!reconstructionSource.includes("kind: 'UNKNOWN'") || !reconstructionSource.includes('TODO_RESEARCH')) {
    errors.push(`${directory}: unknown evidence and TODO_RESEARCH must remain explicit`)
  }
  const backgroundsRoot = join(packageRoot, 'backgrounds')
  const backgroundFiles = (await exists(backgroundsRoot))
    ? (await readdir(backgroundsRoot)).filter((path) => /\.(?:avif|jpe?g|png|webp)$/i.test(path))
    : []
  if (backgroundFiles.length === 0) errors.push(`${directory}: at least one background image is required`)
  const backgroundBytes = (await Promise.all(backgroundFiles.map((path) => stat(join(backgroundsRoot, path)))))
    .reduce((total, file) => total + file.size, 0)
  if (backgroundBytes > 3_000_000) warnings.push(`${directory}: backgrounds exceed the 3 MB review target`)
  if (status === 'published') publishedCount += 1
  if (production) {
    if (status !== 'published') errors.push(`${directory}: production accepts only published exhibits; found ${status ?? 'missing status'}`)
    if (exhibitSource.includes('developmentOnly: true')) errors.push(`${directory}: DEV_ONLY model is forbidden in production`)
    if (!exhibitSource.includes('url: \'https://')) errors.push(`${directory}: published content requires a web source`)
  } else if (exhibitSource.includes('developmentOnly: true')) {
    warnings.push(`${directory}: DEV_ONLY model included in review build and blocked from production`)
  }
}

if (production && publishedCount === 0) errors.push('Production build has no published exhibits')

for (const warning of warnings) console.warn(`warning: ${warning}`)
if (errors.length) {
  console.error(`Content validation failed with ${errors.length} error(s):`)
  errors.forEach((error) => console.error(`- ${error}`))
  process.exitCode = 1
} else {
  console.log(`Content validation passed: ${exhibitDirs.length} package(s), ${warnings.length} review warning(s).`)
}
