import { Box3, Mesh, PerspectiveCamera, Vector3 } from 'three'
import { describe, expect, it } from 'vitest'
import { createPokrovNaNerliModel } from '../src/content/exhibits/pokrov-na-nerli/procedural/createPokrovNaNerliModel'

const requiredNodes = [
  'foundation',
  'centralVolume',
  'northFacade',
  'southFacade',
  'westFacade',
  'apses',
  'centralApse',
  'northApse',
  'southApse',
  'facadePilasters',
  'portals',
  'windowSystem',
  'arcadeColumnBelt',
  'zakomars',
  'drum',
  'drumWindows',
  'dome',
  'cross',
] as const

function projectionSignature(cameraPosition: Vector3): string {
  const model = createPokrovNaNerliModel()
  model.updateMatrixWorld(true)
  const camera = new PerspectiveCamera(34, 1, 0.1, 100)
  camera.position.copy(cameraPosition)
  camera.lookAt(0, 3.5, 0)
  camera.updateMatrixWorld(true)
  camera.updateProjectionMatrix()

  const projected: string[] = []
  model.traverse((object) => {
    if (!(object instanceof Mesh)) return
    const centre = new Box3().setFromObject(object).getCenter(new Vector3()).project(camera)
    projected.push(`${object.name}:${centre.x.toFixed(3)}:${centre.y.toFixed(3)}:${centre.z.toFixed(3)}`)
  })
  return projected.sort().join('|')
}

describe('Pokrov-na-Nerli procedural reconstruction', () => {
  it('contains the required architectural systems as real geometry', () => {
    const model = createPokrovNaNerliModel()
    requiredNodes.forEach((name) => expect(model.getObjectByName(name), name).toBeTruthy())

    let meshCount = 0
    let vertexCount = 0
    let triangleCount = 0
    model.traverse((object) => {
      if (!(object instanceof Mesh)) return
      meshCount += 1
      const position = object.geometry.getAttribute('position')
      vertexCount += position?.count ?? 0
      triangleCount += object.geometry.index
        ? object.geometry.index.count / 3
        : (position?.count ?? 0) / 3
      expect(object.geometry.type).not.toBe('PlaneGeometry')
      const materials = Array.isArray(object.material) ? object.material : [object.material]
      materials.forEach((material) => {
        if ('map' in material) expect(material.map).toBeFalsy()
      })
    })

    expect(meshCount).toBeGreaterThan(120)
    expect(vertexCount).toBeGreaterThan(10_000)
    expect(triangleCount).toBeGreaterThan(8_000)
    expect(model.userData.geometryContract).toBe('real-meshes-no-billboards-no-textured-planes')
  })

  it('has materially different front, side and rear projections', () => {
    const signatures = [
      projectionSignature(new Vector3(0, 4.6, 13)),
      projectionSignature(new Vector3(13, 4.6, 0)),
      projectionSignature(new Vector3(0, 4.6, -13)),
      projectionSignature(new Vector3(-13, 4.6, 0)),
    ]
    expect(new Set(signatures).size).toBe(4)
  })
})
