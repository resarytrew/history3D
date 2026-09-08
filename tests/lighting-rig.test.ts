import { describe, expect, it, vi } from 'vitest'
import { Group, PerspectiveCamera, Scene, Texture, type WebGLRenderer } from 'three'
import { exhibits } from '../src/content/catalog'
import { LightingRig } from '../src/three/LightingRig'
import { createContactShadow } from '../src/three/contactShadow'
import { createArtifactEnvironment } from '../src/three/artifactStudio'

vi.mock('three', async importOriginal => {
  const three = await importOriginal<typeof import('three')>()
  return { ...three, PMREMGenerator: class {
    fromScene() { return { texture: new three.Texture(), dispose: vi.fn() } }
    dispose() {}
  } }
})
vi.mock('../src/three/artifactStudio', async importOriginal => {
  const original = await importOriginal<typeof import('../src/three/artifactStudio')>()
  return { ...original, createArtifactEnvironment: vi.fn(() => ({ texture: new Texture(), dispose: vi.fn() })) }
})
vi.mock('../src/three/contactShadow', () => ({
  createContactShadow: vi.fn(() => { const mesh = new Group(); return { mesh, dispose: vi.fn(() => mesh.removeFromParent()) } }),
}))

describe('LightingRig', () => {
  it('reuses studio environment and owns comparison, underside shadow and disposal', () => {
    const scene = new Scene(), renderer = { shadowMap: { needsUpdate: false }, toneMappingExposure: 0 } as WebGLRenderer
    const rig = new LightingRig(scene, renderer), canvas = document.createElement('canvas'), root = new Group()
    const exhibit = { ...exhibits[0], presentation: { ...exhibits[0].presentation, lighting: 'artifact-studio' as const, contactShadow: true } }
    rig.configure(exhibit, root, canvas)
    expect(canvas.dataset.lighting).toBe('artifact-studio')
    const contact = vi.mocked(createContactShadow).mock.results[0].value
    const environment = vi.mocked(createArtifactEnvironment).mock.results[0].value
    const camera = new PerspectiveCamera(); camera.position.y = 1
    rig.update(camera, exhibit, canvas); expect(canvas.dataset.contactShadow).toBe('visible')
    rig.compare(true); rig.update(camera, exhibit, canvas)
    expect(rig.comparing).toBe(true); expect(canvas.dataset.contactShadow).toBe('hidden')
    rig.compare(false); camera.position.y = -1; rig.update(camera, exhibit, canvas)
    expect(canvas.dataset.contactShadow).toBe('hidden')
    rig.clear(canvas); expect(contact.dispose).toHaveBeenCalledTimes(1)
    rig.configure(exhibit, root, canvas); expect(createArtifactEnvironment).toHaveBeenCalledTimes(1)
    rig.dispose(); expect(environment.dispose).toHaveBeenCalledTimes(1)
    expect(scene.environment).toBeNull(); expect(scene.children).toHaveLength(0)
  })
})
