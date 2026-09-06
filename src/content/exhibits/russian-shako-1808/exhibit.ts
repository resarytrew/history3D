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
  chronology: { label: 'Образец 1808 года · рядовой мушкетер, 1810 год', from: 1810, to: 1810 },
  geography: { region: 'Российская империя', culture: 'Русская армейская пехота' },
  reconstruction: shakoReconstruction,
  model: { kind: 'procedural', factoryId: 'russian-shako-1808-v1', developmentOnly: true, approximateTriangles: 227_284 },
  presentation: {
    initialYaw: 0, cameraPosition: [0.37, 0.32, 0.79], cameraTarget: [0, 0.17, 0],
    minDistance: 0.3, maxDistance: 1.6, safeAreaPadding: 0.12,
    hotspotOcclusionTolerance: 0.00035,
    polarAngleRange: [0.08, 3.06],
    sceneScale: 0.08,
    lighting: 'artifact-studio',
    scaleComparison: { figurePosition: [-0.55, 0, 0], cameraPosition: [1.4, 1.4, 3.4], cameraTarget: [-0.2, 0.85, 0] },
  },
  hotspots: shakoHotspots, content: { ru: shakoContentRu, en: shakoContentEn },
  sources: [
    { id: 'alekhin-ulyanov-2006', type: 'secondary', author: 'П. Г. Алехин, И. Э. Ульянов',
      title: 'Мода или практичность? Сравнение русского кивера образца 1808 г. и французского кивера образца 1806 г.',
      publication: 'Сержант №36 (3/2006)', year: 2006, accessDate: '2026-09-06',
      url: 'https://www.reenactor.ru/ARH/PDF/Alexin-Ylianov.pdf',
      page: '51–58, 60',
      note: 'С.51: перепечатка описания 1808 года; с.52: округлённый авторский чертёж; с.57–58,60: отличия, репеёк и этишкет. Это публикация документа, не исследованный архивный оригинал. Размеры переведены отдельно от толщин модельных слоёв.',
      visitorDescription: 'Размеры, конструкция, материалы и основные элементы кивера.', visitorAction: 'Открыть публикацию ↗' },
    { id: 'archaeolog-one-flame', type: 'catalogue', title: 'Бляха-накладка «Гренада об одном огне» — фотография лицевой и обратной сторон',
      url: 'https://archaeolog.ru/media/smolensk/Бляха-накладка%20Гренада%20об%20одном%20огне.jpg', accessDate: '2026-09-06',
      note: 'Контекст установлен по публикации ИА РАН от 22.07.2019: находки у Валутино–Лубино, связанные с 1812 годом. Аналог формы для 1810 года, не обмер и не доказательство конкретного полка. Размеры, инвентарный номер и состав сплава в публикации отсутствуют.',
      visitorTitle: 'Накладка «Гренада об одном огне»', visitorDescription: 'Находка у Валутино–Лубино связана с событиями 1812 года. Она помогает восстановить очертания знака, но не определяет его точный размер для нашей модели.', visitorAction: 'Посмотреть находку ↗' },
    { id: 'ia-ras-valutino-2019', type: 'primary', title: 'Археологи нашли под Смоленском следы сражений 1812 года',
      author: 'А. Н. Хохлов и соавторы', publication: 'Институт археологии РАН', year: 2019, accessDate: '2026-09-06',
      url: 'https://archaeolog.ru/press/articles/arkheologi-nashli-pod-smolenskom-sledy-srazheniy-1812-goda',
      visitorDescription: 'Публикация исследователей объясняет, где и при каких обстоятельствах найдены фрагмент кивера и накладка. Обмеры не опубликованы.' },
    { id: 'locked-shako-spec', type: 'catalogue', title: 'Предоставленная историческая спецификация и шесть изображений кивера', accessDate: '2026-09-06',
      note: 'Прежнее задание заменено проверкой варианта на 1810 год. Неатрибутированные изображения используются только для сравнения материалов; орёл, султан и цветные кисти не переносятся. Изображения 4 и 6 дублируются. Исторические размеры из задания не считаются независимыми доказательствами.',
      visitorTitle: 'Фотографии и изображения киверов', visitorDescription: 'Использованы для сравнения конструкции, материалов и внешнего вида.', visitorStatus: 'Происхождение части изображений ещё уточняется.', visitorAction: 'Открыть материалы ↗' },
  ],
  credits: [
    { id: 'shako-geometry', role: '3d-reconstruction', groupName: 'HISTORIA 3D', note: 'Процедурная Three.js-реконструкция варианта на 1810 год. Документальные размеры, расчёты и предположения разделены. Независимая историческая проверка ожидается.', license: 'MIT' },
    { id: 'shako-studio', role: 'background', groupName: 'HISTORIA 3D', note: 'Однотонный технический студийный фон. Историческую среду кадеты подготовят отдельно.', license: 'MIT' },
  ],
  assets: { thumbnail, poster, backgrounds: { landscape: studio, portrait: studio } },
}
