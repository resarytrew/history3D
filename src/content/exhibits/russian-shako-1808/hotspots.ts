import type { Hotspot } from '../../types'
import { D } from './procedural/shako1808Dimensions'
const base = D.reconstruction.baseY
export const shakoHotspots: readonly Hotspot[] = [
  { id: 'shako-form', surface: { objectName: 'FeltUpper', normal: [-0.52, -0.12, 0.85], searchDistance: 0.035 }, number: 1, label: 'Форма тульи', category: 'form',
    position: [-0.065, base + 0.13, 0.106], cameraTarget: [0, base + 0.09, 0], cameraPosition: [0, base + 0.18, 0.65],
    observationQuestion: 'Почему верх кивера шире нижней части?', description: 'Сравните верх и низ корпуса. Высокая форма делала кивер заметной частью военного облика. Размеры и пропорции собраны по историческим данным.', evidenceIds: ['shell-dimensions', 'bottom-derived'] },
  { id: 'shako-v', surface: { objectName: 'SideReinforcementLeft', normal: [0.97, -0.12, 0.25], searchDistance: 0.035 }, number: 2, label: 'V-образное усиление', category: 'construction',
    position: [0.12, base + 0.085, 0.032], cameraTarget: [0.09, base + 0.09, 0], cameraPosition: [0.53, base + 0.18, 0.25],
    observationQuestion: 'Для чего кожаные полосы усиливали войлочный корпус?', description: 'Найдите две сходящиеся кожаные полосы. Они помогали высокому войлочному корпусу сохранять форму. Это отдельные детали, а не рисунок на тулье.', evidenceIds: ['construction', 'v-reinforcements', 'model-thickness'] },
  { id: 'shako-grenade', surface: { objectName: 'RoundedBombRelief', normal: [0, -0.13, 1], searchDistance: 0.035 }, number: 3, label: 'Гренада об одном огне', category: 'decoration',
    position: [0, base + D.reconstruction.badgeBottom + 0.026, 0.13], cameraTarget: [0, base + 0.078, 0.12], cameraPosition: [0, base + 0.10, 0.55],
    observationQuestion: 'Что этот знак сообщал о военнослужащем?', description: 'Разглядите округлую бомбу и одно пламя над ней. Такой знак был частью военного языка формы и помогал различать принадлежность военнослужащего.', evidenceIds: ['badge-type', 'identity-proxy'] },
  { id: 'shako-repyok', surface: { objectName: 'RepyokGreen', normal: [0, -0.13, 1], searchDistance: 0.035 }, number: 4, label: 'Репеёк', category: 'decoration',
    position: [0, base + D.converted.shellHeight + D.reconstruction.repyokAboveRim, 0.145], cameraTarget: [0, base + 0.20, 0.12], cameraPosition: [0.10, base + 0.23, 0.54],
    observationQuestion: 'Почему небольшая цветная деталь была важна для организации армии?', description: 'Белый овал с зелёной серединой обозначает рядового 1-го батальона на 1810 год. Под сукном находится деревянная основа. Этот цветовой набор нельзя автоматически переносить на более поздние годы.', evidenceIds: ['repyok-colour', 'repyok-measurement', 'no-plume-pocket'] },
  { id: 'shako-cord', surface: { objectName: 'FrontBraid', normal: [-0.3, 0, 1], searchDistance: 0.035 }, number: 5, label: 'Этишкет', category: 'decoration',
    position: [-0.035, base + 0.038, 0.110], cameraTarget: [-0.04, base + 0.08, 0], cameraPosition: [-0.52, base + 0.17, 0.36],
    observationQuestion: 'Что в военной форме выполняло не только практическую, но и знаковую функцию?', description: 'Проследите путь белых косиц спереди и сзади. Шнур и кисти делали форму заметной и помогали отличать её вариант.', evidenceIds: ['cord-assembly', 'model-thickness'] },
  { id: 'shako-visor', surface: { objectName: 'Visor', normal: [0, 0.85, 0.5], searchDistance: 0.035 }, number: 6, label: 'Козырёк', category: 'construction',
    position: [0.04, base - 0.026, 0.154], cameraTarget: [0, base - 0.01, 0.10], cameraPosition: [0.28, base + 0.16, 0.54],
    observationQuestion: 'Как конструкция головного убора соединяла парадность и практическое назначение?', description: 'Рассмотрите полукруглый выступ и кожаный край. Козырёк защищал лицо от солнца и осадков, а его гладкая кожа заметно отличается от войлока корпуса.', evidenceIds: ['visor', 'model-thickness'] },
]
