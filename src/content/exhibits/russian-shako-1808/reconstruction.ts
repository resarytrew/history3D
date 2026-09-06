import type { EvidenceItem, Exhibit } from '../../types'
const sourceIds = ['alekhin-ulyanov-2006'] as const
const document = [{ sourceId: sourceIds[0], locator: 'с.51: перепечатка описания 1808 года', basis: 'transcribed-document' as const }]
const identity = [{ sourceId: sourceIds[0], locator: 'с.57–58,60: авторское описание отличий 1809–1810 годов', basis: 'author-reconstruction' as const }]
export const shakoKnown: readonly EvidenceItem[] = [
  { id: 'shell-dimensions', kind: 'FACT', statement: 'Описание 1808 года задаёт высоту корпуса и три размера по внутреннему диаметру. Для модели выбран большой размер.', sourceIds, sourceRefs: document, confidence: 'high' },
  { id: 'construction', kind: 'FACT', statement: 'Войлочную основу укрепляли чёрной кожей. Кожаный верх был углублён относительно края.', sourceIds, sourceRefs: document, confidence: 'high' },
  { id: 'v-reinforcements', kind: 'FACT', statement: 'Боковые кожаные полосы расходились кверху. Нижний пояс стягивал кивер сзади через пряжку.', sourceIds, sourceRefs: document, confidence: 'high' },
  { id: 'visor', kind: 'FACT', statement: 'Козырёк делали из толстой лакированной кожи. Один тиснёный рубец шёл вдоль края, другой у пришивки к корпусу.', sourceIds, sourceRefs: document, confidence: 'high' },
  { id: 'badge-type', kind: 'FACT', statement: 'Для мушкетера на 1810 год выбран знак в виде гренады об одном огне по опубликованному описанию изменений 1809 года.', sourceIds, sourceRefs: identity, confidence: 'medium' },
  { id: 'repyok-colour', kind: 'FACT', statement: 'Белый репеёк с зелёной серединой обозначал рядового 1-го батальона в выбранный период. В 1811 году система отличий изменилась.', sourceIds, sourceRefs: identity, confidence: 'medium' },
  { id: 'cord-assembly', kind: 'FACT', statement: 'Белый этишкет включает две косицы, два ромбовидных кордончика и четыре кисти: три справа от носителя и одну слева.', sourceIds, sourceRefs: identity, confidence: 'medium' },
  { id: 'rear-pocket-chin', kind: 'FACT', statement: 'Подбородочный ремень пришивался справа и застёгивался слева на пуговицу. Пряжка регулировки находилась сзади, над вырезом, прикрытым округлой кожаной накладкой.', sourceIds, sourceRefs: document, confidence: 'high' },
  { id: 'interior', kind: 'FACT', statement: 'Кожаный внутренний пояс соединялся с льняной шапочкой на шнурке. Кожаный назатыльник можно было убрать внутрь.', sourceIds, sourceRefs: document, confidence: 'high' },
]
export const shakoInferred: readonly EvidenceItem[] = [
  { id: 'bottom-derived', kind: 'DERIVED', statement: 'Перевод старых мер даёт высоту около 172 мм и внутренние диаметры около 211 и 256 мм. Наружные размеры зависят от толщины материалов. Это расчёт, а не обмер оригинала.', sourceIds, sourceRefs: document, confidence: 'medium', note: 'Условный перевод: вершок 44.45 мм, дюйм 25.4 мм, линия 2.54 мм; точность вычисления не равна точности изготовления.' },
  { id: 'model-thickness', kind: 'RECONSTRUCTION', statement: 'Толщины кожи и войлока, посадка креплений, складки подкладки и убранного назатыльника восстановлены предположительно.', sourceIds, sourceRefs: document, confidence: 'medium' },
  { id: 'identity-proxy', kind: 'RECONSTRUCTION', statement: 'Очертания гренады уточнены по археологической фотографии. Находка связана с 1812 годом и служит аналогом формы; её точные размеры и принадлежность полку не установлены.', sourceIds: ['archaeolog-one-flame', 'ia-ras-valutino-2019'], sourceRefs: [{ sourceId: 'ia-ras-valutino-2019', locator: 'Раздел Валутино–Лубино: находки из санитарного захоронения', basis: 'archaeological-context' }], confidence: 'medium' },
  { id: 'no-plume-pocket', kind: 'RECONSTRUCTION', statement: 'Карман для султана не показан: описание 1808 года предусматривает его для гренадерских киверов. Для нашего мушкетера выбрано крепление репейка проволочными усами.', sourceIds, sourceRefs: [...document, ...identity], confidence: 'medium', note: 'Обобщение на с.57 не отменяет ограничения с.51. Точная практика после 1809 года требует независимой проверки.' },
  { id: 'rendering', kind: 'RECONSTRUCTION', statement: 'Показан ухоженный предмет в эксплуатации. Размер репейка, мелкое плетение, оттенки и лёгкий износ переданы предположительно; археологическая коррозия не воспроизводится.', sourceIds: [], confidence: 'medium' },
]
export const shakoUnknown: readonly EvidenceItem[] = [
  // TODO_RESEARCH: internal research marker, never visitor-facing copy.
  { id: 'badge-measurement', kind: 'UNKNOWN', statement: 'Обмеры гренады, глубина рельефа, состав сплава и устройство креплений не опубликованы в использованных материалах.', sourceIds: ['ia-ras-valutino-2019'], confidence: 'unknown' },
  { id: 'workshop', kind: 'UNKNOWN', statement: 'Конкретный полк, мастерская и индивидуальные особенности оригинала не определены. Модель не является копией отдельного музейного предмета.', sourceIds: [], confidence: 'unknown' },
  { id: 'repyok-measurement', kind: 'UNKNOWN', statement: 'Нет обмеров репейка выбранного варианта и точных данных о толщине его обтяжки.', sourceIds, confidence: 'unknown' },
]
export const shakoReconstruction: Exhibit['reconstruction'] = {
  type: 'source-based-reconstruction',
  summary: 'Кивер образца 1808 года восстановлен для рядового мушкетера 1-го батальона на 1810 год. Конкретный полк не установлен. Основа работы: опубликованное описание конструкции, исследование знаков различия и археологический аналог гренады. Это не 3D-скан. Расчётные размеры и предположительные детали отмечены отдельно; независимая историческая проверка ещё предстоит.',
  known: shakoKnown, inferred: shakoInferred, uncertain: [], unknown: shakoUnknown,
  versions: [
    { version: '0.4.0', date: '2026-09-06', summary: 'Вариант 1810 года: страницы источников, внутренние размеры большого сорта, крепления, козырёк и доступная подкладка. PENDING HUMAN REVIEW.', status: 'historical-review' },
    { version: '0.3.0', date: '2026-09-06', summary: 'Уточнение репейка, гренады, материалов и привязки маркеров по прежнему заданию.', status: 'historical-review' },
    { version: '0.2.0', date: '2026-09-06', summary: 'Гренада по фотографии, фактура кожи и ткани, швы и свет.', status: 'historical-review' },
    { version: '0.1.0', date: '2026-09-06', summary: 'Процедурная модель по заданию без независимой проверки.', status: 'historical-review' },
  ],
}
