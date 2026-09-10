import type { AssemblyConfig, AssemblyLayoutGroup } from '../../assembly'

const group = (id: string, ru: string, en: string, direction: readonly [number, number], members: readonly string[] = [id], drilldownLayoutId?: string): AssemblyLayoutGroup => ({
  id, label: { ru, en }, selectionTarget: members.length === 1 ? { kind: 'entity', entityId: members[0] } : { kind: 'layout-group' },
  memberEntityIds: members, moveEntityIds: members, preferredDirection: direction, drilldownLayoutId,
})
export const pistolAssembly: AssemblyConfig = {
  referenceView: { cameraPosition: [.025, .23, .76], cameraTarget: [0, .08, 0] },
  layouts: [
    { id: 'overview', groups: [
      { ...group('stock-group', 'Ложа с креплениями', 'Stock and fittings', [0, 0], ['stock', 'ramrod.pipe.rear', 'ramrod.pipe.front', 'barrel.pins', 'escutcheon']), fixed: true },
      group('barrel', 'Ствол', 'Barrel', [0, -1]),
      group('lock', 'Кремнёвый замок', 'Flintlock', [-1, -1], ['lock'], 'lock'),
      group('trigger-group', 'Спусковой узел', 'Trigger group', [0, 1], ['trigger', 'trigger.guard'], 'trigger'),
      group('ramrod', 'Шомпол', 'Ramrod', [1, 1]),
      group('sideplate', 'Контрзамочная накладка', 'Sideplate', [-1, 0]),
      group('buttcap', 'Затыльник', 'Butt cap', [-1, 1]),
      group('foreend', 'Передняя оковка', 'Fore-end cap', [1, 0]),
    ] },
    { id: 'lock', parentLayoutId: 'overview', groups: [
      { ...group('lock.plate', 'Замочная доска', 'Lock plate', [0, 0]), fixed: true },
      group('lock.cock', 'Курок', 'Cock', [-1, -1]), group('lock.frizzen', 'Батарея', 'Frizzen', [1, -1]),
      group('lock.pan', 'Полка', 'Pan', [1, 0]), group('lock.spring', 'Пружина', 'Spring', [0, 1]),
    ] },
    { id: 'trigger', parentLayoutId: 'overview', groups: [
      { ...group('trigger.guard', 'Спусковая скоба', 'Trigger guard', [0, 0]), fixed: true },
      group('trigger', 'Спусковой крючок', 'Trigger', [0, -1]),
    ] },
  ],
}
