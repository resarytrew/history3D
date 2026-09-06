import { Color, DirectionalLight, Group, HemisphereLight, Mesh, MeshBasicMaterial, PlaneGeometry, PMREMGenerator, Scene, Vector3, type WebGLRenderer, type WebGLRenderTarget } from 'three'

export const artifactStudioExposure = 0.95

/** Large reflected panels separated by dark space give black leather readable highlights. */
export function createArtifactEnvironment(renderer: WebGLRenderer): WebGLRenderTarget {
  const room = new Scene()
  room.background = new Color('#121211')
  const panels = [
    { size: [3, 4], position: [-3, 2.5, 4], power: 7 },
    { size: [1.4, 3.5], position: [4, 1.5, 2], power: 3 },
    { size: [2.5, 4], position: [-1, 2.5, -4], power: 5 },
    { size: [4, 2], position: [0, 5, 0], power: 2 },
    { size: [5, 3], position: [0, 1, 5], power: 2 },
  ]
  for (const panel of panels) {
    const material = new MeshBasicMaterial({ color: new Color().setScalar(panel.power), toneMapped: false })
    const mesh = new Mesh(new PlaneGeometry(panel.size[0], panel.size[1]), material)
    mesh.position.fromArray(panel.position); mesh.lookAt(new Vector3()); room.add(mesh)
  }
  const generator = new PMREMGenerator(renderer)
  const target = generator.fromScene(room, 0.025)
  generator.dispose()
  room.traverse((o) => { if (o instanceof Mesh) { o.geometry.dispose(); (o.material as MeshBasicMaterial).dispose() } })
  return target
}

/** Shared by the real viewer and fixed-camera review. Runtime's sun supplies shadows. */
export function createArtifactLights(): Group {
  const group = new Group(); group.name = 'ArtifactStudioLights'
  const hemisphere = new HemisphereLight('#e8e9e6', '#39342b', 0.55)
  const key = new DirectionalLight('#fff4df', 2.1); key.position.set(-3, 4, 5)
  const rim = new DirectionalLight('#e5edff', 1.1); rim.position.set(2, 2, -3)
  group.add(hemisphere, key, rim)
  return group
}
