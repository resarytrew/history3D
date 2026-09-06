import type { Exhibit } from '../../types'
import { shakoContentRu } from './content.ru'
import { shakoContentEn } from './content.en'
import { shakoReconstruction } from './reconstruction'
import { shakoHotspots } from './hotspots'
import poster from './images/poster.png'
import thumbnail from './images/thumbnail.png'
import studio from './backgrounds/studio.png'

export const russianShako1808: Exhibit = {
  id: 'russian-shako-1808', slug: 'russian-shako-1808', collectionId: 'russian-empire',
  category: 'uniform', status: 'historical-review',
  chronology: { label: 'Образец 1808 года · кампания 1812 года', from: 1808, to: 1812 },
  geography: { region: 'Российская империя', culture: 'Русская армейская пехота' },
  reconstruction: shakoReconstruction,
  model: { kind: 'procedural', factoryId: 'russian-shako-1808-v1', developmentOnly: true, approximateTriangles: 74_144 },
  presentation: {
    initialYaw: 0, cameraPosition: [0.37, 0.32, 0.79], cameraTarget: [0, 0.17, 0],
    minDistance: 0.3, maxDistance: 1.6, safeAreaPadding: 0.12,
    hotspotOcclusionTolerance: 0.008,
    sceneScale: 0.08,
    scaleComparison: { figurePosition: [-0.55, 0, 0], cameraPosition: [1.4, 1.4, 3.4], cameraTarget: [-0.2, 0.85, 0] },
  },
  hotspots: shakoHotspots, content: { ru: shakoContentRu, en: shakoContentEn },
  sources: [
    { id: 'alekhin-ulyanov-2006', type: 'secondary', author: 'П. Г. Алехин, И. Э. Ульянов',
      title: 'Мода или практичность? Сравнение русского кивера образца 1808 г. и французского кивера образца 1806 г.',
      publication: 'Сержант №36 (3/2006)', year: 2006, accessDate: '2026-09-06',
      note: 'Библиография и сведения предоставлены пользователем; публикация независимо не открывалась и не проверялась.' },
    { id: 'locked-shako-spec', type: 'catalogue', title: 'Предоставленная историческая спецификация и шесть изображений кивера', accessDate: '2026-09-06',
      note: 'Зафиксированное человеком задание реконструкции. Фотографии используются для конструкции и материалов; противоречащие выбранному варианту орёл, султан и цветные кисти исключены. Это не первичный документ 1808 года.' },
  ],
  credits: [
    { id: 'shako-geometry', role: '3d-reconstruction', groupName: 'HISTORIA 3D', note: 'Процедурная Three.js-геометрия по заданной спецификации. Историческая проверка человеком ожидается.', license: 'MIT' },
    { id: 'shako-studio', role: 'background', groupName: 'HISTORIA 3D', note: 'Однотонный технический студийный фон. Историческую среду кадеты подготовят отдельно.', license: 'MIT' },
  ],
  assets: { thumbnail, poster, backgrounds: { landscape: studio, portrait: studio } },
}
