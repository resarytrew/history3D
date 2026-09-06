import type { EvidenceItem, Exhibit } from '../../types'
const sourceIds = ['alekhin-ulyanov-2006', 'locked-shako-spec'] as const
export const shakoKnown: readonly EvidenceItem[] = [
  { id: 'shell-dimensions', kind: 'FACT', statement: 'По заданной спецификации: высота тульи 175 мм, верхний диаметр 255 мм, разность диаметров 45 мм. Верхнее дно утоплено примерно на 25 мм.', sourceIds, confidence: 'high' },
  { id: 'construction', kind: 'FACT', statement: 'Чёрный жёсткий войлок усилен чернёной кожей: верхний напуск 27 мм, нижний пояс 20 мм, V-полосы шириной 18 мм с расстоянием между верхними концами 90 мм.', sourceIds, confidence: 'high' },
  { id: 'visor', kind: 'FACT', statement: 'Полукруглый кожаный козырёк: максимальный вынос 75 мм, опускание края около 50 мм, декоративный рант около 12 мм от края.', sourceIds, confidence: 'high' },
  { id: 'badge-type', kind: 'FACT', statement: 'Выбранный знак — латунная гренада об одном огне. Конфигурация: рядовой армейской пехоты, 1-й батальон, не гренадерский взвод.', sourceIds, confidence: 'high' },
  { id: 'repyok-colour', kind: 'FACT', statement: 'Выбран овальный выпуклый репеёк: белая лицевая сторона с зелёным центром, деревянная основа, тёмная тыльная сторона, проволочное крепление.', sourceIds, confidence: 'high' },
  { id: 'cord-assembly', kind: 'FACT', statement: 'Белый хлопчатобумажный этишкет: передняя и задняя косицы, два ромбовидных кордончика, три кисти справа на длинных подвесах и одна слева на коротком. Стороны указаны относительно носителя.', sourceIds, confidence: 'high' },
  { id: 'rear-pocket-chin', kind: 'FACT', statement: 'Задняя регулировка с кожаной деталью высотой 50 мм и одношпеньковой латунной пряжкой; передний карман длиной 80 мм; кожаный подбородочный ремень шириной 18 мм.', sourceIds, confidence: 'high' },
  { id: 'interior', kind: 'FACT', statement: 'Внутренний кожаный пояс 37 мм, льняная часть шапочки 135 мм, кожаный назатыльник 168 мм. Подготовлены отдельной скрытой группой.', sourceIds, confidence: 'high' },
]
export const shakoInferred: readonly EvidenceItem[] = [
  { id: 'bottom-derived', kind: 'DERIVED', statement: 'Нижний диаметр 210 мм получен вычислением 255 − 45. Это не отдельный напечатанный норматив.', sourceIds, confidence: 'high' },
  { id: 'model-thickness', kind: 'RECONSTRUCTION', statement: 'Толщина кожи 2,5 мм, козырька 3,5 мм, диаметр шнура 4,5 мм; микрокривизна и допуски — технические приближения.', sourceIds: [], confidence: 'medium' },
  { id: 'identity-proxy', kind: 'RECONSTRUCTION', statement: 'Гренада около 73 × 29 мм: пропорции контура, продольные рёбра пламени и два поперечных пояска восстановлены по предоставленной фотографии накладки. Толщина листа 0,6 мм и высота рельефа около 1,4 мм не измерены. Репеёк 78 × 43 мм и траектории плетения остаются приближениями.', sourceIds: ['archaeolog-one-flame', 'locked-shako-spec'], confidence: 'medium' },
  { id: 'rendering', kind: 'RECONSTRUCTION', statement: 'Параметры материалов, слабая микрофактура, положение свободного подбородочного ремня и скрытая форма подкладки выбраны для 3D-модели. Искусственное старение не добавлено.', sourceIds: [], confidence: 'medium' },
]
export const shakoUnknown: readonly EvidenceItem[] = [
  { id: 'badge-measurement', kind: 'UNKNOWN', statement: 'TODO_RESEARCH: точные размеры, профиль штамповки и принадлежность сфотографированной накладки выбранной конфигурации не установлены. Фотография даёт визуальный образец, но не заменяет обмер и историческую проверку человеком.', sourceIds: ['archaeolog-one-flame'], confidence: 'unknown' },
  { id: 'workshop', kind: 'UNKNOWN', statement: 'TODO_RESEARCH: мастерская, индивидуальные производственные различия и точная геометрия скрытых деталей неизвестны.', sourceIds: [], confidence: 'unknown' },
]
export const shakoReconstruction: Exhibit['reconstruction'] = {
  type: 'source-based-reconstruction',
  summary: 'Историческая 3D-реконструкция по предоставленной спецификации и визуальным материалам. Не музейный скан и не копия конкретного сохранившегося предмета. FACT означает сведения в задании; независимая проверка историком ещё не проведена.',
  known: shakoKnown, inferred: shakoInferred, uncertain: [], unknown: shakoUnknown,
  versions: [
    { version: '0.2.0', date: '2026-09-06', summary: 'Гренада по фотографии, фактура кожи и ткани, швы и студийный свет. Основные размеры сохранены. PENDING HUMAN REVIEW.', status: 'historical-review' },
    { version: '0.1.0', date: '2026-09-06', summary: 'Процедурная геометрия, размерные тесты и фиксированные ракурсы. PENDING HUMAN REVIEW.', status: 'historical-review' },
  ],
}
