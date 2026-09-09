import { z } from 'zod'

const text = z.string().trim().min(1, 'Must not be empty')
const id = text
const slug = text.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Expected a lowercase hyphenated slug')
const number = z.number().finite()
const positive = number.positive()
const vector = z.tuple([number, number, number])
const pair = z.tuple([number, number])
const https = z.url({ protocol: /^https$/ })
const asset = text.refine(value => {
  if (value.startsWith('//')) return false
  if (value.startsWith('https:')) return https.safeParse(value).success
  return !value.includes(':') && !value.startsWith('#')
}, 'Expected a local asset path or HTTPS URL')
export const ReviewStatusSchema = z.enum(['draft', 'research', 'reconstruction', 'historical-review', 'technical-review', 'approved', 'published'])
const category = z.enum(['uniform', 'weapon', 'armor', 'architecture', 'religion', 'household', 'transport', 'trade', 'writing', 'person', 'archaeology'])

export const HistoricalSourceSchema = z.object({
  id, type: z.enum(['primary', 'secondary', 'heritage-record', 'catalogue']), author: text.optional(), title: text,
  publication: text.optional(), year: number.int().optional(), page: text.optional(), url: https.optional(),
  museum: text.optional(), inventoryNumber: text.optional(), accessDate: z.iso.date(), note: text.optional(),
  visitorTitle: text.optional(), visitorDescription: text.optional(), visitorStatus: text.optional(), visitorAction: text.optional(),
})
export const EvidenceItemSchema = z.object({
  id, kind: z.enum(['FACT', 'DERIVED', 'INFERENCE', 'RECONSTRUCTION', 'UNKNOWN']), statement: text,
  sourceIds: z.array(id), confidence: z.enum(['high', 'medium', 'low', 'unknown']), note: text.optional(),
  sourceRefs: z.array(z.object({ sourceId: id, locator: text,
    basis: z.enum(['transcribed-document', 'author-reconstruction', 'archaeological-context', 'catalogue-record']),
  })).optional(),
})
export const ReconstructionVersionSchema = z.object({
  version: text, date: z.iso.date(), summary: text, modelHash: text.optional(), status: ReviewStatusSchema,
})
export const HotspotSchema = z.object({
  anchor: z.object({ entityId: id, localPoint: vector, localNormal: vector.refine(v => Math.hypot(...v) > 0, 'Anchor normal must not be zero').optional() }).optional(),
  target: z.object({ entityId: id }).optional(),
  id, number: number.int().positive(), label: text, category: z.enum(['form', 'construction', 'decoration', 'context']),
  position: vector, labelOffset: pair.optional(), cameraTarget: vector, cameraPosition: vector.optional(),
  surface: z.object({ objectName: text, normal: vector.refine(v => Math.hypot(...v) > 0, 'Surface normal must not be zero'), searchDistance: positive }).optional(),
  description: text, observationQuestion: text, evidenceIds: z.array(id).min(1),
})
export const ExhibitModelSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('glb'), src: asset, developmentOnly: z.literal(false).optional(), dracoDecoderPath: asset.optional(),
    normalization: z.object({ targetHeight: positive, centerXZ: z.boolean().optional(), ground: z.boolean().optional(), rotation: vector.optional() }).optional(),
  }),
  z.object({ kind: z.literal('procedural'), factoryId: id, developmentOnly: z.boolean(), approximateTriangles: number.int().positive() }),
])
export const PresentationSchema = z.object({
  initialYaw: number, cameraPosition: vector, cameraTarget: vector, minDistance: positive, maxDistance: positive,
  safeAreaPadding: number.min(0).max(0.5), referenceAspect: positive.optional(), contactShadow: z.boolean().optional(),
  hotspotOcclusionTolerance: number.nonnegative().optional(), polarAngleRange: pair.optional(), sceneScale: positive.optional(),
  lighting: z.literal('artifact-studio').optional(),
  scaleComparison: z.object({ figurePosition: vector, cameraPosition: vector, cameraTarget: vector }).optional(),
}).superRefine((p, ctx) => {
  if (p.maxDistance < p.minDistance) ctx.addIssue({ code: 'custom', path: ['maxDistance'], message: 'Must be at least minDistance' })
  if (p.polarAngleRange && (p.polarAngleRange[0] < 0 || p.polarAngleRange[1] > Math.PI || p.polarAngleRange[0] >= p.polarAngleRange[1]))
    ctx.addIssue({ code: 'custom', path: ['polarAngleRange'], message: 'Expected increasing angles within 0..PI' })
  if (p.cameraPosition.every((v, i) => v === p.cameraTarget[i])) ctx.addIssue({ code: 'custom', path: ['cameraPosition'], message: 'Camera must differ from its target' })
})
export const CreditSchema = z.object({
  id, role: z.enum(['research', '3d-reconstruction', 'historical-review', 'background', 'development']),
  displayName: text.optional(), groupName: text.optional(), note: text.optional(), license: text.optional(),
}).refine(c => c.displayName || c.groupName, 'Credit requires a displayName or groupName')
export const AssetsSchema = z.object({ thumbnail: asset, poster: asset, backgrounds: z.object({ landscape: asset, portrait: asset }) })
export const ExhibitContentSchema = z.object({
  title: text, shortTitle: text, collectionLabel: text, categoryLabel: text, periodLabel: text, regionLabel: text,
  overview: text, researchPrompt: text, observationSteps: z.array(text).min(1), explanation: text,
  narration: z.object({ durationSeconds: positive, transcript: text, audioSrc: asset.optional(), reviewStatus: z.enum(['synthetic-preview', 'human-reviewed']) }).optional(),
})
export const ExhibitSchema = z.object({
  semantics: z.array(z.object({
    id, kind: z.enum(['object', 'assembly', 'part', 'region', 'feature']),
    label: z.object({ ru: text, en: text.optional() }), parentId: id.optional(),
    geometry: z.object({ objectNames: z.array(text) }), explodeOffset: vector.optional(),
  })).optional(),
  id: slug, slug, collectionId: slug, category, status: ReviewStatusSchema,
  chronology: z.object({ label: text, from: number.int().optional(), to: number.int().optional(), circa: z.boolean().optional() }),
  geography: z.object({ place: text.optional(), region: text.optional(), culture: text.optional() }),
  reconstruction: z.object({
    type: z.enum(['scan', 'measured-reconstruction', 'source-based-reconstruction', 'interpretive-reconstruction']), summary: text,
    known: z.array(EvidenceItemSchema), inferred: z.array(EvidenceItemSchema), uncertain: z.array(EvidenceItemSchema), unknown: z.array(EvidenceItemSchema),
    versions: z.array(ReconstructionVersionSchema).min(1),
  }),
  model: ExhibitModelSchema,
  architecture: z.object({ modes: z.array(z.enum(['exterior', 'interior'])).min(1), initialMode: z.enum(['exterior', 'interior']) }).optional(),
  presentation: PresentationSchema, hotspots: z.array(HotspotSchema).min(3),
  content: z.object({ ru: ExhibitContentSchema, en: ExhibitContentSchema.optional() }),
  sources: z.array(HistoricalSourceSchema).min(1), credits: z.array(CreditSchema).min(1), assets: AssetsSchema,
})
export const CollectionSchema = z.object({
  id: slug, title: text, period: text, defaultExhibitId: id,
  entries: z.array(z.object({ id, title: text, category, status: ReviewStatusSchema, exhibitId: id.optional(), icon: z.enum(['axe', 'boat', 'church', 'helmet', 'cross', 'musket']) })).min(1),
})
