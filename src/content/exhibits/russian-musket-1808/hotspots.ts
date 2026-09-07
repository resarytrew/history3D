import type { Hotspot } from '../../types'
import { photoX as X, photoY as Y } from './procedural/musket1808Dimensions'
export const musketHotspots: readonly Hotspot[] = [
  { id: 'musket-stock', number: 1, label: 'Деревянная ложа', category: 'form', position: [X(177), Y(656), 0.023],
    labelOffset: [0, 48],
    surface: { objectName: 'WoodStock', normal: [0, 0, 1], searchDistance: 0.02 }, cameraTarget: [X(207), Y(650), 0], cameraPosition: [X(207), 0.32, 0.65],
    description: 'Широкая задняя часть ложи сужается к шейке. Профиль следует фотографии, а толщина восстановлена предположительно.', observationQuestion: 'Где дерево самое широкое, а где оно становится тонким?', evidenceIds: ['musket-outline', 'musket-reverse'] },
  { id: 'musket-lock', number: 2, label: 'Кремнёвый замок', category: 'construction', position: [X(480), Y(609), 0.028],
    labelOffset: [0, -54],
    surface: { objectName: 'LockPlate', normal: [0, 0, 1], searchDistance: 0.018 }, cameraTarget: [X(476), Y(580), 0.02], cameraPosition: [X(465), 0.30, 0.35],
    description: 'Наружный силуэт замка восстановлен по снимку: видны курок с кремнем, полка и поднятое огниво. Клейма пока не воспроизведены.', observationQuestion: 'Какие детали вы узнаёте и на модели, и на музейной фотографии?', evidenceIds: ['musket-outline', 'musket-markings'] },
  { id: 'musket-band', number: 3, label: 'Латунные обоймицы', category: 'construction', position: [X(793), Y(596), 0.02],
    labelOffset: [0, 48],
    surface: { objectName: 'RearBand', normal: [0, 0, 1], searchDistance: 0.016 }, cameraTarget: [X(793), 0.225, 0], cameraPosition: [X(810), 0.35, 0.40],
    description: 'Три латунные обоймицы охватывают цевьё и ствол. Передняя отличается более сложным очертанием.', observationQuestion: 'Почему все три обоймицы имеют разную форму?', evidenceIds: ['musket-bands', 'musket-outline'] },
  { id: 'musket-barrel', number: 4, label: 'Длинный ствол', category: 'form', position: [X(1010), 0.238, 0.011],
    labelOffset: [0, -48],
    surface: { objectName: 'Barrel', normal: [0, 0.4, 1], searchDistance: 0.02 }, cameraTarget: [0.10, 0.23, 0], cameraPosition: [0.10, 0.50, 0.95],
    description: 'Ствол гладкий внутри; у замка его наружная поверхность имеет грани. Масштаб согласован с описанием образца и требует обмера прототипа.', observationQuestion: 'Где поверхность ствола округлая, а где можно заметить грани?', evidenceIds: ['musket-calibre', 'musket-bands', 'musket-scale'] },
  { id: 'musket-nose', number: 5, label: 'Передняя обоймица', category: 'construction', position: [X(1625), Y(600), 0.016],
    labelOffset: [0, 48],
    surface: { objectName: 'NoseBandBridge', normal: [0, 0, 1], searchDistance: 0.012 }, cameraTarget: [X(1640), 0.225, 0], cameraPosition: [X(1760), 0.32, 0.40],
    description: 'На переднем латунном кольце находится мушка; ниже виден конец шомпола. Штык на исходном снимке отсутствует.', observationQuestion: 'Чем передняя часть ружья отличается от середины?', evidenceIds: ['musket-bands', 'musket-outline', 'musket-service'] },
]
