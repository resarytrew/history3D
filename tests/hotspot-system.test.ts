import { describe, expect, it, vi } from 'vitest'
import { BoxGeometry, Group, Mesh, MeshBasicMaterial, PerspectiveCamera } from 'three'
import { exhibits } from '../src/content/catalog'
import { HotspotSystem } from '../src/three/HotspotSystem'
import { disposeObject3D } from '../src/three/dispose'

describe('HotspotSystem', () => {
  it('binds a named surface, hides comparison markers, replaces and clears owned anchors', () => {
    const root = new Group(), mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    mesh.name = 'surface'; root.add(mesh)
    const exhibit = { ...exhibits[0], hotspots: [{ ...exhibits[0].hotspots[0], position: [0, 0, .45] as const,
      surface: { objectName: 'surface', normal: [0, 0, 1] as const, searchDistance: .2 } }] }
    const camera = new PerspectiveCamera(34, 1, .01, 10); camera.position.z = 3; camera.updateMatrixWorld(true)
    const publish = vi.fn(), system = new HotspotSystem(publish)
    system.bind(root, exhibit); system.project(camera, false)
    expect(publish).toHaveBeenLastCalledWith([{ id: exhibit.hotspots[0].id, x: 50, y: 50, visible: true }])
    system.project(camera, true); expect(publish).toHaveBeenLastCalledWith([])
    system.bind(root, { ...exhibit, hotspots: [] }); system.project(camera, false)
    expect(publish).toHaveBeenLastCalledWith([])
    system.dispose(); system.project(camera, false); expect(publish).toHaveBeenLastCalledWith([])
    disposeObject3D(root)
  })
})
