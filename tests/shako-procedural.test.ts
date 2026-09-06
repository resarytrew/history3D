import { Box3, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three'
import { afterAll, describe, expect, it } from 'vitest'
import { createRussianShako1808, createRussianShako1808ForPass } from '../src/content/exhibits/russian-shako-1808/procedural/createRussianShako1808'
import { reinforcementSurface } from '../src/content/exhibits/russian-shako-1808/procedural/shakoConstruction'
import { D } from '../src/content/exhibits/russian-shako-1808/procedural/shako1808Dimensions'
import { disposeObject3D } from '../src/three/dispose'

const model = createRussianShako1808()
model.updateMatrixWorld(true)
afterAll(() => disposeObject3D(model))
const bounds = (name: string) => new Box3().setFromObject(model.getObjectByName(name)!)
const height = (name: string) => bounds(name).getSize(new Vector3()).y

describe('1808 shako locked geometry (metres; 0.1 mm dimensional tolerance)', () => {
  it('keeps shell height 175 mm and the complete outer top diameter 255 mm', () => {
    expect(height('Shell')).toBeCloseTo(0.175, 4)
    expect(bounds('OuterTopRim').getSize(new Vector3()).x).toBeCloseTo(0.255, 4)
  })
  it('generates the bottom felt ring at the DERIVED diameter of 210 mm', () => {
    const p = (model.getObjectByName('FeltLowerWithRearSlit') as Mesh).geometry.attributes.position
    const radii = Array.from({ length: p.count }, (_, i) => Math.abs(p.getY(i) - D.reconstruction.baseY) < 1e-6 ? Math.hypot(p.getX(i), p.getZ(i)) : 0)
    expect(Math.max(...radii) * 2).toBeCloseTo(0.210, 4)
    expect(D.derived.bottomDiameter).toBeCloseTo(D.fact.topDiameter - D.fact.diameterDifference, 9)
  })
  it('has a 75 mm visor projection, 50 mm drop and actual 3.5 mm thickness', () => {
    const b = bounds('Visor')
    expect(b.max.z - D.derived.bottomRadius).toBeCloseTo(0.075, 4)
    expect(D.reconstruction.baseY - b.min.y).toBeCloseTo(0.050 + 0.0035, 4)
    const ray = new Raycaster(new Vector3(0, 1, 0.15), new Vector3(0, -1, 0))
    expect(ray.intersectObject(model.getObjectByName('Visor')!)).not.toHaveLength(0)
  })
  it('generates surface-following straps 18 mm wide (0.2 mm chord tolerance)', () => {
    for (const name of ['SideReinforcementLeft', 'SideReinforcementRight']) for (const arm of [-1, 1]) {
      const p = (model.getObjectByName(name)!.getObjectByName(`VArm${arm}`) as Mesh).geometry.attributes.position
      for (const row of [3, 16, 29]) {
        const width = new Vector3().fromBufferAttribute(p, row * 5).distanceTo(new Vector3().fromBufferAttribute(p, row * 5 + 4))
        expect(Math.abs(width - 0.018)).toBeLessThan(0.0002)
      }
    }
    expect(reinforcementSurface(0, -1, 0.5, 1).distanceTo(reinforcementSurface(0, 1, 0.5, 1))).toBeCloseTo(0.090, 4)
  })
  it('has a 20 mm lower band, 27 mm upper overlap and 80 mm pocket', () => {
    expect(height('LowerBand')).toBeCloseTo(0.020, 4)
    expect(height('UpperLeatherBand')).toBeCloseTo(0.027, 4)
    expect(height('FrontOrnamentPocket')).toBeCloseTo(0.080, 4)
    expect(height('RearLeatherCover')).toBeCloseTo(0.050, 4)
  })
  it('has a visible top centre recessed 25 mm, with outward-facing normals', () => {
    const y = bounds('OuterTopRim').max.y
    const hits = new Raycaster(new Vector3(0.01, y + 0.1, 0), new Vector3(0, -1, 0)).intersectObject(model.getObjectByName('DepressedTopSurface')!)
    expect(hits.length).toBeGreaterThan(0)
    expect(y - hits[0].point.y).toBeCloseTo(0.025, 4)
  })
  it('models a real rear slit in the felt, not a painted seam', () => {
    const ray = new Raycaster(new Vector3(0, D.reconstruction.baseY + 0.025, -0.25), new Vector3(0, 0, 1), 0, 0.2)
    expect(ray.intersectObject(model.getObjectByName('FeltBody')!, true)).toHaveLength(0)
    ray.ray.origin.x = 0.01
    expect(ray.intersectObject(model.getObjectByName('FeltBody')!, true).length).toBeGreaterThan(0)
  })
  it('prepares the full, hidden interior to the locked lengths', () => {
    expect(model.getObjectByName('Interior')?.visible).toBe(false)
    expect(height('LeatherSweatBand')).toBeCloseTo(0.037, 4)
    expect(height('LinenLiner')).toBeCloseTo(0.135, 4)
    expect(height('NeckFlap')).toBeCloseTo(0.168, 4)
  })
})

describe('semantic, material and performance contract', () => {
  it('keeps the photo-guided grenade a thin embossed sheet with a front-facing bomb', () => {
    const badge = model.getObjectByName('FrontBadge_OneFlameGrenade')!
    const local = new Box3()
    badge.traverse((o) => { if (o instanceof Mesh) local.union(new Box3().setFromBufferAttribute(o.geometry.attributes.position)) })
    expect(local.getSize(new Vector3()).z).toBeLessThan(0.003)
    expect(local.getSize(new Vector3()).x).toBeCloseTo(0.029, 3)
    const origin = new Vector3(0, D.reconstruction.badgeHeight * 72 / 361, 0.1).applyMatrix4(badge.matrixWorld)
    const direction = new Vector3(0, 0, -1).transformDirection(badge.matrixWorld)
    const hits = new Raycaster(origin, direction).intersectObject(badge.getObjectByName('RoundedBombRelief')!)
    expect(hits.length).toBeGreaterThan(0)
  })
  it('has the asymmetric white cord assembly and all required identity nodes', () => {
    for (const name of ['SideReinforcementLeft', 'SideReinforcementRight', 'FrontBadge_OneFlameGrenade', 'Repyok', 'FrontBraid', 'RearBraid', 'RightDiamondCord', 'LeftDiamondCord', 'RightTassel1', 'RightTassel2', 'RightTassel3', 'LeftTassel', 'RearBrassBuckle', 'VisorOuterRidge', 'VisorInnerRidge']) expect(model.getObjectByName(name), name).toBeDefined()
    expect(model.getObjectByName('RightTassel4')).toBeUndefined()
    expect(model.getObjectByName('LeftTassel')!.userData.suspensionLength).toBeLessThan(model.getObjectByName('RightTassel3')!.userData.suspensionLength)
    for (const name of ['Plume', 'Eagle', 'Cockade', 'BrassScales']) expect(model.getObjectByName(name)).toBeUndefined()
  })
  it('separates matte felt, leather, cotton and brass; keeps the chinstrap leather', () => {
    const material = (name: string) => (model.getObjectByName(name) as Mesh).material as MeshStandardMaterial
    expect(material('FeltUpper').roughness).toBeGreaterThan(material('UpperLeatherBand').roughness)
    expect(material('FeltUpper').metalness).toBe(0)
    expect(material('LeatherChinstrap').name).toBe('BlackenedLeather')
    expect(material('StampedOneFlameOutline').metalness).toBeGreaterThan(0.8)
    expect(material('FrontBraid').name).toBe('CordWhite')
  })
  it('stays within the allowed 150,000 detail budget including the prepared interior, with finite geometry', () => {
    let triangles = 0, meshes = 0
    model.traverse((o) => {
      if (!(o instanceof Mesh)) return
      meshes++
      const position = o.geometry.attributes.position
      triangles += (o.geometry.index?.count ?? position.count) / 3
      expect(Array.from(position.array).every(Number.isFinite), o.name).toBe(true)
    })
    expect(triangles).toBeLessThanOrEqual(150_000)
    expect(meshes).toBeLessThanOrEqual(65)
  })
  it('keeps the clay blockout free of ornaments and textures', () => {
    const clay = createRussianShako1808ForPass(1)
    expect(clay.getObjectByName('Ethishket')).toBeUndefined()
    expect(clay.getObjectByName('FrontBadge_OneFlameGrenade')).toBeUndefined()
    clay.traverse((o) => { if (o instanceof Mesh) expect((o.material as MeshStandardMaterial).name).toBe('Clay') })
    disposeObject3D(clay)
  })
})
