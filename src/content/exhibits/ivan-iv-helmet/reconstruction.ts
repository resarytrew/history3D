import type { EvidenceItem, ReconstructionVersion } from '../../types'

export const helmetKnownEvidence: readonly EvidenceItem[] = [
  {
    id: 'helmet-scan-form',
    kind: 'FACT',
    statement: 'Геометрия и цвет поверхности представлены фотограмметрическим сканом музейного предмета.',
    sourceIds: ['helmet-sketchfab'],
    confidence: 'high',
  },
  {
    id: 'helmet-inscription',
    kind: 'FACT',
    statement: 'Золотая надпись связывает шлем с князем Иваном Васильевичем, будущим Иваном IV.',
    sourceIds: ['royal-armoury-history'],
    confidence: 'high',
  },
  {
    id: 'helmet-gold-decoration',
    kind: 'FACT',
    statement: 'На поверхности шлема присутствует накладной золотой декор.',
    sourceIds: ['royal-armoury-history'],
    confidence: 'high',
  },
] as const

export const helmetInferredEvidence: readonly EvidenceItem[] = [
  {
    id: 'helmet-status-reading',
    kind: 'INFERENCE',
    statement: 'Сочетание золочёного декора и владельческой надписи позволяет читать предмет как знак высокого статуса.',
    sourceIds: ['helmet-sketchfab', 'royal-armoury-history'],
    confidence: 'medium',
  },
] as const

export const helmetUncertainEvidence: readonly EvidenceItem[] = [
  {
    id: 'helmet-route',
    kind: 'INFERENCE',
    statement: 'Предполагаемый путь предмета проходил из Москвы через Варшаву в Швецию.',
    sourceIds: ['helmet-sketchfab', 'royal-armoury-press'],
    confidence: 'medium',
  },
] as const

export const helmetUnknownEvidence: readonly EvidenceItem[] = [
  {
    id: 'helmet-original-use',
    kind: 'UNKNOWN',
    statement: 'Конкретные обстоятельства использования шлема его владельцем не установлены в источниках сцены.',
    sourceIds: [],
    confidence: 'unknown',
    note: 'TODO_RESEARCH',
  },
] as const

export const helmetVersions: readonly ReconstructionVersion[] = [
  {
    version: '1.0-scan',
    date: '2026-09-01',
    summary: 'Исходный музейный фотограмметрический GLB подключён без изменения геометрии и текстуры; в viewer применяется только нормализация масштаба и положения.',
    modelHash: 'sha256:024d2c3f1bb5b7769081c379f92175fb0739af4e17c91cf98ba46c1c96d420e7',
    status: 'technical-review',
  },
] as const
