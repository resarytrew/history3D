import { describe, expect, it } from 'vitest'
import { BoxGeometry, Group, Matrix3, Mesh, MeshBasicMaterial, Vector3 } from 'three'
import type { SemanticEntity } from '../src/content/semantics'
import type { Hotspot } from '../src/content/types'
import { SemanticSceneIndex, validateSemantics } from '../src/three/SemanticSceneIndex'
import { AssemblySystem } from '../src/three/AssemblySystem'
import { assemblyPose } from '../src/content/assembly'
import { bindSurfaceAnchor } from '../src/three/hotspotProjection'

function fixture() {
  const root = new Group(), imported = new Group()
  root.rotation.y = .4
  imported.position.set(.3, .2, -.1)
  imported.rotation.z = .2
  imported.scale.set(2, 1, .7)
  root.add(imported)
  for (const name of ['body', 'face']) {
    const mesh = new Mesh(new BoxGeometry(.1, .1, .1), new MeshBasicMaterial())
    mesh.name = name
    mesh.position.x = name === 'body' ? .1 : .3
    imported.add(mesh)
  }
  const entities: SemanticEntity[] = [
    { id: 'pistol', kind: 'object', label: { ru: 'Пистолет' }, geometry: { objectNames: [] } },
    { id: 'lock', parentId: 'pistol', kind: 'assembly', label: { ru: 'Замок' }, geometry: { objectNames: [] }, explodeOffset: [0, 0, .1] },
    { id: 'frizzen', parentId: 'lock', kind: 'part', label: { ru: 'Батарея' }, geometry: { objectNames: ['body', 'face'] }, explodeOffset: [.2, 0, 0] },
    { id: 'mark', parentId: 'frizzen', kind: 'feature', label: { ru: 'Клеймо' }, geometry: { objectNames: [] } },
  ]
  root.updateWorldMatrix(true, true)
  return { root, entities }
}

describe('semantic scene and absolute assembly transforms', () => {
  it('preserves imported world geometry and resolves multiple meshes through semantic ancestors', () => {
    const { root, entities } = fixture()
    const before = root.getObjectByName('body')!.matrixWorld.clone()
    const index = new SemanticSceneIndex(root, entities)
    root.getObjectByName('body')!.matrixWorld.elements.forEach((value, i) => expect(value).toBeCloseTo(before.elements[i], 12))
    expect(index.getObjects('lock').map(object => object.name)).toEqual(['body', 'face'])
    expect(index.getPath('mark').map(entity => entity.id)).toEqual(['pistol', 'lock', 'frizzen', 'mark'])
  })
  it('moves hotspots and geometry together, including nested assembly offsets, without drift', () => {
    const { root, entities } = fixture(), index = new SemanticSceneIndex(root, entities)
    const assembly = new AssemblySystem(index)
    const anchor = { entityId: 'mark', localPoint: [.1, .2, .3] as const }
    const before = index.getWorldPoint(anchor)
    const mesh = root.getObjectByName('face')!, meshBefore = mesh.getWorldPosition(new Vector3())
    const expectedDelta = new Vector3(.2, 0, .1).applyMatrix3(new Matrix3().setFromMatrix4(root.matrixWorld))
    assembly.setPose(assemblyPose([['lock', [0, 0, .1]], ['frizzen', [.2, 0, .1]]]))
    expect(index.getWorldPoint(anchor).distanceTo(before.clone().add(expectedDelta))).toBeLessThan(1e-12)
    expect(mesh.getWorldPosition(new Vector3()).distanceTo(meshBefore.clone().add(expectedDelta))).toBeLessThan(1e-12)
    for (let i = 0; i < 100; i++) { assembly.setPose(assemblyPose([['lock', [.1, 0, .3]], ['frizzen', [.2, 0, .1]]])); assembly.reset() }
    expect(index.getWorldPoint(anchor).distanceTo(before)).toBeLessThan(1e-12)
    expect(mesh.getWorldPosition(new Vector3()).distanceTo(meshBefore)).toBeLessThan(1e-12)
  })
  it('transforms normals with inverse transpose under rotation and non-uniform scale', () => {
    const { root, entities } = fixture(), index = new SemanticSceneIndex(root, entities)
    const anchor = { entityId: 'frizzen', localPoint: [0, 0, 0] as const, localNormal: [1, 1, 0] as const }
    const before = index.getWorldNormal(anchor)!
    const frame = index.getFrame('frizzen')
    frame.rotation.z = Math.PI / 2
    frame.scale.set(2, 1, 1)
    frame.updateWorldMatrix(true, true)
    const expected = new Vector3(1, 1, 0).applyMatrix3(new Matrix3().getNormalMatrix(frame.matrixWorld)).normalize()
    expect(index.getWorldNormal(anchor)!.distanceTo(expected)).toBeLessThan(1e-12)
    expect(index.getWorldNormal(anchor)!.distanceTo(before)).toBeGreaterThan(.5)
  })
  it('migrates legacy root-local coordinates once, then follows the semantic frame', () => {
    const { root, entities } = fixture(), index = new SemanticSceneIndex(root, entities)
    const hotspot = { id: 'test', position: [.1, .2, .3], target: { entityId: 'frizzen' } } as unknown as Hotspot
    const anchor = bindSurfaceAnchor(root, hotspot, index)
    const before = anchor.frame!.localToWorld(anchor.point.clone())
    expect(before.distanceTo(root.localToWorld(new Vector3(.1, .2, .3)))).toBeLessThan(1e-12)
    index.getFrame('frizzen').position.y += .3
    index.getFrame('frizzen').updateWorldMatrix(true, true)
    expect(anchor.frame!.localToWorld(anchor.point.clone()).y - before.y).toBeCloseTo(.3)
  })
  it('authors a stable semantic anchor from either mesh and preserves imported local transforms', () => {
    const { root, entities } = fixture()
    const mesh = root.getObjectByName('face')!
    const local = mesh.matrix.clone(), index = new SemanticSceneIndex(root, entities)
    expect(mesh.matrix.elements).toEqual(local.elements)
    const world = mesh.getWorldPosition(new Vector3()), normal = new Vector3(0, 0, 1)
    const anchor = index.createAnchor(mesh, world, normal)
    expect(anchor.entityId).toBe('frizzen')
    expect(index.getWorldPoint(anchor).distanceTo(world)).toBeLessThan(1e-12)
    expect(index.getWorldNormal(anchor)!.distanceTo(normal)).toBeLessThan(1e-12)
    index.getFrame('frizzen').rotation.y = .6
    expect(index.getWorldNormal(anchor)!.distanceTo(normal)).toBeGreaterThan(.1)
  })
  it('rejects duplicate IDs, cycles, missing parents/geometry and overlapping ownership before mutation', () => {
    const { root, entities } = fixture()
    expect(() => validateSemantics(root, [...entities, entities[0]])).toThrow('Duplicate')
    expect(() => validateSemantics(root, [{ ...entities[0], parentId: 'mark' }, ...entities.slice(1)])).toThrow('cycle')
    expect(() => validateSemantics(root, [{ ...entities[0], parentId: 'missing' }, ...entities.slice(1)])).toThrow('parent')
    expect(() => validateSemantics(root, [...entities, { ...entities[2], id: 'other' }])).toThrow('ownership')
    expect(() => validateSemantics(root, [{ ...entities[2], parentId: undefined, geometry: { objectNames: ['absent'] } }])).toThrow('geometry')
    expect(root.getObjectByName('semantic:pistol')).toBeUndefined()
  })
})
