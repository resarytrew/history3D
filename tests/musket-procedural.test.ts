import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { Box3, Group, Mesh, PerspectiveCamera, Raycaster, Vector3 } from 'three'
import { createRussianMusket1808 } from '../src/content/exhibits/russian-musket-1808/procedural/createRussianMusket1808'
import { russianMusket1808 } from '../src/content/exhibits/russian-musket-1808/exhibit'
import { musket1808Dimensions as D, photoX as X, photoY as Y } from '../src/content/exhibits/russian-musket-1808/procedural/musket1808Dimensions'
import { bindSurfaceAnchor, projectSurfaceHotspots } from '../src/three/hotspotProjection'
import { disposeObject3D } from '../src/three/dispose'
import { exhibitById, collections } from '../src/content/catalog'
import { loadExhibitModel } from '../src/three/model-runtime'

describe('1808 musket exterior reconstruction', () => {
  let root: Group
  beforeAll(() => { root = createRussianMusket1808(); root.updateMatrixWorld(true) })
  afterAll(() => disposeObject3D(root))
  it('registers a review-only package with resolvable claims and sources', async () => {
    expect(exhibitById.get(russianMusket1808.id)).toBe(russianMusket1808)
    expect(collections.find((c) => c.id === 'russian-empire')?.entries.some((e) => e.exhibitId === russianMusket1808.id)).toBe(true)
    expect(russianMusket1808.status).toBe('reconstruction')
    expect(russianMusket1808.model.developmentOnly).toBe(true)
    const r = russianMusket1808.reconstruction
    const evidence = [...r.known, ...r.inferred, ...r.uncertain, ...r.unknown]
    const sources = russianMusket1808.sources.map((s) => s.id)
    for (const item of evidence) for (const id of item.sourceIds) expect(sources).toContain(id)
    for (const h of russianMusket1808.hotspots) for (const id of h.evidenceIds) expect(evidence.some((e) => e.id === id)).toBe(true)
    for (const fact of r.known) expect(fact.sourceRefs?.length).toBeGreaterThan(0)
    const loaded = await loadExhibitModel(russianMusket1808.model, new AbortController().signal)
    expect(loaded.root.name).toBe('RussianMusket1808'); loaded.dispose()
  })
  it('keeps the photo silhouette and typological barrel dimension distinct from assumed depth', () => {
    const stock = root.getObjectByName('WoodStock')!
    const box = new Box3().setFromObject(root)
    expect(box.getSize(new Vector3()).x).toBeCloseTo(D.reconstruction.displayLength, 2)
    const barrel = new Box3().setFromObject(root.getObjectByName('Barrel')!)
    const breech = new Box3().setFromObject(root.getObjectByName('FacetedBreech')!)
    expect(barrel.max.x - breech.min.x).toBeCloseTo(D.documented.barrelLength, 5)
    // Side rays exercise winding and the reference outline at butt, wrist and fore-end.
    for (const [x, y] of [[177, 656], [308, 622], [790, 602], [1400, 602]]) {
      const ray = new Raycaster(new Vector3(X(x), Y(y), 0.15), new Vector3(0, 0, -1))
      expect(ray.intersectObject(stock).length).toBeGreaterThan(0)
    }
    const belowButt = new Raycaster(new Vector3(X(177), Y(750), 0.15), new Vector3(0, 0, -1))
    expect(belowButt.intersectObject(stock)).toHaveLength(0)
    const back = new Raycaster(new Vector3(X(177), Y(656), -0.15), new Vector3(0, 0, 1))
    expect(back.intersectObject(stock).length).toBeGreaterThan(0)
  })
  it('has finite geometry, separate materials and truthful geometry metrics', () => {
    let triangles = 0
    const materials = new Set<string>()
    root.traverse((o) => {
      if (!(o instanceof Mesh)) return
      const p = o.geometry.getAttribute('position'), n = o.geometry.getAttribute('normal')
      expect(Array.from(p.array).every(Number.isFinite), o.name).toBe(true)
      expect(Array.from(n.array).every(Number.isFinite), o.name).toBe(true)
      triangles += (o.geometry.index?.count ?? p.count) / 3
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) materials.add(m.name)
    })
    expect(triangles).toBe(russianMusket1808.model.kind === 'procedural' ? russianMusket1808.model.approximateTriangles : 0)
    expect(triangles).toBeGreaterThanOrEqual(395_168)
    expect(materials).toEqual(new Set(['OiledBrownWood', 'MaintainedSteel', 'WorkedBrass', 'RecessedSteel', 'GreyFlint', 'FlintWrapping']))
  })
  it('keeps formed bands outside the stock and exposes the flint face', () => {
    for (const [name,px] of [['RearBand',793],['MiddleBand',1225]] as const) {
      const center = new Vector3(X(px),0.23,0)
      for (let i=0;i<12;i++) {
        const direction = new Vector3(0,Math.cos(i*Math.PI/6),Math.sin(i*Math.PI/6))
        const ray = new Raycaster(center.clone().addScaledVector(direction,0.2),direction.negate())
        const band = ray.intersectObject(root.getObjectByName(name)!)[0]
        const stock = ray.intersectObject(root.getObjectByName('WoodStock')!)[0]
        expect(band,`${name} exterior ${i}`).toBeDefined()
        if (stock) expect(stock.distance-band.distance).toBeGreaterThan(0.0001)
      }
    }
    const flintRay = new Raycaster(new Vector3(X(491),Y(560),0.15),new Vector3(0,0,-1))
    expect(flintRay.intersectObject(root.getObjectByName('Flint')!).length).toBeGreaterThan(0)
  })
  it('binds markers to surfaces and hides the right-side labels on the reverse', () => {
    const hotspots = russianMusket1808.hotspots
    const anchors = new Map(hotspots.map((h) => [h.id, bindSurfaceAnchor(root, h)]))
    const camera = new PerspectiveCamera(34, 1.5, 0.001, 10)
    camera.position.fromArray(russianMusket1808.presentation.cameraPosition)
    camera.lookAt(new Vector3().fromArray(russianMusket1808.presentation.cameraTarget)); camera.updateMatrixWorld(true)
    const front = projectSurfaceHotspots(root, camera, hotspots, anchors, 0.00045)
    expect(front.filter((h) => h.visible).map((h) => h.id)).toEqual(hotspots.map((h) => h.id))
    camera.position.set(0, 0.30, -2.1); camera.lookAt(0, 0.22, 0); camera.updateMatrixWorld(true)
    expect(projectSurfaceHotspots(root, camera, hotspots, anchors, 0.00045).every((h) => !h.visible)).toBe(true)
  })
})
