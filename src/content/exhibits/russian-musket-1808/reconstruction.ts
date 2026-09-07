import type { Exhibit } from '../../types'
export const musketReconstruction: Exhibit['reconstruction'] = {
  type: 'source-based-reconstruction',
  summary: 'Внешний облик восстановлен по фотографии тульского ружья 1811 года из Музея отечественной военной истории. Это первая исследовательская версия; обмер и независимая экспертиза ещё не выполнены.',
  known: [
    { id: 'musket-attribution', kind: 'FACT', statement: 'Музей определяет прототип как пехотное ружьё образца 1808 года, изготовленное в Туле в 1811 году.', sourceIds: ['padikovo-1811'], confidence: 'high', sourceRefs: [{ sourceId: 'padikovo-1811', locator: 'Карточка: заголовок и строка атрибуции', basis: 'catalogue-record' }] },
    { id: 'musket-calibre', kind: 'FACT', statement: 'В карточке указан гладкий ствол калибра 7 линий — 17,78 мм.', sourceIds: ['padikovo-1811'], confidence: 'high', sourceRefs: [{ sourceId: 'padikovo-1811', locator: 'Карточка: строка «Калибр»', basis: 'catalogue-record' }] },
    { id: 'musket-bands', kind: 'FACT', statement: 'Исследование описывает латунные ложевые кольца, мушку на переднем кольце и гранёную казённую часть образца 1808 года.', sourceIds: ['pink-tula'], confidence: 'high', sourceRefs: [{ sourceId: 'pink-tula', locator: 'PDF, с. 4–5, описание образца 1808 года', basis: 'author-reconstruction' }] },
  ],
  inferred: [
    { id: 'musket-outline', kind: 'INFERENCE', statement: 'Профиль ложи, положение трёх обоймиц и наружный силуэт замка восстановлены по правому виду музейного предмета.', sourceIds: ['user-musket-photo', 'padikovo-1811'], confidence: 'medium', note: 'Фотография без масштабной линейки; перспективное искажение не устранено обмером.' },
    { id: 'musket-scale', kind: 'RECONSTRUCTION', statement: 'Масштаб модели приблизительный. Длина ствола согласована с типологическим описанием; общая длина и поперечные размеры прототипа не обмерены.', sourceIds: ['pink-tula', 'user-musket-photo'], confidence: 'low', note: 'Длина ствола 1,14 м: Пинк, PDF с. 4–5. Общая длина 1,458 м — рабочее допущение, не размер из карточки музея.' },
    { id: 'musket-surfaces', kind: 'RECONSTRUCTION', statement: 'Тёмное дерево, сталь и латунь показаны в ухоженном состоянии с небольшими следами обработки. Цвет и блеск восстановлены приблизительно.', sourceIds: ['user-musket-photo', 'pink-tula'], confidence: 'medium', note: 'Порода дерева, покрытие, точный сплав и состояние в 1812 году не подтверждены анализом этого предмета.' },
  ],
  uncertain: [
    { id: 'musket-reverse', kind: 'RECONSTRUCTION', statement: 'Обратная сторона, толщина ложи, форма контрзамочной пластины и глубина деталей восстановлены предположительно.', sourceIds: ['user-musket-photo'], confidence: 'low' },
  ],
  unknown: [
    { id: 'musket-markings', kind: 'UNKNOWN', statement: 'Точное чтение клейм, первоначальная комплектность и история ремонтов требуют изучения оригинала. Неразборчивые надписи на модель не перенесены.', sourceIds: ['padikovo-1811'], confidence: 'unknown', note: 'TODO_RESEARCH: запросить инвентарную карточку, оба боковых вида и макросъёмку. Музей связывает надпись на затыльнике с 34-м Севским полком; дата нанесения не установлена.' },
    { id: 'musket-service', kind: 'UNKNOWN', statement: 'Участие именно этого ружья в войне 1812 года не установлено. Штык и ремень отсутствуют в текущей реконструкции, как на исходном снимке.', sourceIds: ['padikovo-1811', 'user-musket-photo'], confidence: 'unknown', note: 'TODO_RESEARCH: подтверждение комплекта и боевого происхождения. Не приписывать ружьё владельцу кивера.' },
  ],
  versions: [{ version: '0.1.0', date: '2026-09-07', status: 'reconstruction', summary: 'Первая процедурная реконструкция наружного облика по правому виду экземпляра 1811 года. Форма, материалы, интерактивные детали; предположения выделены.' }],
}
