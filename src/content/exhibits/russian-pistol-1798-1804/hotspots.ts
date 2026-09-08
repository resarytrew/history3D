import type { Hotspot } from '../../types'
import { X, Y } from './source/dimensions'
export const pistolHotspots: readonly Hotspot[] = [
  { id: 'pistol-barrel', number: 1, label: 'Укороченный ствол', category: 'form', position: [X(1040), Y(425), .012], labelOffset: [0,-48],
    surface: { objectName: 'pistol_barrel', normal: [0,.2,1], searchDistance: .009 }, cameraTarget: [.12,.108,0], cameraPosition: [.14,.19,.32],
    description: 'Музей указывает калибр 17 мм и длину после укорочения около 269 мм. Нарезов нет.', observationQuestion: 'Как изменился силуэт после укорочения длинного ствола?', evidenceIds: ['pistol-barrel','pistol-scale'] },
  { id: 'pistol-lock', number: 2, label: 'Кремнёвый замок', category: 'construction', position: [X(653),Y(498),.023], labelOffset: [0,50],
    surface: { objectName: 'pistol_lock_lockplate', normal: [0,0,1], searchDistance: .008 }, cameraTarget: [-.039,.11,.018], cameraPosition: [-.025,.15,.24],
    description: 'Наружные силуэты замочной доски, полки и пружины сопоставлены с музейной фотографией и рис. 128 Маковской. Толщины остаются интерпретацией.', observationQuestion: 'Какие отдельные детали удаётся различить на замочной доске?', evidenceIds: ['pistol-outline','pistol-lock'] },
  { id: 'pistol-cock', number: 3, label: 'Курок и огниво', category: 'construction', position: [X(588),Y(419),.026], labelOffset: [-15,-50],
    surface: { objectName: 'pistol_lock_cock', normal: [0,0,1], searchDistance: .01 }, cameraTarget: [-.04,.137,.02], cameraPosition: [-.02,.17,.20],
    description: 'Видны изогнутая шейка курка, зажимные губки и поднятое огниво. Кремень добавлен как поясняющая реконструкция: на музейном фото губки пустые.', observationQuestion: 'Чем фактура огнива отличается от поверхности дерева?', evidenceIds: ['pistol-lock','pistol-surfaces'] },
  { id: 'pistol-stock', number: 4, label: 'Деревянная ложа', category: 'form', position: [X(993),Y(488),.016], labelOffset: [0,53],
    surface: { objectName: 'pistol_stock', normal: [0,0,1], searchDistance: .012 }, cameraTarget: [.06,.092,0], cameraPosition: [.045,.16,.28],
    description: 'Ложа соединяет длинное цевьё с изогнутой рукоятью. Показана берёза с коричневой отделкой по описанию базового образца; рисунок волокон восстановлен.', observationQuestion: 'Проследите, как волокна идут вдоль вытянутой формы ложи.', evidenceIds: ['pistol-outline','pistol-surfaces'] },
  { id: 'pistol-ramrod', number: 5, label: 'Шомпол', category: 'construction', position: [X(1393),Y(507),.004], labelOffset: [10,48],
    surface: { objectName: 'pistol_ramrod_head', normal: [0,0,1], searchDistance: .009 }, cameraTarget: [.19,.083,0], cameraPosition: [.23,.13,.22],
    description: 'Под цевьём виден шомпол с расширенным наконечником. Его цвет и устройство уточнены по музейному крупному плану.', observationQuestion: 'Найдите границу деревянного стержня и металлического наконечника.', evidenceIds: ['pistol-ramrod','pistol-scale'] },
  { id: 'pistol-grip', number: 6, label: 'Рукоять и скоба', category: 'form', position: [X(230),Y(542),.014], labelOffset: [-12,48],
    surface: { objectName: 'pistol_stock', normal: [0,0,1], searchDistance: .018 }, cameraTarget: [-.17,.048,0], cameraPosition: [-.17,.13,.32],
    description: 'Изогнутая рукоять заканчивается компактным латунным колпачком. Его боковые очертания уточнены по рис. 128 Маковской. Перед рукоятью находится спусковая скоба.', observationQuestion: 'Как накладка охватывает нижний конец рукояти?', evidenceIds: ['pistol-outline','pistol-scale'] },
]
