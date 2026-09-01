import landscape from './backgrounds/landscape.webp'
import portrait from './backgrounds/portrait.webp'
import poster from './images/poster.webp'
import thumbnail from './images/thumbnail.webp'
import { pokrovContentEn } from './content.en'
import { pokrovContentRu } from './content.ru'
import { pokrovHotspots } from './hotspots'
import {
  inferredEvidence,
  knownEvidence,
  reconstructionVersions,
  uncertainEvidence,
  unknownEvidence,
} from './reconstruction'
import type { Exhibit } from '../../types'

export const pokrovNaNerli: Exhibit = {
  id: 'pokrov-na-nerli',
  slug: 'pokrov-na-nerli',
  collectionId: 'ancient-rus',
  category: 'architecture',
  status: 'technical-review',
  chronology: { label: 'XII век', from: 1101, to: 1200 },
  geography: {
    place: 'река Нерль',
    region: 'Владимиро-Суздальская земля',
    culture: 'Древняя Русь',
  },
  reconstruction: {
    type: 'interpretive-reconstruction',
    summary: 'Интерактивная процедурная 3D-реконструкция по визуальным источникам. Архитектурные системы реализованы как геометрия; пропорции скрытых сторон и детали требуют исторической проверки.',
    known: knownEvidence,
    inferred: inferredEvidence,
    uncertain: uncertainEvidence,
    unknown: unknownEvidence,
    versions: reconstructionVersions,
  },
  model: {
    kind: 'procedural',
    factoryId: 'pokrov-na-nerli-procedural-v2',
    developmentOnly: true,
    approximateTriangles: 31_000,
  },
  architecture: { modes: ['exterior'], initialMode: 'exterior' },
  presentation: {
    initialYaw: -0.14,
    cameraPosition: [12.8, 6.2, 18.5],
    cameraTarget: [0, 3.7, 0],
    minDistance: 7.5,
    maxDistance: 30,
    safeAreaPadding: 0.12,
  },
  hotspots: pokrovHotspots,
  content: { ru: pokrovContentRu, en: pokrovContentEn },
  sources: [
    {
      id: 'unesco-633',
      type: 'heritage-record',
      author: 'UNESCO World Heritage Centre',
      title: 'White Monuments of Vladimir and Suzdal',
      publication: 'World Heritage List',
      url: 'https://whc.unesco.org/en/list/633/',
      accessDate: '2026-09-01',
      note: 'Подтверждает включение церкви Покрова на Нерли в ансамбль и контекст белокаменной архитектуры XII века.',
    },
    {
      id: 'model-reference-user',
      type: 'catalogue',
      title: 'Предоставленный пользователем визуальный reference современной модели/скана',
      accessDate: '2026-09-01',
      note: 'Используется только для общего технического силуэта DEV-модели; права и происхождение требуют уточнения до публикации.',
    },
  ],
  credits: [
    {
      id: 'procedural-dev-model',
      role: '3d-reconstruction',
      groupName: 'HISTORIA 3D — технический прототип',
      note: 'Независимо созданная DEV_ONLY procedural factory; source-guided interpretive reconstruction, не scan и не утверждённая научная модель.',
      license: 'MIT',
    },
    {
      id: 'generated-environment',
      role: 'background',
      displayName: 'OpenAI ImageGen',
      note: 'Сгенерированная среда экспозиции; не исторический источник.',
      license: 'Project runtime asset — provenance review required before publication',
    },
  ],
  assets: {
    thumbnail,
    poster,
    backgrounds: { landscape, portrait },
  },
}
