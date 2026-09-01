import interior from './backgrounds/interior.png'
import poster from './images/poster.png'
import thumbnail from './images/thumbnail.png'
import modelSrc from './models/ivan-iv-helmet.glb?url'
import { ivanIvHelmetContentEn } from './content.en'
import { ivanIvHelmetContentRu } from './content.ru'
import { ivanIvHelmetHotspots } from './hotspots'
import {
  helmetInferredEvidence,
  helmetKnownEvidence,
  helmetUnknownEvidence,
  helmetUncertainEvidence,
  helmetVersions,
} from './reconstruction'
import type { Exhibit } from '../../types'

export const ivanIvHelmet: Exhibit = {
  id: 'ivan-iv-helmet',
  slug: 'ivan-iv-helmet',
  collectionId: 'ancient-rus',
  category: 'armor',
  status: 'technical-review',
  chronology: { label: 'около 1533 года', from: 1533, to: 1533, circa: true },
  geography: { place: 'Москва', region: 'Московское государство', culture: 'Русское государство' },
  reconstruction: {
    type: 'scan',
    summary: 'Фотограмметрический 3D-скан музейного предмета. Геометрия и текстура сохранены; runtime автоматически центрирует модель и приводит её к масштабу сцены.',
    known: helmetKnownEvidence,
    inferred: helmetInferredEvidence,
    uncertain: helmetUncertainEvidence,
    unknown: helmetUnknownEvidence,
    versions: helmetVersions,
  },
  model: {
    kind: 'glb',
    src: modelSrc,
    normalization: { targetHeight: 3.4, centerXZ: true, ground: true },
  },
  presentation: {
    initialYaw: -0.18,
    cameraPosition: [5.1, 2.55, 7.4],
    cameraTarget: [0, 1.5, 0],
    minDistance: 3.1,
    maxDistance: 12,
    safeAreaPadding: 0.12,
  },
  hotspots: ivanIvHelmetHotspots,
  content: { ru: ivanIvHelmetContentRu, en: ivanIvHelmetContentEn },
  sources: [
    {
      id: 'helmet-sketchfab',
      type: 'heritage-record',
      author: 'The Royal Armoury (Livrustkammaren)',
      title: 'Tsar Ivan IV’s “Ivan the Terrible’s” Helmet',
      publication: 'Sketchfab',
      url: 'https://sketchfab.com/3d-models/tsar-ivan-ivs-ivan-the-terribles-helmet-74da2505ff2240a19217150c555a9e82',
      museum: 'The Royal Armoury, Sweden',
      accessDate: '2026-09-01',
      note: 'Источник 3D-скана и атрибуции; лицензия модели CC BY 4.0.',
    },
    {
      id: 'royal-armoury-history',
      type: 'heritage-record',
      author: 'Livrustkammaren',
      title: 'Självständighet och maktkamp',
      publication: '500 år av monarki',
      url: 'https://livrustkammaren.se/kunglig-historia/500-ar-av-monarki/sjalvstandighet-och-maktkamp/',
      museum: 'Livrustkammaren',
      accessDate: '2026-09-01',
      note: 'Официальная музейная справка о золотом декоре, надписи и истории предмета.',
    },
    {
      id: 'royal-armoury-press',
      type: 'heritage-record',
      author: 'Livrustkammaren',
      title: 'Fri entré – en publiksuccé',
      publication: 'Livrustkammaren press',
      url: 'https://livrustkammaren.se/press/fri-entre-en-publiksucce/',
      museum: 'Livrustkammaren',
      accessDate: '2026-09-01',
      note: 'Официальная справка о датировке и перемещении шлема в XVII веке.',
    },
  ],
  credits: [
    {
      id: 'royal-armoury-scan',
      role: '3d-reconstruction',
      displayName: 'The Royal Armoury (Livrustkammaren)',
      note: 'Исходная фотограмметрическая модель опубликована музеем на Sketchfab.',
      license: 'CC BY 4.0',
    },
    {
      id: 'user-provided-interior',
      role: 'background',
      displayName: 'Предоставлено пользователем',
      note: 'Фоновое изображение сцены; сведения об авторе и лицензии не указаны.',
      license: 'Требуется уточнение перед публикацией',
    },
  ],
  assets: {
    thumbnail,
    poster,
    backgrounds: { landscape: interior, portrait: interior },
  },
}
