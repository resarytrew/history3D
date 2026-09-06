import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  Color,
  CylinderGeometry,
  DirectionalLight,
  Group,
  HemisphereLight,
  Mesh,
  MeshStandardMaterial,
  PCFShadowMap,
  PMREMGenerator,
  PerspectiveCamera,
  Raycaster,
  Scene,
  ShadowMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector3,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import type { Exhibit, Hotspot } from '../content/types'
import { LatestRequestCoordinator } from '../state/latest-request'
import { disposeObject3D } from './dispose'
import { loadExhibitModel, type LoadedExhibitModel } from './model-runtime'

export interface ProjectedHotspot {
  readonly id: string
  readonly x: number
  readonly y: number
  readonly visible: boolean
}

interface ViewerCallbacks {
  readonly onReady: () => void
  readonly onError: (message: string) => void
  readonly onHotspots: (positions: readonly ProjectedHotspot[]) => void
}

interface CameraTransition {
  readonly startedAt: number
  readonly duration: number
  readonly fromPosition: Vector3
  readonly toPosition: Vector3
  readonly fromTarget: Vector3
  readonly toTarget: Vector3
}

const vectorFromTuple = (tuple: readonly [number, number, number]): Vector3 =>
  new Vector3(tuple[0], tuple[1], tuple[2])

function createRenderer(canvas: HTMLCanvasElement): WebGLRenderer {
  const context = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  })
  if (!context) {
    throw new Error('Браузер не предоставил WebGL2-контекст.')
  }
  return new WebGLRenderer({ canvas, context, alpha: true, antialias: true })
}

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

export class ViewerController {
  private readonly scene = new Scene()
  private readonly camera = new PerspectiveCamera(34, 1, 0.05, 100)
  private readonly renderer: WebGLRenderer
  private readonly environmentTarget: WebGLRenderTarget
  private readonly controls: OrbitControls
  private readonly coordinator = new LatestRequestCoordinator<LoadedExhibitModel>()
  private readonly hotspotRaycaster = new Raycaster()
  private readonly resizeObserver: ResizeObserver
  private readonly scaleFigure = createScaleFigure()
  private readonly groundShadow: Mesh
  private readonly sun: DirectionalLight
  private readonly reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
  private activeModel: LoadedExhibitModel | null = null
  private exhibit: Exhibit | null = null
  private transition: CameraTransition | null = null
  private projectionAt = 0
  private disposed = false
  private firstFramePending = false
  private interactionStartCamera: Vector3 | null = null

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly callbacks: ViewerCallbacks,
  ) {
    this.renderer = createRenderer(canvas)
    canvas.dataset.renderer = 'webgl'
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap

    const roomEnvironment = new RoomEnvironment()
    const environmentGenerator = new PMREMGenerator(this.renderer)
    this.environmentTarget = environmentGenerator.fromScene(roomEnvironment, 0.04)
    this.scene.environment = this.environmentTarget.texture
    roomEnvironment.dispose()
    environmentGenerator.dispose()

    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = !this.reducedMotionQuery.matches
    this.controls.dampingFactor = 0.065
    this.controls.enablePan = false
    this.controls.minPolarAngle = 0.72
    this.controls.maxPolarAngle = 1.56
    this.controls.addEventListener('start', this.handleControlsStart)
    this.controls.addEventListener('change', this.handleControlsChange)

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
    this.scene.add(hemisphere, ambient, sun, fill, this.scaleFigure)

    const shadow = new Mesh(
      new BoxGeometry(7.8, 0.02, 5.4),
      new ShadowMaterial({ color: 0x0d241e, opacity: 0.22 }),
    )
    this.groundShadow = shadow
    shadow.position.y = 0.02
    shadow.receiveShadow = true
    this.scene.add(shadow)

    canvas.addEventListener('webglcontextlost', this.handleContextLost)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(canvas.parentElement ?? canvas)
    this.resize()
    this.renderer.setAnimationLoop(this.render)
  }

  load(exhibit: Exhibit): void {
    this.exhibit = exhibit
    this.transition = null
    this.activeModel?.dispose()
    this.activeModel = null
    this.scaleFigure.visible = false
    this.callbacks.onHotspots([])
    delete this.canvas.dataset.orbitChanged
    this.firstFramePending = true
    void this.coordinator
      .run(
        (signal) => loadExhibitModel(exhibit.model, signal),
        (loaded) => {
          this.activeModel?.dispose()
          this.activeModel = loaded
          loaded.root.rotation.y = exhibit.presentation.initialYaw
          this.scene.add(loaded.root)
          this.configureCamera(exhibit)
        },
        (stale) => stale.dispose(),
      )
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить 3D-модель.'
        this.callbacks.onError(message)
      })
  }

  focusHotspot(hotspot: Hotspot): void {
    const target = vectorFromTuple(hotspot.cameraTarget)
    const destination = hotspot.cameraPosition
      ? vectorFromTuple(hotspot.cameraPosition)
      : target.clone().add(new Vector3(4.4, 1.3, 6.4))
    this.moveCamera(destination, target)
  }

  reset(): void {
    if (!this.exhibit) return
    this.moveCamera(
      vectorFromTuple(this.exhibit.presentation.cameraPosition),
      vectorFromTuple(this.exhibit.presentation.cameraTarget),
    )
  }

  setScaleComparison(visible: boolean): void {
    this.scaleFigure.visible = visible
    if (visible) this.callbacks.onHotspots([])
    this.projectionAt = 0
    const comparison = this.exhibit?.presentation.scaleComparison
    if (comparison && this.exhibit) {
      this.controls.maxDistance = visible ? vectorFromTuple(comparison.cameraPosition).length() * 1.2 : this.exhibit.presentation.maxDistance
      if (visible) this.moveCamera(vectorFromTuple(comparison.cameraPosition), vectorFromTuple(comparison.cameraTarget))
      else this.reset()
    }
  }

  private configureCamera(exhibit: Exhibit): void {
    const sceneScale = exhibit.presentation.sceneScale ?? 1
    this.groundShadow.scale.setScalar(sceneScale)
    this.groundShadow.position.y = 0.02 * sceneScale
    this.sun.shadow.camera.left = -7 * sceneScale
    this.sun.shadow.camera.right = 7 * sceneScale
    this.sun.shadow.camera.top = 10 * sceneScale
    this.sun.shadow.camera.bottom = -2 * sceneScale
    this.sun.shadow.camera.updateProjectionMatrix()
    this.scaleFigure.position.copy(vectorFromTuple(exhibit.presentation.scaleComparison?.figurePosition ?? [-2.15, 0.08, 0.72]))
    this.camera.near = Math.min(0.05, exhibit.presentation.minDistance / 20)
    this.camera.updateProjectionMatrix()
    this.camera.position.copy(vectorFromTuple(exhibit.presentation.cameraPosition))
    this.controls.target.copy(vectorFromTuple(exhibit.presentation.cameraTarget))
    this.controls.minDistance = exhibit.presentation.minDistance
    this.controls.maxDistance = exhibit.presentation.maxDistance
    this.controls.update()
  }

  private moveCamera(position: Vector3, target: Vector3): void {
    if (this.reducedMotionQuery.matches) {
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.controls.update()
      this.transition = null
      return
    }
    this.transition = {
      startedAt: performance.now(),
      duration: 720,
      fromPosition: this.camera.position.clone(),
      toPosition: position,
      fromTarget: this.controls.target.clone(),
      toTarget: target,
    }
  }

  private readonly resize = (): void => {
    const parent = this.canvas.parentElement
    const width = Math.max(1, parent?.clientWidth ?? this.canvas.clientWidth)
    const height = Math.max(1, parent?.clientHeight ?? this.canvas.clientHeight)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  private readonly render = (time: number): void => {
    if (this.disposed) return
    if (this.transition) {
      const raw = Math.min(1, (time - this.transition.startedAt) / this.transition.duration)
      const eased = 1 - Math.pow(1 - raw, 3)
      this.camera.position.lerpVectors(this.transition.fromPosition, this.transition.toPosition, eased)
      this.controls.target.lerpVectors(this.transition.fromTarget, this.transition.toTarget, eased)
      if (raw >= 1) this.transition = null
    }
    this.controls.update()
    this.renderer.render(this.scene, this.camera)
    if (this.firstFramePending && this.activeModel) {
      this.firstFramePending = false
      this.callbacks.onReady()
    }
    if (time - this.projectionAt > 80) {
      this.projectionAt = time
      this.publishHotspots()
    }
  }

  private publishHotspots(): void {
    if (!this.exhibit || !this.activeModel || this.scaleFigure.visible) return
    const positions = this.exhibit.hotspots.map((hotspot) => {
      const world = vectorFromTuple(hotspot.position)
      this.activeModel?.root.localToWorld(world)
      const cameraToAnchor = world.clone().sub(this.camera.position)
      const anchorDistance = cameraToAnchor.length()
      this.hotspotRaycaster.set(this.camera.position, cameraToAnchor.normalize())
      const firstHit = this.hotspotRaycaster.intersectObject(this.activeModel!.root, true)[0]
      const occluded = Boolean(firstHit && firstHit.distance < anchorDistance - (this.exhibit!.presentation.hotspotOcclusionTolerance ?? 0.13))
      const projected = world.clone().project(this.camera)
      return {
        id: hotspot.id,
        x: (projected.x * 0.5 + 0.5) * 100,
        y: (-projected.y * 0.5 + 0.5) * 100,
        visible: !occluded && projected.z < 1 && Math.abs(projected.x) < 1.1 && Math.abs(projected.y) < 1.1,
      }
    })
    this.callbacks.onHotspots(positions)
  }

  private readonly handleControlsStart = (): void => {
    this.interactionStartCamera = this.camera.position.clone()
  }

  private readonly handleControlsChange = (): void => {
    if (this.interactionStartCamera && this.camera.position.distanceToSquared(this.interactionStartCamera) > 0.0001) {
      this.canvas.dataset.orbitChanged = 'true'
    }
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault()
    this.callbacks.onError('WebGL-контекст потерян. Перезагрузите экспонат.')
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.coordinator.dispose()
    this.renderer.setAnimationLoop(null)
    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.controls.removeEventListener('start', this.handleControlsStart)
    this.controls.removeEventListener('change', this.handleControlsChange)
    this.controls.dispose()
    this.activeModel?.dispose()
    this.activeModel = null
    disposeObject3D(this.scene, this.renderer)
    this.environmentTarget.dispose()
    this.renderer.dispose()
  }
}
