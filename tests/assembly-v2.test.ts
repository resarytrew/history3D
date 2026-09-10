import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, PerspectiveCamera, Vector3 } from 'three'
import { assemblyPose, resolveSelection, validateAssembly, type AssemblyConfig } from '../src/content/assembly'
import { pistolAssembly } from '../src/content/exhibits/russian-pistol-1798-1804/assembly'
import { pistolSemantics } from '../src/content/exhibits/russian-pistol-1798-1804/semantics'
import { pistolAnnotations } from '../src/content/exhibits/russian-pistol-1798-1804/annotations'
import { pistolHotspots } from '../src/content/exhibits/russian-pistol-1798-1804/hotspots'
import { SemanticSceneIndex } from '../src/three/SemanticSceneIndex'
import { AssemblySystem } from '../src/three/AssemblySystem'
import { SemanticPicker, SelectionGesture } from '../src/three/SemanticPicker'
import { SemanticPresentation } from '../src/three/SemanticPresentation'
import { AssemblyLayoutSolver, snapshotBounds } from '../src/three/AssemblyLayoutSolver'
import { ViewerController } from '../src/three/ViewerController'

function fixture() {
  const root = new Group(), material = new MeshStandardMaterial({ transparent: true, opacity: .1 })
  const front = new Mesh(new BoxGeometry(.1, .1, .1), material), back = front.clone()
  front.name = 'front'; front.position.z = .2; back.name = 'back'; root.add(front, back)
  const index = new SemanticSceneIndex(root, [
    { id: 'whole', kind: 'object', label: { ru: 'Предмет' }, geometry: { objectNames: [] } },
    { id: 'front', parentId: 'whole', kind: 'part', label: { ru: 'Передняя' }, geometry: { objectNames: ['front'] } },
    { id: 'back', parentId: 'whole', kind: 'part', label: { ru: 'Задняя' }, geometry: { objectNames: ['back'] } },
    { id: 'feature', parentId: 'front', kind: 'feature', label: { ru: 'Признак' }, geometry: { objectNames: [] } },
  ])
  const config: AssemblyConfig = { referenceView: { cameraPosition: [0, 0, 1], cameraTarget: [0, 0, 0] }, layouts: [{ id: 'overview', groups: [
    { id: 'back', label: { ru: 'Задняя', en: 'Back' }, selectionTarget: { kind: 'entity', entityId: 'back' }, memberEntityIds: ['back'], moveEntityIds: ['back'], preferredDirection: [1, 0] },
  ] }] }
  const camera = new PerspectiveCamera(34, 1, .01, 10); camera.position.z = 1; camera.lookAt(0, 0, 0)
  const picker = new SemanticPicker(), presentation = new SemanticPresentation(index)
  const pick = () => picker.pick(50, 50, { left: 0, top: 0, width: 100, height: 100 }, camera, root, index, presentation.policy)
  return { root, index, front, back, config, camera, presentation, picker, pick }
}
describe('direct semantic interaction', () => {
  it('blocks with the nearest ordinary surface regardless of opacity or selectability', () => {
    const f = fixture()
    expect(f.pick()).toBe('front')
    expect(resolveSelection(f.pick(), { kind: 'layout', layoutId: 'overview' }, f.index.definitions, f.config)).toBeNull()
    const blocker = new Mesh(new BoxGeometry(.2, .2, .05), new MeshStandardMaterial()); blocker.position.z = .5; f.root.add(blocker)
    expect(f.pick()).toBeNull()
  })
  it('only unselectable ghost geometry permits picking through it', () => {
    const f = fixture()
    f.presentation.update({ kind: 'entity', entityId: 'back' }, 'ghost', { kind: 'assembled' }, f.config)
    expect(f.presentation.policy(f.front)).toBe('solid'); expect(f.pick()).toBe('front')
    f.presentation.update({ kind: 'entity', entityId: 'back' }, 'ghost', { kind: 'layout', layoutId: 'overview' }, f.config)
    expect(f.presentation.policy(f.front)).toBe('pick-through'); expect(f.pick()).toBe('back')
    f.presentation.update({ kind: 'entity', entityId: 'back' }, 'all', { kind: 'layout', layoutId: 'overview' }, f.config)
    expect(f.pick()).toBe('front')
    f.presentation.dispose()
  })
  it('keeps selected material priority and reuses hover variants', () => {
    const f = fixture()
    f.presentation.setHover({ kind: 'entity', entityId: 'front' }); const hoverMaterial = f.front.material
    f.presentation.setHover(null); f.presentation.setHover({ kind: 'entity', entityId: 'front' }); expect(f.front.material).toBe(hoverMaterial)
    f.presentation.show('front', 'all'); const selectedMaterial = f.front.material
    f.presentation.setHover(null); expect(f.front.material).toBe(selectedMaterial)
    f.presentation.dispose()
  })
  it('cancels return-to-origin drags, multi-pointer gestures and pointercancel', () => {
    const gesture = new SelectionGesture()
    gesture.down(1, 0, 0, 'mouse'); gesture.move(1, 7, 0); expect(gesture.up(1, 0, 0)).toBe(false)
    gesture.down(1, 0, 0, 'touch'); expect(gesture.up(1, 9, 0)).toBe(true)
    gesture.down(1, 0, 0, 'touch'); gesture.down(2, 0, 0, 'touch'); expect(gesture.up(2, 0, 0)).toBe(false); expect(gesture.up(1, 0, 0)).toBe(false)
    gesture.down(1, 0, 0, 'mouse'); gesture.cancel(1); expect(gesture.up(1, 0, 0)).toBe(false)
  })
  it('does not issue camera commands for selection and preserves the last pose on solver failure', () => {
    const f = fixture(), focusPoint = vi.fn(), onAssemblyError = vi.fn(), system = new AssemblySystem(f.index)
    // Exercise controller commands with real semantic/presentation/pose systems;
    // replace only the canvas renderer and camera side effects (no WebGL in unit tests).
    const controller = Object.create(ViewerController.prototype) as ViewerController
    Object.assign(controller, { context: { kind: 'assembled' }, semanticScene: f.index, semanticPresentation: f.presentation, assembly: system,
      bounds: snapshotBounds(f.index), exhibit: { semantics: f.index.definitions, assembly: f.config }, canvas: document.createElement('canvas'),
      cameraRig: { focusPoint }, lighting: { setModelModified: vi.fn() }, renderer: { shadowMap: {} }, scheduler: { invalidate: vi.fn() }, callbacks: { onAssemblyError } })
    expect(controller.setSemanticState({ kind: 'entity', entityId: 'front' }, 'all', { kind: 'assembled' })).toBe(true)
    expect(focusPoint).not.toHaveBeenCalled()
    controller.focusEntity('feature'); expect(focusPoint).toHaveBeenCalledOnce()
    const before = system.pose
    expect(controller.setSemanticState(null, 'all', { kind: 'layout', layoutId: 'overview' })).toBe(false)
    expect(system.pose).toEqual(before); expect(onAssemblyError).toHaveBeenCalledOnce()
    f.presentation.dispose()
  })
})
describe('assembly contracts', () => {
  it('resolves historical entities and presentation groups without changing part-of', () => {
    const before = JSON.stringify(pistolSemantics)
    validateAssembly(pistolAssembly, pistolSemantics)
    expect(resolveSelection('lock.frizzen', { kind: 'assembled' }, pistolSemantics, pistolAssembly)).toEqual({ kind: 'entity', entityId: 'lock.frizzen' })
    expect(resolveSelection('lock.frizzen', { kind: 'layout', layoutId: 'overview' }, pistolSemantics, pistolAssembly)).toEqual({ kind: 'entity', entityId: 'lock' })
    expect(resolveSelection('trigger', { kind: 'layout', layoutId: 'overview' }, pistolSemantics, pistolAssembly)).toEqual({ kind: 'layout-group', layoutId: 'overview', groupId: 'trigger-group' })
    expect(resolveSelection('lock.frizzen', { kind: 'layout', layoutId: 'lock' }, pistolSemantics, pistolAssembly)).toEqual({ kind: 'entity', entityId: 'lock.frizzen' })
    expect(JSON.stringify(pistolSemantics)).toBe(before)
    expect(pistolSemantics.find(e => e.id === 'trigger')?.parentId).toBe('pistol')
  })
  it('rejects duplicate offsets, overlapping groups, cycles and non-finite values', () => {
    expect(() => assemblyPose([['front', [0, 0, 0]], ['front', [1, 0, 0]]])).toThrow('Duplicate')
    expect(() => assemblyPose([['front', [NaN, 0, 0]]])).toThrow('Invalid')
    const f = fixture(), layout = f.config.layouts[0]
    expect(() => validateAssembly({ ...f.config, layouts: [{ ...layout, groups: [...layout.groups, { ...layout.groups[0], id: 'duplicate' }] }] }, f.index.definitions)).toThrow('Overlapping')
    expect(() => validateAssembly({ ...f.config, layouts: [{ ...layout, parentLayoutId: 'overview' }] }, f.index.definitions)).toThrow('cycle')
  })
  it('inherits total offsets, overrides children, interrupts continuously and clears the previous pose', () => {
    const f = fixture(), system = new AssemblySystem(f.index)
    system.setPose(assemblyPose([['whole', [1, 0, 0]], ['front', [2, 0, 0]]]))
    expect(f.index.getFrame('front').position.x).toBe(1)
    expect(f.index.getFrame('feature').getWorldPosition(new Vector3()).x).toBe(2)
    system.animateTo(assemblyPose([['whole', [3, 0, 0]]]), 0); system.update(275)
    expect(system.pose.offsets.get('front')?.[0]).toBe(2.5)
    system.animateTo(assemblyPose([]), 275); expect(system.pose.offsets.get('front')?.[0]).toBe(2.5)
    system.update(825); expect(f.index.getFrame('front').getWorldPosition(new Vector3()).x).toBe(0)
    system.animateTo(assemblyPose([['front', [.5, 0, 0]]]), 900, true); expect(system.animating).toBe(false)
  })
  it('authors features in their own frames and follows the carrier', () => {
    const f = fixture(), point = f.front.getWorldPosition(new Vector3())
    const anchor = f.index.anchorFromWorld('feature', point, new Vector3(0, 0, 1))
    expect(anchor.entityId).toBe('feature')
    new AssemblySystem(f.index).setPose(assemblyPose([['front', [.2, 0, 0]]]))
    expect(f.index.getWorldPoint(anchor).x).toBeCloseTo(point.x + .2)
  })
  it('solves immutable snapshots deterministically without WebGL', () => {
    const f = fixture(), objects = snapshotBounds(f.index), before = JSON.stringify(objects)
    const input = { objects, entities: f.index.definitions, layout: f.config.layouts[0], referenceView: f.config.referenceView, width: 390, height: 450 }
    const solver = new AssemblyLayoutSolver(), a = solver.solve(input), b = solver.solve(input)
    expect(a.ok).toBe(true); expect(a).toEqual(b); expect(JSON.stringify(objects)).toBe(before)
    expect(a.diagnostics.at(-1)).toBe('final-validation')
    expect(solver.solve({ ...input, width: 40 }).ok).toBe(false)
  })
  it('preserves all six evidence lists and keeps shared text on the correct subject', () => {
    expect(pistolAnnotations.map(a => a.entityId)).toEqual(['barrel', 'lock', 'lock', 'stock', 'ramrod', 'pistol'])
    pistolAnnotations.forEach((a, i) => { expect(a.id).toBe(pistolHotspots[i].id); expect(a.evidenceIds).toEqual(pistolHotspots[i].evidenceIds); expect(a.description).toBe(pistolHotspots[i].description) })
    expect(pistolAnnotations[5].label).toBe('Рукоять и затыльник')
  })
  it('projects all eight local corners instead of an enlarged world AABB', () => {
    const f = fixture(); f.back.rotation.set(.3, .7, .4)
    const objects = snapshotBounds(f.index), object = objects.find(o => o.entityId === 'back')!
    const result = new AssemblyLayoutSolver().solve({ objects, entities: f.index.definitions, layout: f.config.layouts[0], referenceView: f.config.referenceView, width: 768, height: 500 })
    expect(result.ok).toBe(true)
    if (!result.ok) throw new Error(result.error)
    const camera = new PerspectiveCamera(34, 768 / 500, .0001, 1000)
    camera.position.fromArray(result.view.cameraPosition); camera.lookAt(new Vector3().fromArray(result.view.cameraTarget)); camera.updateMatrixWorld(true)
    const matrix = new Matrix4().fromArray(object.matrix), offset = new Vector3().fromArray(result.pose.offsets.get('back')!)
    const projected = Array.from({ length: 8 }, (_, i) => new Vector3(object[i & 1 ? 'max' : 'min'][0], object[i & 2 ? 'max' : 'min'][1], object[i & 4 ? 'max' : 'min'][2]).applyMatrix4(matrix).add(offset).project(camera))
    expect(result.rectangles[0].left).toBeCloseTo(Math.min(...projected.map(v => (v.x + 1) * 384)), 8)
    expect(result.rectangles[0].bottom).toBeCloseTo(Math.max(...projected.map(v => (1 - v.y) * 250)), 8)
  })
  it('uses one corrective solve, deterministic fallback and validates after the final fit', () => {
    const f = fixture()
    const entities = Array.from({ length: 8 }, (_, i) => ({ ...f.index.definitions[1], id: `part${i}`, parentId: undefined }))
    const objects = entities.map(e => ({ entityId: e.id, min: [-.2, -.05, -.01] as const, max: [.2, .05, .01] as const, matrix: new Matrix4().toArray() }))
    const groups = entities.map((e, i) => ({ ...f.config.layouts[0].groups[0], id: e.id, memberEntityIds: [e.id], moveEntityIds: [e.id], fixed: i === 0 }))
    const input = { objects, entities, layout: { id: 'overview', groups }, referenceView: f.config.referenceView, width: 320, height: 450 }
    const a = new AssemblyLayoutSolver().solve(input), b = new AssemblyLayoutSolver().solve(input)
    expect(a).toEqual(b); expect(a.ok).toBe(true)
    expect(a.diagnostics.filter(d => d === 'corrective-solve')).toHaveLength(1)
    expect(a.diagnostics).toContain('fallback'); expect(a.diagnostics.at(-1)).toBe('final-validation')
    if (a.ok) expect(a.pose.offsets.get('part0')).toEqual([0, 0, 0])
  })
})
