import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshStandardMaterial } from 'three'
import { SemanticSceneIndex } from '../src/three/SemanticSceneIndex'
import { SemanticPresentation } from '../src/three/SemanticPresentation'
import { validateCatalog } from '../src/content/validation'
import { russianPistol1798 } from '../src/content/exhibits/russian-pistol-1798-1804/exhibit'
import { russianEmpireCollection } from '../src/content/collections/russian-empire'

it('isolates supporting geometry, ghosts surroundings, and restores shared source materials on disposal', () => {
  const root = new Group(), material = new MeshStandardMaterial()
  const left = new Mesh(new BoxGeometry(), material), right = new Mesh(new BoxGeometry(), material)
  left.name = 'left'; right.name = 'right'; root.add(left, right)
  const index = new SemanticSceneIndex(root, [
    { id: 'left', kind: 'part', label: { ru: 'Левая' }, geometry: { objectNames: ['left'] } },
    { id: 'right', kind: 'part', label: { ru: 'Правая' }, geometry: { objectNames: ['right'] } },
    { id: 'region', kind: 'region', parentId: 'left', label: { ru: 'Область' }, geometry: { objectNames: [] } },
  ])
  const presentation = new SemanticPresentation(index)
  presentation.show('region', 'isolate')
  expect(left.visible).toBe(true); expect(right.visible).toBe(false)
  presentation.show('left', 'ghost')
  expect(right.visible).toBe(true)
  expect(right.material.opacity).toBe(.16)
  expect(left.material).not.toBe(right.material)
  expect(material.opacity).toBe(1)
  const dispose = vi.spyOn(right.material, 'dispose')
  presentation.dispose()
  expect(dispose).toHaveBeenCalledOnce()
  expect(left.material).toBe(material); expect(right.material).toBe(material)
  expect(right.visible).toBe(true)
})

describe('semantic content authoring validation', () => {
  it('accepts the complete pistol definition and reports missing targets, cycles, and invalid moving features', () => {
    const collection = { ...russianEmpireCollection, defaultExhibitId: russianPistol1798.id, entries: russianEmpireCollection.entries.filter(entry => entry.exhibitId === russianPistol1798.id) }
    expect(validateCatalog([russianPistol1798], [collection]).errors).toEqual([])
    const broken = { ...russianPistol1798,
      hotspots: [{ ...russianPistol1798.hotspots[0], anchor: { entityId: 'absent', localPoint: [0, 0, 0] } }],
      semantics: [
        { id: 'a', kind: 'feature', parentId: 'b', label: { ru: 'A' }, geometry: { objectNames: [] }, explodeOffset: [1, 0, 0] },
        { id: 'b', kind: 'assembly', parentId: 'a', label: { ru: 'B' }, geometry: { objectNames: [] } },
      ],
    }
    const errors = validateCatalog([broken], [collection]).errors
    expect(errors.some(error => error.field === 'hotspots[0].anchor.entityId')).toBe(true)
    expect(errors.some(error => error.message === 'Semantic part-of cycle')).toBe(true)
    expect(errors.some(error => error.field === 'semantics[0].explodeOffset')).toBe(true)
  })
})
