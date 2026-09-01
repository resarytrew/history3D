import type { EvidenceItem, ReconstructionVersion } from '../../types'

export const knownEvidence: readonly EvidenceItem[] = [
  {
    id: 'evidence-white-stone-school',
    kind: 'FACT',
    statement: 'Объект входит в ансамбль белокаменных памятников Владимира и Суздаля и относится к архитектуре XII века.',
    sourceIds: ['unesco-633'],
    confidence: 'high',
  },
  {
    id: 'evidence-visible-vertical-rhythm',
    kind: 'FACT',
    statement: 'В современной наблюдаемой форме читаются вытянутые пропорции, узкие проёмы и вертикальное членение фасада.',
    sourceIds: ['model-reference-user'],
    confidence: 'high',
    note: 'Визуальное наблюдение по предоставленному пользователем reference image; не утверждение о неизменности формы с XII века.',
  },
] as const

export const inferredEvidence: readonly EvidenceItem[] = [
  {
    id: 'evidence-dev-proportions',
    kind: 'INFERENCE',
    statement: 'Пропорции временной 3D-модели приблизительно выведены из одного видимого ракурса.',
    sourceIds: ['model-reference-user'],
    confidence: 'low',
  },
] as const

export const uncertainEvidence: readonly EvidenceItem[] = [
  {
    id: 'evidence-surface-state',
    kind: 'RECONSTRUCTION',
    statement: 'Цвет, фактура и состояние поверхности в DEV-модели условны.',
    sourceIds: [],
    confidence: 'low',
  },
] as const

export const unknownEvidence: readonly EvidenceItem[] = [
  {
    id: 'evidence-xii-appearance',
    kind: 'UNKNOWN',
    statement: 'Точный внешний вид, отделка и все строительные изменения между XII веком и современностью требуют отдельного исследования.',
    sourceIds: [],
    confidence: 'unknown',
    note: 'TODO_RESEARCH',
  },
] as const

export const reconstructionVersions: readonly ReconstructionVersion[] = [
  {
    version: '0.1-dev',
    date: '2026-09-01',
    summary: 'Первая процедурная модель для проверки viewer, камеры, hotspots и responsive layout.',
    status: 'technical-review',
  },
  {
    version: '0.2-procedural',
    date: '2026-09-01',
    summary: 'Архитектурно расчленённая процедурная реконструкция: фасады, закомары, три апсиды, порталы, окна, аркатурный пояс, барабан, купол и крест существуют как отдельная геометрия.',
    status: 'technical-review',
  },
] as const
