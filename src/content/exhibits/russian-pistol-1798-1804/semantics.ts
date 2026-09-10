import type { Point3, SemanticEntity } from '../../semantics'

const english: Readonly<Record<string, string>> = {
  stock: 'Stock', barrel: 'Barrel', 'lock.plate': 'Lock plate', 'lock.cock': 'Cock', 'lock.frizzen': 'Frizzen', 'lock.pan': 'Pan', 'lock.spring': 'Frizzen spring',
  sideplate: 'Sideplate', 'trigger.guard': 'Trigger guard', trigger: 'Trigger', foreend: 'Fore-end cap', ramrod: 'Ramrod',
  'ramrod.pipe.rear': 'Rear ramrod pipe', 'ramrod.pipe.front': 'Front ramrod pipe', 'barrel.pins': 'Barrel fasteners', buttcap: 'Butt cap', escutcheon: 'Grip escutcheon',
}

const part = (id: string, ru: string, parentId: string, names: string[], explodeOffset: Point3): SemanticEntity => ({
  id, kind: 'part', label: { ru, en: english[id] }, parentId,
  geometry: { objectNames: names.map(name => `pistol_${name}`) }, explodeOffset,
})

/** Authored bindings shared by the procedural source and its GLB export. */
export const pistolSemantics: readonly SemanticEntity[] = [
  { id: 'pistol', kind: 'object', label: { ru: 'Пистолет', en: 'Pistol' }, geometry: { objectNames: [] } },
  part('stock', 'Ложа', 'pistol', ['stock'], [0, 0, 0]),
  { id: 'stock.grip', kind: 'region', label: { ru: 'Рукоять', en: 'Grip' }, parentId: 'stock', geometry: { objectNames: [] }, focusAnchor: { entityId: 'stock.grip', localPoint: [-.1682, .0676, .01509459851326389], localNormal: [-.003400672464691366, .1585918045831589, .9873383791516691] } },
  part('barrel', 'Ствол', 'pistol', ['barrel', 'breech_tang', 'breech', 'breech_tang_screw', 'front_sight'], [0, .07, 0]),
  { id: 'barrel.muzzle', kind: 'region', label: { ru: 'Дульная часть', en: 'Muzzle' }, parentId: 'barrel', geometry: { objectNames: [] }, focusAnchor: { entityId: 'barrel.muzzle', localPoint: [.223, .105, .011928745971757554], localNormal: [-.009346631731681734, .024540755682163004, .9996551364274685] } },
  { id: 'lock', kind: 'assembly', label: { ru: 'Кремнёвый замок', en: 'Flintlock' }, parentId: 'pistol', geometry: { objectNames: [] }, explodeOffset: [0, .015, .075] },
  part('lock.plate', 'Замочная доска', 'lock', ['lock_lockplate', 'lock_plate_rib0', 'lock_plate_rib1', 'lock_plate_rear_moulding', 'lock_plate_inscription'], [0, 0, 0]),
  { id: 'marking.tula-1803', kind: 'feature', label: { ru: 'Клеймо «ТУЛА 1803»', en: 'TULA 1803 marking' }, parentId: 'lock.plate', geometry: { objectNames: [] }, focusAnchor: { entityId: 'marking.tula-1803', localPoint: [-.03328618733212352, .085202658859392, .018339695428486236], localNormal: [.003274094734677882, .004836691384007223, .9999829432145951] } },
  part('lock.cock', 'Курок', 'lock', ['lock_cock', 'lock_cock_spur', 'lock_lower_jaw', 'lock_upper_jaw', 'lock_jaw_screw', 'upper_jaw_shoulder', 'lock_jaw_screw_head', 'jaw_screw_slot_floor', 'jaw_finial_collar', 'cock_pivot_seat', 'cock_pivot_surround', 'cock_pivot_head', 'cock_pivot_rim', 'cock_pivot_slot_floor', 'cock_raised_margin'], [-.025, .04, .035]),
  part('lock.frizzen', 'Батарея', 'lock', ['lock_frizzen', 'lock_frizzen_foot', 'frizzen_shoe', 'frizzen_pivot_lobe', 'frizzen_pivot_seat', 'frizzen_pivot_head', 'frizzen_pivot_rim', 'frizzen_pivot_slot_floor'], [.03, .04, .035]),
  part('lock.pan', 'Полка', 'lock', ['lock_pan', 'pan_lip', 'lock_pan_connection'], [.025, .008, .02]),
  part('lock.spring', 'Пружина батареи', 'lock', ['lock_frizzen_spring', 'spring_tail', 'spring_screw_head', 'spring_screw_shoulder'], [.025, -.025, .025]),
  part('sideplate', 'Контрзамочная накладка', 'pistol', ['sideplate', ...[472, 597, 831].flatMap(n => [`counter_screw${n}head`, `counter_screw${n}slot`])], [0, 0, -.07]),
  part('trigger.guard', 'Спусковая скоба', 'pistol', ['trigger_guard', 'trigger_plate'], [0, -.04, .02]),
  part('trigger', 'Спусковой крючок', 'pistol', ['trigger'], [0, -.02, .05]),
  part('foreend', 'Передний наконечник ложи', 'pistol', ['foreend_plate'], [.045, .015, 0]),
  part('ramrod', 'Шомпол', 'pistol', ['ramrod', 'ramrod_head'], [.07, -.025, 0]),
  ...(['rear', 'front'] as const).map((end, i) => part(`ramrod.pipe.${end}`, i ? 'Передняя шомпольная трубка' : 'Задняя шомпольная трубка', 'pistol', [`ramrod_pipe_${end}`, `ramrod_pipe_mount_${end}`], [0, -.025, -.025])),
  part('barrel.pins', 'Крепления ствола', 'pistol', [945, 1275].flatMap(n => [-1, 1].flatMap(side => [`barrel_pin_${n}_${side}head`, `barrel_pin_${n}_${side}slot`])), [0, 0, -.035]),
  part('buttcap', 'Затыльник рукояти', 'pistol', ['buttcap_right', 'buttcap_left', 'buttcap_fastener', 'butt_cap_rear'], [-.035, -.025, 0]),
  part('escutcheon', 'Накладка рукояти', 'pistol', ['grip_escutcheon'], [0, .035, -.025]),
]
