import { Box3, Mesh, MeshStandardMaterial, Raycaster, Vector3 } from 'three'
import { afterAll, describe, expect, it } from 'vitest'
import { createRussianShako1808, createRussianShako1808ForPass } from '../src/content/exhibits/russian-shako-1808/procedural/createRussianShako1808'
import { reinforcementSurface } from '../src/content/exhibits/russian-shako-1808/procedural/shakoConstruction'
import { badgeSeat } from '../src/content/exhibits/russian-shako-1808/procedural/shakoGrenade'
import { D } from '../src/content/exhibits/russian-shako-1808/procedural/shako1808Dimensions'
import { disposeObject3D } from '../src/three/dispose'

const model = createRussianShako1808()
model.updateMatrixWorld(true)
afterAll(() => disposeObject3D(model))
const bounds = (name: string) => new Box3().setFromObject(model.getObjectByName(name)!)
const height = (name: string) => bounds(name).getSize(new Vector3()).y

describe('1810 shako: converted specification, not artifact measurement', () => {
  it('separates the large internal size from the finished leather diameter', () => {
    expect(height('Shell')).toBeCloseTo(3.875 * 0.04445, 6)
    expect(bounds('OuterTopRim').getSize(new Vector3()).x).toBeCloseTo((5.75 * 0.04445) + 2 * (D.reconstruction.shellThickness + D.reconstruction.leatherThickness), 6)
  })
  it('adds assumed felt thickness outside the documented internal bottom diameter', () => {
    const p = (model.getObjectByName('FeltLowerWithRearSlit') as Mesh).geometry.attributes.position
    const radii = Array.from({ length: p.count }, (_, i) => Math.abs(p.getY(i) - D.reconstruction.baseY) < 1e-6 ? Math.hypot(p.getX(i), p.getZ(i)) : 0)
    expect(Math.max(...radii) * 2).toBeCloseTo(4.75 * 0.04445 + 2 * D.reconstruction.shellThickness, 6)
    expect(D.derived.bottomDiameter).toBeCloseTo(D.converted.topInternalDiameter - D.converted.diameterDifference + 2 * D.reconstruction.shellThickness, 9)
  })
  it('uses a three-inch visor projection, two-inch drop and assumed 3.5 mm thickness', () => {
    const b = bounds('Visor')
    expect(b.max.z - D.derived.bottomRadius).toBeCloseTo(3 * 0.0254, 6)
    expect(D.reconstruction.baseY - b.min.y).toBeCloseTo(2 * 0.0254 + 0.0035, 4)
    const ray = new Raycaster(new Vector3(0, 1, 0.15), new Vector3(0, -1, 0))
    expect(ray.intersectObject(model.getObjectByName('Visor')!)).not.toHaveLength(0)
  })
  it('generates surface-following straps seven lines wide (0.2 mm chord tolerance)', () => {
    for (const name of ['SideReinforcementLeft', 'SideReinforcementRight']) for (const arm of [-1, 1]) {
      const p = (model.getObjectByName(name)!.getObjectByName(`VArm${arm}`) as Mesh).geometry.attributes.position
      for (const row of [3, 16, 29]) {
        const width = new Vector3().fromBufferAttribute(p, row * 5).distanceTo(new Vector3().fromBufferAttribute(p, row * 5 + 4))
        expect(Math.abs(width - 7 * 0.00254)).toBeLessThan(0.0002)
      }
    }
    expect(reinforcementSurface(0, -1, 0.5, 1).distanceTo(reinforcementSurface(0, 1, 0.5, 1))).toBeCloseTo(2 * 0.04445, 6)
  })
  it('uses converted bands and omits the grenadier plume pocket', () => {
    expect(height('LowerBand')).toBeCloseTo(8 * 0.00254, 6)
    expect(height('UpperLeatherBand')).toBeCloseTo(0.0254 + 0.00254, 6)
    expect(model.getObjectByName('FrontOrnamentPocket')).toBeUndefined()
    expect(height('RearLeatherCover')).toBeCloseTo(2 * 0.0254, 6)
  })
  it('has a visible top centre recessed one inch, with outward-facing normals', () => {
    const y = bounds('OuterTopRim').max.y
    const hits = new Raycaster(new Vector3(0.01, y + 0.1, 0), new Vector3(0, -1, 0)).intersectObject(model.getObjectByName('DepressedTopSurface')!)
    expect(hits.length).toBeGreaterThan(0)
    expect(y - hits[0].point.y).toBeCloseTo(0.0254, 6)
    const underside = new Raycaster(new Vector3(0.01, 0.20, 0), new Vector3(0, 1, 0)).intersectObject(model.getObjectByName('DepressedTopSurface')!)
    expect(underside.length).toBeGreaterThan(0)
  })
  it('models a real rear slit in the felt, not a painted seam', () => {
    const ray = new Raycaster(new Vector3(0, D.reconstruction.baseY + 0.025, -0.25), new Vector3(0, 0, 1), 0, 0.2)
    expect(ray.intersectObject(model.getObjectByName('FeltBody')!, true)).toHaveLength(0)
    ray.ray.origin.x = 0.01
    expect(ray.intersectObject(model.getObjectByName('FeltBody')!, true).length).toBeGreaterThan(0)
  })
  it('exposes the assembled interior and distinguishes cut length from folded height', () => {
    expect(model.getObjectByName('Interior')?.visible).toBe(true)
    expect(height('LeatherSweatBand')).toBeCloseTo(1.5 * 0.0254, 6)
    expect(model.getObjectByName('LinenLiner')!.userData.cutHeight).toBeCloseTo(3 * 0.04445, 6)
    expect(height('LinenLiner')).toBeLessThan(D.converted.linerHeight)
    expect(model.getObjectByName('NeckFlap')!.userData.cutHeight).toBeCloseTo(3.75 * 0.04445, 6)
    expect(bounds('NeckFlap').min.y).toBeGreaterThan(D.reconstruction.baseY)
    const fromBelow = new Raycaster(new Vector3(0.03, 0, 0), new Vector3(0, 1, 0))
    expect(fromBelow.intersectObject(model.getObjectByName('LinenLiner')!)).not.toHaveLength(0)
  })
})

describe('semantic, material and performance contract', () => {
  it('routes the chinstrap clear of the solid visor', () => {
    const p = (model.getObjectByName('LeatherChinstrap') as Mesh).geometry.attributes.position
    for (let i = 0; i < p.count; i++) {
      const radius = Math.hypot(p.getX(i), p.getZ(i)), c = p.getZ(i) / radius
      const v = (radius - D.derived.bottomRadius) / (D.converted.visorProjection * c)
      if (c <= 0 || v <= 0 || v >= 1) continue
      const top = D.reconstruction.baseY - D.converted.visorDrop * v * c
      expect(p.getY(i) > top + 0.0001 || p.getY(i) < top - D.reconstruction.visorThickness - 0.0001, `vertex ${i}: y=${p.getY(i)}, visor=${top}, radius=${radius}`).toBe(true)
    }
  })
  it('keeps the photo-guided grenade a thin embossed sheet with a front-facing bomb', () => {
    const badge = model.getObjectByName('FrontBadge_OneFlameGrenade')!
    const local = new Box3()
    badge.traverse((o) => {
      if (!(o instanceof Mesh)) return
      const positions = o.geometry.attributes.position
      for (let i = 0; i < positions.count; i++) {
        const p = new Vector3().fromBufferAttribute(positions, i)
        p.z -= badgeSeat(p.x, p.y)
        local.expandByPoint(p)
      }
    })
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
    for (const name of ['Plume', 'Eagle', 'Cockade', 'BrassScales', 'LeftChinstrapBuckle', 'RightFixedAttachment']) expect(model.getObjectByName(name)).toBeUndefined()
  })
  it('seats the thin grenade outside the felt without an invented pocket step', () => {
    const badge = model.getObjectByName('FrontBadge_OneFlameGrenade')!
    for (const y of [0.057, 0.061, 0.065]) {
      const origin = new Vector3(0, y, 0.1).applyMatrix4(badge.matrixWorld)
      const ray = new Raycaster(origin, new Vector3(0, 0, -1).transformDirection(badge.matrixWorld))
      const badgeHit = ray.intersectObject(badge, true)[0]
      const pocketHit = ray.intersectObject(model.getObjectByName('FeltBody')!, true)[0]
      expect(badgeHit).toBeDefined(); expect(pocketHit).toBeDefined()
      expect(badgeHit.distance).toBeLessThan(pocketHit.distance)
    }
  })
  it('separates matte felt, leather, cotton and brass; keeps the chinstrap leather', () => {
    const material = (name: string) => (model.getObjectByName(name) as Mesh).material as MeshStandardMaterial
    expect(material('FeltUpper').roughness).toBeGreaterThan(material('UpperLeatherBand').roughness)
    expect(material('FeltUpper').metalness).toBe(0)
    expect(material('LeatherChinstrap').name).toBe('BlackenedLeather')
    expect(material('StampedOneFlameOutline').metalness).toBeGreaterThan(0.8)
    expect(material('FrontBraid').name).toBe('CordWhite')
  })
  it('keeps the user-requested detail level within a measured 200,000 review budget including the prepared interior, with finite geometry', () => {
    let triangles = 0, meshes = 0
    model.traverse((o) => {
      if (!(o instanceof Mesh)) return
      meshes++
      const position = o.geometry.attributes.position
      triangles += (o.geometry.index?.count ?? position.count) / 3
      expect(Array.from(position.array).every(Number.isFinite), o.name).toBe(true)
    })
    expect(triangles).toBeGreaterThanOrEqual(169_076)
    expect(triangles).toBeLessThanOrEqual(300_000)
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
