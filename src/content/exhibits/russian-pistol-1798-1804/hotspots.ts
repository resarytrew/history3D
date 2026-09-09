import type { Hotspot } from '../../types'
import { X, Y } from './source/dimensions'
// Anchors are authoritative. Legacy position/surface values remain as reproducible
// authoring references and are ignored by the semantic runtime.
export const pistolHotspots: readonly Hotspot[] = [
  { id: 'pistol-barrel', anchor: { entityId: 'barrel', localPoint: [0.09508833922261485, 0.1053948673819887, 0.01070578567319434], localNormal: [0, 0.1961161351381841, 0.9805806756909203] }, number: 1, label: 'Укороченный ствол', category: 'form', position: [X(1040), Y(425), .012], labelOffset: [0,-48],
    surface: { objectName: 'pistol_barrel', normal: [0,.2,1], searchDistance: .009 }, cameraTarget: [.12,.108,0], cameraPosition: [.14,.19,.32],
    description: 'Музей указывает калибр 17 мм и длину после укорочения около 269 мм. Нарезов нет.', observationQuestion: 'Как изменился силуэт после укорочения длинного ствола?', evidenceIds: ['pistol-barrel','pistol-scale'] },
  { id: 'pistol-lock', anchor: { entityId: 'lock.plate', localPoint: [-0.030720848056537103, 0.08192226148409894, 0.01815050798961198], localNormal: [0, 0, 1] }, number: 2, label: 'Кремнёвый замок', category: 'construction', position: [X(653),Y(498),.023], labelOffset: [0,50],
    surface: { objectName: 'pistol_lock_lockplate', normal: [0,0,1], searchDistance: .008 }, cameraTarget: [-.039,.11,.018], cameraPosition: [-.025,.15,.24],
    description: 'Наружные силуэты замочной доски, полки и пружины сопоставлены с музейной фотографией и рис. 128 Маковской. Толщины остаются интерпретацией.', observationQuestion: 'Какие отдельные детали удаётся различить на замочной доске?', evidenceIds: ['pistol-outline','pistol-lock'] },
  { id: 'pistol-cock', anchor: { entityId: 'lock.cock', localPoint: [-0.046325088339222616, 0.10565371024734983, 0.024330592198103792], localNormal: [0, 0, 1] }, number: 3, label: 'Курок и огниво', category: 'construction', position: [X(605),Y(425),.026], labelOffset: [-15,-50],
    surface: { objectName: 'pistol_lock_cock', normal: [0,0,1], searchDistance: .01 }, cameraTarget: [-.04,.137,.02], cameraPosition: [-.02,.17,.20],
    description: 'Изогнутая шейка курка, пустые губки, головка винта и высокое огниво повторяют видимые очертания музейного экземпляра. Их взаимное положение статическое.', observationQuestion: 'Чем фактура огнива отличается от поверхности дерева?', evidenceIds: ['pistol-lock','pistol-surfaces'] },
  { id: 'pistol-stock', anchor: { entityId: 'stock', localPoint: [0.07980918727915194, 0.08517314487632509, 0.014755430816928539], localNormal: [0, 0, 1] }, number: 4, label: 'Деревянная ложа', category: 'form', position: [X(993),Y(488),.016], labelOffset: [0,53],
    surface: { objectName: 'pistol_stock', normal: [0,0,1], searchDistance: .012 }, cameraTarget: [.06,.092,0], cameraPosition: [.045,.16,.28],
    description: 'Ложа соединяет длинное цевьё с изогнутой рукоятью. Показана берёза с коричневой отделкой по описанию базового образца; рисунок волокон восстановлен.', observationQuestion: 'Проследите, как волокна идут вдоль вытянутой формы ложи.', evidenceIds: ['pistol-outline','pistol-surfaces'] },
  { id: 'pistol-ramrod', anchor: { entityId: 'ramrod', localPoint: [0.2098445229681979, 0.07899646643109541, 0.002807325318209984], localNormal: [0, 0, 1] }, number: 5, label: 'Шомпол', category: 'construction', position: [X(1393),Y(507),.004], labelOffset: [10,48],
    surface: { objectName: 'pistol_ramrod_head', normal: [0,0,1], searchDistance: .009 }, cameraTarget: [.19,.083,0], cameraPosition: [.23,.13,.22],
    description: 'Под цевьём виден шомпол с расширенным наконечником. Его цвет и устройство уточнены по музейному крупному плану.', observationQuestion: 'Найдите границу деревянного стержня и металлического наконечника.', evidenceIds: ['pistol-ramrod','pistol-scale'] },
  { id: 'pistol-grip', anchor: { entityId: 'stock.grip', localPoint: [-0.16823321554770318, 0.06761837455830388, 0.015091532685355003], localNormal: [0, 0, 1] }, number: 6, label: 'Рукоять и скоба', category: 'form', position: [X(230),Y(542),.014], labelOffset: [-12,48],
    surface: { objectName: 'pistol_stock', normal: [0,0,1], searchDistance: .018 }, cameraTarget: [-.17,.048,0], cameraPosition: [-.17,.13,.32],
    description: 'Изогнутая рукоять заканчивается полным округлым «яблоком» с латунным затыльником и длинными боковыми усами. Контур сопоставлен с обеими музейными фотографиями.', observationQuestion: 'Как накладка охватывает нижний конец рукояти?', evidenceIds: ['pistol-outline','pistol-scale'] },
]
