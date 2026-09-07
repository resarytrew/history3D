import type { Exhibit } from '../../types'
import { musketContentRu } from './content.ru'
import { musketContentEn } from './content.en'
import { musketReconstruction } from './reconstruction'
import { musketHotspots } from './hotspots'
import poster from './images/poster.png'
import thumbnail from './images/thumbnail.png'
import studio from './backgrounds/studio.png'

export const russianMusket1808: Exhibit = {
  id: 'russian-musket-1808', slug: 'russian-musket-1808', collectionId: 'russian-empire', category: 'weapon', status: 'reconstruction',
  chronology: { label: 'Образец 1808 года · прототип 1811 года', from: 1811, to: 1811 },
  geography: { place: 'Тула', region: 'Российская империя' },
  reconstruction: musketReconstruction,
  model: { kind: 'procedural', factoryId: 'russian-musket-1808-v1', developmentOnly: true, approximateTriangles: 395_168 },
  presentation: {
    initialYaw: 0, cameraPosition: [0.03, 0.54, 2.10], cameraTarget: [-0.09, 0.22, 0],
    minDistance: 0.13, maxDistance: 6, safeAreaPadding: 0.12, referenceAspect: 1.5,
    hotspotOcclusionTolerance: 0.00045, polarAngleRange: [0.08, 3.06], sceneScale: 0.3, lighting: 'artifact-studio',
    scaleComparison: { figurePosition: [-1.02, 0, 0], cameraPosition: [0.15, 1.05, 4.4], cameraTarget: [-0.15, 0.85, 0] },
  },
  hotspots: musketHotspots, content: { ru: musketContentRu, en: musketContentEn },
  sources: [
    { id: 'padikovo-1811', type: 'catalogue', title: 'Пехотное ружье образца 1808 г.', museum: 'Музей отечественной военной истории, Падиково',
      url: 'https://www.kskdivniy.ru/museum/eksponaty/pehotnoe-ruzhe-1808-g/', accessDate: '2026-09-07',
      visitorDescription: 'Карточка прототипа: Тульский оружейный завод, 1811 год. Общие обмеры и история переделок не опубликованы.', visitorAction: 'Открыть музейную карточку ↗' },
    { id: 'pink-tula', type: 'secondary', author: 'И. Б. Пинк', title: 'Сборные ружья тульского производства в период Отечественной войны 1812 года и заграничных походов русской армии 1813–1814 гг.',
      url: 'https://www.borodino.ru/wp-content/uploads/2017/08/31_Pink.pdf', page: 'PDF, 4–5', accessDate: '2026-09-07',
      visitorDescription: 'Публикация музея-заповедника «Бородино»: признаки образца 1808 года и проблема смешения деталей разных образцов. Описывает тип, а не обмер нашего прототипа.' },
    { id: 'user-musket-photo', type: 'catalogue', title: 'Правый вид музейного ружья, предоставленный пользователем', accessDate: '2026-09-07',
      note: 'JPEG 1800×1200, логотип Музея отечественной военной истории. Предоставлено в чате; размеры без линейки не извлекаются как факты. Используется для анализа, не как свободно лицензированный runtime-asset.',
      visitorDescription: 'По снимку восстановлены очертания и расположение наружных деталей. Обратная сторона не показана.' },
  ],
  credits: [{ id: 'musket-model', role: '3d-reconstruction', groupName: 'HISTORIA 3D', license: 'MIT', note: 'Процедурная визуальная реконструкция. Независимая историческая экспертиза ожидается; фотография музея не включена в лицензию кода.' }],
  assets: { thumbnail, poster, backgrounds: { landscape: studio, portrait: studio } },
}
