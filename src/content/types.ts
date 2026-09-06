export type Locale = 'ru' | 'en'
export type ReviewStatus =
  | 'draft'
  | 'research'
  | 'reconstruction'
  | 'historical-review'
  | 'technical-review'
  | 'approved'
  | 'published'

export type ExhibitCategory =
  | 'uniform'
  | 'weapon'
  | 'armor'
  | 'architecture'
  | 'religion'
  | 'household'
  | 'transport'
  | 'trade'
  | 'writing'
  | 'person'
  | 'archaeology'

export type EvidenceLevel =
  | 'scan'
  | 'measured-reconstruction'
  | 'source-based-reconstruction'
  | 'interpretive-reconstruction'

export type ClaimKind = 'FACT' | 'DERIVED' | 'INFERENCE' | 'RECONSTRUCTION' | 'UNKNOWN'

export interface HistoricalSource {
  readonly id: string
  readonly type: 'primary' | 'secondary' | 'heritage-record' | 'catalogue'
  readonly author?: string
  readonly title: string
  readonly publication?: string
  readonly year?: number
  readonly page?: string
  readonly url?: `https://${string}`
  readonly museum?: string
  readonly inventoryNumber?: string
  readonly accessDate: `${number}-${number}-${number}`
  readonly note?: string
}

export interface EvidenceItem {
  readonly id: string
  readonly kind: ClaimKind
  readonly statement: string
  readonly sourceIds: readonly string[]
  readonly confidence: 'high' | 'medium' | 'low' | 'unknown'
  readonly note?: string
}

export interface Hotspot {
  readonly id: string
  readonly number: number
  readonly label: string
  readonly category: 'form' | 'construction' | 'decoration' | 'context'
  readonly position: readonly [number, number, number]
  readonly surface?: {
    readonly objectName: string
    readonly normal: readonly [number, number, number]
    readonly searchDistance: number
  }
  readonly cameraTarget: readonly [number, number, number]
  readonly cameraPosition?: readonly [number, number, number]
  readonly description: string
  readonly observationQuestion: string
  readonly evidenceIds: readonly string[]
}

export interface NarrationTrack {
  readonly durationSeconds: number
  readonly transcript: string
  readonly audioSrc?: string
  readonly reviewStatus: 'synthetic-preview' | 'human-reviewed'
}

export interface ExhibitContent {
  readonly title: string
  readonly shortTitle: string
  readonly collectionLabel: string
  readonly categoryLabel: string
  readonly periodLabel: string
  readonly regionLabel: string
  readonly overview: string
  readonly researchPrompt: string
  readonly observationSteps: readonly string[]
  readonly explanation: string
  readonly narration?: NarrationTrack
}

export interface GlbExhibitModel {
  readonly kind: 'glb'
  readonly src: string
  readonly developmentOnly?: false
  readonly dracoDecoderPath?: string
  readonly normalization?: {
    readonly targetHeight: number
    readonly centerXZ?: boolean
    readonly ground?: boolean
    readonly rotation?: readonly [number, number, number]
  }
}

export interface ProceduralExhibitModel {
  readonly kind: 'procedural'
  readonly factoryId: string
  readonly developmentOnly: boolean
  readonly approximateTriangles: number
}

export type ExhibitModel = GlbExhibitModel | ProceduralExhibitModel

export interface Credit {
  readonly id: string
  readonly role: 'research' | '3d-reconstruction' | 'historical-review' | 'background' | 'development'
  readonly displayName?: string
  readonly groupName?: string
  readonly note?: string
  readonly license?: string
}

export interface ReconstructionVersion {
  readonly version: string
  readonly date: `${number}-${number}-${number}`
  readonly summary: string
  readonly modelHash?: string
  readonly status: ReviewStatus
}

export interface Exhibit {
  readonly id: string
  readonly slug: string
  readonly collectionId: string
  readonly category: ExhibitCategory
  readonly status: ReviewStatus
  readonly chronology: {
    readonly label: string
    readonly from?: number
    readonly to?: number
    readonly circa?: boolean
  }
  readonly geography: {
    readonly place?: string
    readonly region?: string
    readonly culture?: string
  }
  readonly reconstruction: {
    readonly type: EvidenceLevel
    readonly summary: string
    readonly known: readonly EvidenceItem[]
    readonly inferred: readonly EvidenceItem[]
    readonly uncertain: readonly EvidenceItem[]
    readonly unknown: readonly EvidenceItem[]
    readonly versions: readonly ReconstructionVersion[]
  }
  readonly model: ExhibitModel
  readonly architecture?: {
    readonly modes: readonly ('exterior' | 'interior')[]
    readonly initialMode: 'exterior' | 'interior'
  }
  readonly presentation: {
    readonly initialYaw: number
    readonly cameraPosition: readonly [number, number, number]
    readonly cameraTarget: readonly [number, number, number]
    readonly minDistance: number
    readonly maxDistance: number
    readonly safeAreaPadding: number
    readonly hotspotOcclusionTolerance?: number
    readonly sceneScale?: number
    readonly lighting?: 'artifact-studio'
    readonly scaleComparison?: {
      readonly figurePosition: readonly [number, number, number]
      readonly cameraPosition: readonly [number, number, number]
      readonly cameraTarget: readonly [number, number, number]
    }
  }
  readonly hotspots: readonly Hotspot[]
  readonly content: Readonly<Partial<Record<Locale, ExhibitContent>>>
  readonly sources: readonly HistoricalSource[]
  readonly credits: readonly Credit[]
  readonly assets: {
    readonly thumbnail: string
    readonly poster: string
    readonly backgrounds: {
      readonly landscape: string
      readonly portrait: string
    }
  }
}

export interface CollectionEntry {
  readonly id: string
  readonly title: string
  readonly category: ExhibitCategory
  readonly status: ReviewStatus
  readonly exhibitId?: string
  readonly icon: 'axe' | 'boat' | 'church' | 'helmet' | 'cross'
}

export interface ExhibitCollection {
  readonly id: string
  readonly title: string
  readonly period: string
  readonly defaultExhibitId: string
  readonly entries: readonly CollectionEntry[]
}
