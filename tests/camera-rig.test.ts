import { afterEach, describe, expect, it, vi } from 'vitest'
import { CameraRig } from '../src/three/CameraRig'
import { russianPistol1798 as pistol } from '../src/content/exhibits/russian-pistol-1798-1804/exhibit'
import { PerspectiveCamera, Vector3 } from 'three'

afterEach(() => vi.restoreAllMocks())
describe('CameraRig', () => {
  it('projects a safe diagram into a full-screen canvas and accepts wheel zoom beyond that diagram', () => {
    const canvas = document.createElement('canvas')
    vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({ x: 0, y: 0, left: 0, top: 0, right: 1800, bottom: 1000, width: 1800, height: 1000, toJSON() {} })
    const rig = new CameraRig(canvas, vi.fn())
    rig.configure(pistol); rig.resize(1.8)
    const view = { cameraPosition: [0, .5, 1] as const, cameraTarget: [0, 0, 0] as const }
    const viewport = { fullWidth: 1800, fullHeight: 1000, left: 280, top: 100, width: 1120, height: 750 }
    rig.showReference(view, viewport)
    const reference = new PerspectiveCamera(34, viewport.width / viewport.height, .0001, 1000)
    reference.position.fromArray(view.cameraPosition); reference.lookAt(0, 0, 0); reference.updateMatrixWorld(true)
    rig.camera.updateMatrixWorld(true)
    for (const point of [new Vector3(0, 0, 0), new Vector3(.12, .04, .02), new Vector3(-.08, -.1, -.05)]) {
      const expected = point.clone().project(reference), actual = point.clone().project(rig.camera)
      expect((actual.x + 1) * 900).toBeCloseTo(viewport.left + (expected.x + 1) * viewport.width / 2, 5)
      expect((1 - actual.y) * 500).toBeCloseTo(viewport.top + (1 - expected.y) * viewport.height / 2, 5)
    }
    const before = rig.camera.position.clone()
    canvas.dispatchEvent(new WheelEvent('wheel', { clientX: 900, clientY: 40, deltaY: -600, cancelable: true }))
    rig.update(performance.now())
    expect(rig.camera.position.distanceTo(before)).toBeGreaterThan(.01)
    rig.configure(pistol)
    expect(rig.camera.view?.enabled).not.toBe(true)
    rig.dispose()
  })
  it('preserves authored framing, instant reduced-motion focus, comparison and resize', () => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    vi.spyOn(window,'matchMedia').mockReturnValue({ ...media,matches:true })
    const invalidate=vi.fn(), rig=new CameraRig(document.createElement('canvas'),invalidate), e=pistol
    rig.configure(e)
    for(let i=0;i<3;i++)expect(rig.camera.position.toArray()[i]).toBeCloseTo(e.presentation.cameraPosition[i],6)
    rig.resize(.6); expect(rig.camera.zoom).toBeCloseTo(.4)
    rig.showReference({ cameraPosition: [0, .08, 1], cameraTarget: [0, .08, 0] }); expect(rig.camera.zoom).toBe(1)
    rig.configure(e); rig.resize(.6); expect(rig.camera.zoom).toBeCloseTo(.4)
    rig.focus(e.hotspots[0])
    for(let i=0;i<3;i++)expect(rig.camera.position.toArray()[i]).toBeCloseTo(e.hotspots[0].cameraPosition![i],6)
    rig.compare(true); expect(rig.camera.position.z).toBeCloseTo(e.presentation.scaleComparison!.cameraPosition[2],6)
    rig.compare(false); expect(rig.camera.position.z).toBeCloseTo(e.presentation.cameraPosition[2],6)
    expect(invalidate).toHaveBeenCalled(); rig.dispose()
  })
  it('interpolates motion, completes it, and settles without perpetual updates', () => {
    const media=window.matchMedia('(prefers-reduced-motion: reduce)')
    vi.spyOn(window,'matchMedia').mockReturnValue({ ...media,matches:false })
    vi.spyOn(performance,'now').mockReturnValue(100)
    const rig=new CameraRig(document.createElement('canvas'),vi.fn()), e=pistol
    rig.configure(e); rig.focus(e.hotspots[0])
    expect(rig.update(460)).toBe(true)
    expect(rig.camera.position.z).toBeGreaterThan(e.hotspots[0].cameraPosition![2])
    rig.update(820); expect(rig.camera.position.z).toBeCloseTo(e.hotspots[0].cameraPosition![2],6)
    expect(rig.update(840)).toBe(false)
    rig.dispose()
  })
})
