import { AmbientLight, BoxGeometry, Color, CylinderGeometry, DirectionalLight, Group, HemisphereLight, Mesh, MeshStandardMaterial, PMREMGenerator, Scene, ShadowMaterial, SphereGeometry, Vector3, type WebGLRenderTarget, type WebGLRenderer, type PerspectiveCamera } from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Exhibit } from '../content/types'
import { artifactStudioExposure, createArtifactEnvironment, createArtifactLights } from './artifactStudio'
import { createContactShadow } from './contactShadow'
import { disposeObject3D } from './dispose'
const vectorFromTuple = (tuple: readonly [number, number, number]) => new Vector3(...tuple)
function createScaleFigure(): Group {
  const group = new Group()
  group.name = 'scale-figure'
  const material = new MeshStandardMaterial({ color: 0x173f34, roughness: 0.78 })
  const head = new Mesh(new SphereGeometry(0.12, 16, 12), material)
  head.position.y = 1.63
  const torso = new Mesh(new CylinderGeometry(0.16, 0.22, 0.72, 12), material)
  torso.position.y = 1.12
  const leftLeg = new Mesh(new CylinderGeometry(0.075, 0.065, 0.72, 10), material)
  leftLeg.position.set(-0.09, 0.42, 0)
  const rightLeg = leftLeg.clone()
  rightLeg.position.x = 0.09
  group.add(head, torso, leftLeg, rightLeg)
  group.traverse((object) => {
    if (object instanceof Mesh) object.castShadow = true
  })
  group.position.set(-2.15, 0.08, 0.72)
  group.visible = false
  return group
}


export class LightingRig {
  private readonly environmentTarget: WebGLRenderTarget
  private artifactEnvironment: WebGLRenderTarget | null = null
  private readonly artifactLights = createArtifactLights()
  private readonly defaultLights = new Group()
  private readonly scaleFigure = createScaleFigure()
  private readonly groundShadow: Mesh
  private readonly sun: DirectionalLight
  private contactShadow: ReturnType<typeof createContactShadow> | null = null
  get comparing() { return this.scaleFigure.visible }
  constructor(private readonly scene: Scene, private readonly renderer: WebGLRenderer) {
    const roomEnvironment = new RoomEnvironment()
    const environmentGenerator = new PMREMGenerator(this.renderer)
    this.environmentTarget = environmentGenerator.fromScene(roomEnvironment, 0.04)
    this.scene.environment = this.environmentTarget.texture
    roomEnvironment.dispose()
    environmentGenerator.dispose()

    const hemisphere = new HemisphereLight(new Color(0xc9e4f2), new Color(0x6f6653), 1.55)
    const ambient = new AmbientLight(new Color(0xfff4df), 0.58)
    const sun = new DirectionalLight(new Color(0xffe8c4), 4.1)
    this.sun = sun
    sun.position.set(8, 11, 7)
    sun.castShadow = true
    sun.shadow.mapSize.set(1536, 1536)
    sun.shadow.camera.left = -7
    sun.shadow.camera.right = 7
    sun.shadow.camera.top = 10
    sun.shadow.camera.bottom = -2
    const fill = new DirectionalLight(new Color(0xb8d5e5), 1.15)
    fill.position.set(-6, 5, 4)
    this.defaultLights.add(hemisphere, ambient, fill)
    this.artifactLights.visible = false
    this.scene.add(this.defaultLights, this.artifactLights, sun, this.scaleFigure)

    const shadow = new Mesh(
      new BoxGeometry(7.8, 0.02, 5.4),
      new ShadowMaterial({ color: 0x0d241e, opacity: 0.22 }),
    )
    this.groundShadow = shadow
    shadow.position.y = 0.02
    shadow.receiveShadow = true
    this.scene.add(shadow)

  }
  configure(exhibit: Exhibit, root: Group, canvas: HTMLCanvasElement): void {
    this.renderer.shadowMap.needsUpdate = true
    const studio = exhibit.presentation.lighting === 'artifact-studio'
    canvas.dataset.lighting = studio ? 'artifact-studio' : 'default'
    if (studio) this.artifactEnvironment ??= createArtifactEnvironment(this.renderer)
    this.scene.environment = studio ? this.artifactEnvironment!.texture : this.environmentTarget.texture
    this.scene.environmentIntensity = 1
    this.defaultLights.visible = !studio
    this.artifactLights.visible = studio
    this.sun.intensity = studio ? 0.35 : 4.1
    this.renderer.toneMappingExposure = studio ? artifactStudioExposure : 1.08
    const sceneScale = exhibit.presentation.sceneScale ?? 1
    this.groundShadow.scale.setScalar(sceneScale)
    this.groundShadow.position.y = 0.02 * sceneScale
    this.sun.shadow.camera.left = -7 * sceneScale
    this.sun.shadow.camera.right = 7 * sceneScale
    this.sun.shadow.camera.top = 10 * sceneScale
    this.sun.shadow.camera.bottom = -2 * sceneScale
    this.sun.shadow.camera.updateProjectionMatrix()
    this.scaleFigure.position.copy(vectorFromTuple(exhibit.presentation.scaleComparison?.figurePosition ?? [-2.15, 0.08, 0.72]))

    if (exhibit.presentation.contactShadow) {
      this.contactShadow = createContactShadow(this.renderer, root)
      this.scene.add(this.contactShadow.mesh)
    }
  }
  clear(canvas: HTMLCanvasElement): void {
    this.contactShadow?.dispose()
    this.contactShadow = null
    this.scaleFigure.visible = false
    delete canvas.dataset.contactShadow
  }
  compare(visible: boolean): void {
    this.scaleFigure.visible = visible
    this.renderer.shadowMap.needsUpdate = true
  }
  update(camera: PerspectiveCamera, exhibit: Exhibit | null, canvas: HTMLCanvasElement): void {
    this.groundShadow.visible = !this.contactShadow && (exhibit?.presentation.lighting !== 'artifact-studio' || camera.position.y > this.groundShadow.position.y)
    if (this.contactShadow) {
      this.contactShadow.mesh.visible = !this.comparing && camera.position.y > this.contactShadow.mesh.position.y
      canvas.dataset.contactShadow = this.contactShadow.mesh.visible ? 'visible' : 'hidden'
    }
  }
  dispose(): void {
    this.contactShadow?.dispose()
    for (const object of [this.scaleFigure, this.groundShadow, this.defaultLights, this.artifactLights, this.sun]) disposeObject3D(object)
    this.sun.shadow.dispose()
    this.scene.environment = null
    this.environmentTarget.dispose()
    this.artifactEnvironment?.dispose()
  }
}
