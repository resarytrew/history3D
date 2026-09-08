import { ACESFilmicToneMapping, PCFShadowMap, Scene, SRGBColorSpace, WebGLRenderer } from 'three'
import type { Exhibit, Hotspot } from '../content/types'
import { CameraRig } from './CameraRig'
import { LightingRig } from './LightingRig'
import { ModelHost } from './ModelHost'
import { HotspotSystem } from './HotspotSystem'
import { RenderScheduler } from './RenderScheduler'
import type { ProjectedHotspot } from './hotspotProjection'
export type { ProjectedHotspot } from './hotspotProjection'

interface ViewerCallbacks {
  readonly onReady: () => void
  readonly onError: (message: string) => void
  readonly onHotspots: (positions: readonly ProjectedHotspot[]) => void
}

/** Connects independently owned viewer subsystems to the canvas and React callbacks. */
export class ViewerController {
  private readonly scene = new Scene()
  private readonly renderer: WebGLRenderer
  private readonly cameraRig: CameraRig
  private readonly lighting: LightingRig
  private readonly models: ModelHost
  private readonly hotspots: HotspotSystem
  private readonly scheduler: RenderScheduler
  private readonly resizeObserver: ResizeObserver
  private exhibit: Exhibit | null = null
  private firstFramePending = false
  private disposed = false

  constructor(private readonly canvas: HTMLCanvasElement, private readonly callbacks: ViewerCallbacks) {
    const context = canvas.getContext('webgl2', { alpha: true, antialias: true, powerPreference: 'high-performance' })
    if (!context) throw new Error('Браузер не предоставил WebGL2-контекст.')
    this.renderer = new WebGLRenderer({ canvas, context, alpha: true, antialias: true })
    canvas.dataset.renderer = 'webgl'
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    this.renderer.outputColorSpace = SRGBColorSpace
    this.renderer.toneMapping = ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.08
    this.renderer.shadowMap.enabled = true
    this.renderer.shadowMap.type = PCFShadowMap
    this.renderer.shadowMap.autoUpdate = false
    this.scheduler = new RenderScheduler(this.render)
    this.cameraRig = new CameraRig(canvas, this.scheduler.invalidate)
    this.lighting = new LightingRig(this.scene, this.renderer)
    this.models = new ModelHost(this.scene)
    this.hotspots = new HotspotSystem(callbacks.onHotspots)
    canvas.addEventListener('webglcontextlost', this.handleContextLost)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(canvas.parentElement ?? canvas)
    this.resize()
  }

  load(exhibit: Exhibit): void {
    if (this.disposed) return
    this.exhibit = exhibit
    this.cameraRig.prepare(exhibit)
    this.lighting.clear(this.canvas)
    this.hotspots.clear()
    this.firstFramePending = true
    void this.models.load(exhibit, (loaded) => {
      this.lighting.configure(exhibit, loaded.root, this.canvas)
      this.hotspots.bind(loaded.root, exhibit)
      this.cameraRig.configure(exhibit)
      this.scheduler.invalidate()
    }).catch((error: unknown) => {
      if (!this.disposed) this.callbacks.onError(error instanceof Error ? error.message : 'Не удалось загрузить 3D-модель.')
    })
    this.scheduler.invalidate()
  }

  focusHotspot(hotspot: Hotspot): void { this.cameraRig.focus(hotspot) }
  reset(): void { this.cameraRig.reset() }

  setScaleComparison(visible: boolean): void {
    this.lighting.compare(visible)
    this.cameraRig.compare(visible)
    if (visible) this.callbacks.onHotspots([])
    this.scheduler.invalidate()
  }

  private readonly resize = (): void => {
    const parent = this.canvas.parentElement
    const width = Math.max(1, parent?.clientWidth ?? this.canvas.clientWidth)
    const height = Math.max(1, parent?.clientHeight ?? this.canvas.clientHeight)
    this.renderer.setSize(width, height, false)
    this.cameraRig.resize(width / height)
    this.scheduler.invalidate()
  }

  private readonly render = (time: number): boolean => {
    if (this.disposed) return false
    const moving = this.cameraRig.update(time)
    this.lighting.update(this.cameraRig.camera, this.exhibit, this.canvas)
    this.renderer.render(this.scene, this.cameraRig.camera)
    if (this.firstFramePending && this.models.root) {
      this.firstFramePending = false
      this.callbacks.onReady()
    }
    this.hotspots.project(this.cameraRig.camera, this.lighting.comparing)
    return moving
  }

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault()
    this.scheduler.pause()
    this.callbacks.onError('WebGL-контекст потерян. Перезагрузите экспонат.')
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.scheduler.dispose()
    this.resizeObserver.disconnect()
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.cameraRig.dispose()
    this.hotspots.dispose()
    this.lighting.dispose()
    this.models.dispose()
    this.renderer.renderLists.dispose()
    this.renderer.dispose()
  }
}
