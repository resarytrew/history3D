import type { Exhibit } from '../../types'
import { pistolContentRu } from './content.ru'
import { pistolContentEn } from './content.en'
import { pistolReconstruction } from './reconstruction'
import { pistolHotspots } from './hotspots'
import { pistolSemantics } from './semantics'
import { pistolAssembly } from './assembly'
import { pistolAnnotations } from './annotations'
import poster from './images/poster.png'
import thumbnail from './images/thumbnail.png'
import studio from './backgrounds/studio.png'

export const russianPistol1798: Exhibit = {
  id: 'russian-pistol-1798-1804', slug: 'russian-pistol-1798-1804', collectionId: 'russian-empire', category: 'weapon', status: 'reconstruction',
  chronology: { label: 'Образец 1798/1804 гг. · прототип 1803 года', from: 1803, to: 1804 },
  geography: { place: 'Тула', region: 'Российская империя' },
  reconstruction: pistolReconstruction,
  model: { kind: 'procedural', factoryId: 'russian-pistol-1798-1804-v1', developmentOnly: false, approximateTriangles: 249480 },
  semantics: pistolSemantics,
  assembly: pistolAssembly,
  annotations: pistolAnnotations,
  presentation: {
    initialYaw: 0, cameraPosition: [0.025, 0.23, 0.76], cameraTarget: [0, 0.08, 0],
    minDistance: 0.045, maxDistance: 3, safeAreaPadding: 0.13, referenceAspect: 1.5,
    contactShadow: true, hotspotOcclusionTolerance: 0.0003, polarAngleRange: [0.08, 3.06], sceneScale: 0.12, lighting: 'artifact-studio',
    scaleComparison: { figurePosition: [-0.55, 0, 0], cameraPosition: [0, 1, 4.1], cameraTarget: [-0.1, 0.85, 0] },
  },
  hotspots: pistolHotspots, content: { ru: pistolContentRu, en: pistolContentEn },
  sources: [
    { id: 'yurkevich-1798', type: 'secondary', author: 'Е. И. Юркевич', title: 'Русская артиллерия в царствование Императора Павла I: 1796–1801 гг.',
      publication: 'История военного дела: исследования и источники, специальный выпуск VI, часть VI', year: 2020, page: 'с. 679 (PDF, страница 36)',
      url: 'https://www.reenactor.ru/ARH/PDF/Yrkevich_10.pdf', accessDate: '2026-09-08',
      visitorDescription: 'Описание базового образца 1798 года: берёзовая ложа, коричневая окраска и латунный прибор.',
      note: 'Относится к базовому образцу; не является обмером укороченного тульского экземпляра 1803 года.' },
    { id: 'makovskaya-1798', type: 'secondary', author: 'Л. К. Маковская', title: 'Ручное огнестрельное оружие русской армии конца XIV–XVIII веков',
      publication: 'Воениздат, каталог', year: 1990, page: 'PDF, страницы 75–76; страница 183, рисунок 128',
      url: 'https://militera.org/books/pdf/tw/makovskaya_lk01.pdf', accessDate: '2026-09-08',
      visitorDescription: 'Описание деревянного шомпола с латунной головкой и берёзовой ложи образца 1798 года.',
      note: 'Типологический источник. Положение скрытой трубки и поперечные размеры текущей модели остаются реконструкцией.' },
    { id: 'padikovo-pistol', type: 'catalogue', title: 'Пистолет кирасирский и драгунский укороченный 1798/1804 гг.',
      museum: 'Музей отечественной военной истории, Падиково',
      url: 'https://www.kskdivniy.ru/museum/eksponaty/pistolet-kirasirskiy-i-dragunskiy-ukorochennyy-1798-1804-gg/', accessDate: '2026-09-08',
      visitorDescription: 'Карточка тульского экземпляра 1803 года и пять фотографий: обе стороны, замок, рукоять и дульная часть.',
      note: 'Галерея l_1.jpg–l_5.jpg. Фотографии без масштабной линейки; права музея. Полного обмера и истории реставрации нет.' },
    { id: 'padikovo-news', type: 'catalogue', title: 'Новинки экспозиции музея', year: 2024, page: '10 сентября 2024, первый экспонат',
      museum: 'Музей отечественной военной истории, Падиково', url: 'https://www.kskdivniy.ru/museum/news/novinki/', accessDate: '2026-09-08',
      visitorDescription: 'Музей рассказывает об укорочении ствола, калибре и сохранении старого образца на вооружении в 1812 году.',
      note: 'Тот же музей, что и карточка; не независимая проверка атрибуции. Длина 269 мм дана приблизительно.' },
  ],
  credits: [{ id: 'pistol-model', role: '3d-reconstruction', groupName: 'HISTORIA 3D', license: 'MIT',
    note: 'Авторская модель и процедурные PBR-карты. Музейные фотографии не включены в GLB и лицензию кода. Независимая историческая экспертиза ожидается.' }],
  assets: { thumbnail, poster, backgrounds: { landscape: studio, portrait: studio } },
}
