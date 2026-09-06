import type { EvidenceItem, Exhibit } from '../../types'
const sourceIds = ['alekhin-ulyanov-2006', 'locked-shako-spec'] as const
export const shakoKnown: readonly EvidenceItem[] = [
  { id: 'shell-dimensions', kind: 'FACT', statement: 'Высота корпуса кивера около 175 мм, верхний диаметр около 255 мм. Корпус немного расширяется кверху.', sourceIds, confidence: 'high' },
  { id: 'construction', kind: 'FACT', statement: 'Основа выполнена из плотного чёрного войлока и усилена кожаными деталями.', sourceIds, confidence: 'high' },
  { id: 'v-reinforcements', kind: 'FACT', statement: 'Кожаные V-образные полосы укрепляли боковые стороны, а нижний край защищал кожаный пояс.', sourceIds, confidence: 'high' },
  { id: 'visor', kind: 'FACT', statement: 'У кивера был отдельный кожаный козырёк.', sourceIds, confidence: 'high' },
  { id: 'badge-type', kind: 'FACT', statement: 'На передней части использовался металлический знак: гренада об одном огне.', sourceIds, confidence: 'high' },
  { id: 'repyok-colour', kind: 'FACT', statement: 'Для выбранного варианта показан бело-зелёный репеёк.', sourceIds, confidence: 'high' },
  { id: 'cord-assembly', kind: 'FACT', statement: 'Белый этишкет состоял из плетёных шнуров и кистей.', sourceIds, confidence: 'high' },
  { id: 'rear-pocket-chin', kind: 'FACT', statement: 'Сзади находилась система регулировки с кожаной накладкой и латунной пряжкой.', sourceIds, confidence: 'high' },
  { id: 'interior', kind: 'FACT', statement: 'Внутри размещались кожаная и льняная части подкладки.', sourceIds, confidence: 'high' },
]
export const shakoInferred: readonly EvidenceItem[] = [
  { id: 'bottom-derived', kind: 'DERIVED', statement: 'Нижний диаметр корпуса, около 210 мм, получен из указанных в источнике размеров.', sourceIds, confidence: 'high' },
  { id: 'model-thickness', kind: 'RECONSTRUCTION', statement: 'Точная толщина кожи и отдельных деталей выбрана технически, чтобы предмет корректно выглядел в 3D.', sourceIds: [], confidence: 'medium' },
  { id: 'identity-proxy', kind: 'RECONSTRUCTION', statement: 'Форма латунной гренады восстановлена по историческому изображению и фотографии сохранившейся накладки.', sourceIds: ['archaeolog-one-flame', 'locked-shako-spec'], confidence: 'medium' },
  { id: 'rendering', kind: 'RECONSTRUCTION', statement: 'Размер и объём репейка, мелкие детали плетения этишкета и характер провисания шнуров реконструированы по доступным материалам. Фактура войлока, кожи, металла и ткани передана средствами 3D-графики.', sourceIds: [], confidence: 'medium' },
]
export const shakoUnknown: readonly EvidenceItem[] = [
  // TODO_RESEARCH: retained as an internal research marker; visitor copy remains plain language.
  { id: 'badge-measurement', kind: 'UNKNOWN', statement: 'Точные размеры накладки гренады, глубина и технология её штамповки пока не установлены.', sourceIds: ['archaeolog-one-flame'], confidence: 'unknown' },
  { id: 'workshop', kind: 'UNKNOWN', statement: 'Неизвестны индивидуальные различия киверов разных мастерских и партий, а также некоторые скрытые особенности креплений и подкладки.', sourceIds: [], confidence: 'unknown' },
  { id: 'repyok-measurement', kind: 'UNKNOWN', statement: 'Точные размеры репейка выбранного варианта пока не известны.', sourceIds: [], confidence: 'unknown' },
]
export const shakoReconstruction: Exhibit['reconstruction'] = {
  type: 'source-based-reconstruction',
  summary: 'Это не 3D-скан конкретного музейного предмета. Модель создана на основе исторических описаний, размерных данных и изображений киверов начала XIX века. Там, где сведений недостаточно, реконструкция показывает наиболее обоснованный вариант и отдельно отмечает степень уверенности. Эти детали не скрываются: по мере появления новых источников модель может быть уточнена.',
  known: shakoKnown, inferred: shakoInferred, uncertain: [], unknown: shakoUnknown,
  versions: [
    { version: '0.3.0', date: '2026-09-06', summary: 'Hero refinement: выпуклый суконный репеёк, тонкая гнутая накладка, более лёгкий этишкет, деликатные материалы и привязка точек исследования к поверхности. PENDING HUMAN REVIEW.', status: 'historical-review' },
    { version: '0.2.0', date: '2026-09-06', summary: 'Гренада по фотографии, фактура кожи и ткани, швы и студийный свет. Основные размеры сохранены. PENDING HUMAN REVIEW.', status: 'historical-review' },
    { version: '0.1.0', date: '2026-09-06', summary: 'Процедурная геометрия, размерные тесты и фиксированные ракурсы. PENDING HUMAN REVIEW.', status: 'historical-review' },
  ],
}
