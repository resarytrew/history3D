import { afterEach, describe, expect, it, vi } from 'vitest'
import { CameraRig } from '../src/three/CameraRig'
import { exhibits } from '../src/content/catalog'

afterEach(() => vi.restoreAllMocks())
describe('CameraRig', () => {
  it('preserves authored framing, instant reduced-motion focus, comparison and resize', () => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    vi.spyOn(window,'matchMedia').mockReturnValue({ ...media,matches:true })
    const invalidate=vi.fn(), rig=new CameraRig(document.createElement('canvas'),invalidate), e=exhibits[4]
    rig.configure(e)
    for(let i=0;i<3;i++)expect(rig.camera.position.toArray()[i]).toBeCloseTo(e.presentation.cameraPosition[i],6)
    rig.resize(.6); expect(rig.camera.zoom).toBeCloseTo(.4)
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
    const rig=new CameraRig(document.createElement('canvas'),vi.fn()), e=exhibits[4]
    rig.configure(e); rig.focus(e.hotspots[0])
    expect(rig.update(460)).toBe(true)
    expect(rig.camera.position.z).toBeGreaterThan(e.hotspots[0].cameraPosition![2])
    rig.update(820); expect(rig.camera.position.z).toBeCloseTo(e.hotspots[0].cameraPosition![2],6)
    expect(rig.update(840)).toBe(false)
    rig.dispose()
  })
})
