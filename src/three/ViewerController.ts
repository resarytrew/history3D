import { ACESFilmicToneMapping, Box3, PCFShadowMap, Scene, SRGBColorSpace, Vector3, WebGLRenderer } from 'three'
import type { Exhibit, Hotspot } from '../content/types'
import { CameraRig } from './CameraRig'
import { LightingRig } from './LightingRig'
import { ModelHost } from './ModelHost'
import { HotspotSystem } from './HotspotSystem'
import { RenderScheduler } from './RenderScheduler'
import { SemanticSceneIndex } from './SemanticSceneIndex'
import { AssemblySystem } from './AssemblySystem'
import { SemanticPresentation, type SemanticDisplayMode } from './SemanticPresentation'
import type { ProjectedHotspot } from './hotspotProjection'
import { resolveSelection, selectionKey, validateAssembly, type AssemblyContext, type DisplayMode, type Selection, type ReferenceView } from '../content/assembly'
import { AssemblyLayoutSolver, snapshotBounds, type BoundsSnapshot } from './AssemblyLayoutSolver'
import { SemanticPicker, SelectionGesture } from './SemanticPicker'
export type { ProjectedHotspot } from './hotspotProjection'

interface ViewerCallbacks {
  readonly onReady: () => void
  readonly onError: (message: string) => void
  readonly onHotspots: (positions: readonly ProjectedHotspot[]) => void
  readonly onSelection?: (selection: Selection) => void
  readonly onAssemblyError?: (message: string) => void
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
  private semanticScene: SemanticSceneIndex | undefined
  private assembly: AssemblySystem | undefined
  private semanticPresentation: SemanticPresentation | undefined
  private context: AssemblyContext = { kind: 'assembled' }
  private selection: Selection = null
  private hover: Selection = null
  private hoverPoint?: { x: number; y: number }
  private readonly picker = new SemanticPicker()
  private readonly gesture = new SelectionGesture()
  private bounds: readonly BoundsSnapshot[] = []
  private reference?: ReferenceView
  private resizeTimer?: ReturnType<typeof setTimeout>
  private semanticMode: SemanticDisplayMode = 'all'

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
    canvas.addEventListener('pointerdown', this.pointerDown)
    window.addEventListener('pointermove', this.pointerMove)
    window.addEventListener('pointerup', this.pointerUp)
    window.addEventListener('pointercancel', this.pointerCancel)
    canvas.addEventListener('pointerleave', this.pointerLeave)
    this.resizeObserver = new ResizeObserver(this.resize)
    this.resizeObserver.observe(canvas.parentElement ?? canvas)
    const workspace = canvas.closest('.viewer-stage')?.querySelector('.layout-workspace')
    if (workspace) this.resizeObserver.observe(workspace)
    this.resize()
  }

  load(exhibit: Exhibit): void {
    if (this.disposed) return
    this.exhibit = exhibit
    this.cameraRig.prepare(exhibit)
    this.lighting.clear(this.canvas)
    this.hotspots.clear()
    this.semanticPresentation?.dispose()
    this.semanticPresentation = undefined
    this.context = { kind: 'assembled' }; this.selection = null; this.hover = null; this.hoverPoint = undefined
    this.gesture.cancel(); this.reference = undefined; this.bounds = []; clearTimeout(this.resizeTimer)
    this.semanticMode = 'all'
    this.semanticScene = undefined
    this.assembly = undefined
    this.canvas.dataset.assemblyContext = 'assembled'
    this.firstFramePending = true
    void this.models.load(exhibit, (loaded) => {
      if (exhibit.semantics) {
        if (exhibit.assembly) validateAssembly(exhibit.assembly, exhibit.semantics)
        this.semanticScene = new SemanticSceneIndex(loaded.root, exhibit.semantics)
        this.assembly = new AssemblySystem(this.semanticScene)
        this.semanticPresentation = new SemanticPresentation(this.semanticScene)
        this.bounds = snapshotBounds(this.semanticScene)
      }
      this.lighting.configure(exhibit, loaded.root, this.canvas)
      if (!exhibit.semantics) this.hotspots.bind(loaded.root, exhibit)
      this.cameraRig.configure(exhibit)
      this.scheduler.invalidate()
    }).catch((error: unknown) => {
      if (!this.disposed) this.callbacks.onError(error instanceof Error ? error.message : 'Не удалось загрузить 3D-модель.')
    })
    this.scheduler.invalidate()
  }

  focusHotspot(hotspot: Hotspot): void {
    const entityId = hotspot.anchor?.entityId ?? hotspot.target?.entityId
    if (entityId && this.semanticPresentation && this.context.kind === 'layout') this.cameraRig.focusPoint(this.semanticPresentation.getWorldPosition(entityId))
    else this.cameraRig.focus(hotspot)
  }
  reset(): void { this.returnReference() }

  setSemanticState(selection: Selection, mode: DisplayMode, context: AssemblyContext): boolean {
    const changed = JSON.stringify(context) !== JSON.stringify(this.context)
    if (changed && !this.applyContext(context)) return false
    this.selection = selection; this.semanticMode = selection ? mode : 'all'
    this.semanticPresentation?.update(selection, this.semanticMode, this.context, this.exhibit?.assembly)
    this.canvas.dataset.selection = selectionKey(selection)
    this.lighting.setModelModified(this.context.kind === 'layout' || this.semanticMode !== 'all')
    this.renderer.shadowMap.needsUpdate = true; this.scheduler.invalidate()
    return true
  }
  private applyContext(context: AssemblyContext): boolean {
    if (!this.assembly || !this.exhibit) return false
    if (context.kind === 'assembled') {
      this.assembly.animateTo({ offsets: new Map() }, performance.now(), window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      this.cameraRig.configure(this.exhibit); this.reference = undefined
    } else {
      const layout = this.exhibit.assembly?.layouts.find(layout => layout.id === context.layoutId)
      if (!layout || !this.exhibit.assembly) return false
      const viewport = this.layoutViewport()
      const result = new AssemblyLayoutSolver().solve({ objects: this.bounds, entities: this.exhibit.semantics!, layout,
        referenceView: this.exhibit.assembly.referenceView, width: viewport.width, height: viewport.height })
      if (!result.ok) { this.callbacks.onAssemblyError?.(result.error); return false }
      this.assembly.animateTo(result.pose, performance.now(), window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      this.reference = result.view; this.showReference(result.view)
      this.canvas.dataset.layoutDiagnostics = result.diagnostics.join(',')
    }
    this.context = context; this.hover = null; this.hoverPoint = undefined; this.semanticPresentation?.setHover(null)
    this.canvas.dataset.assemblyContext = context.kind === 'assembled' ? 'assembled' : context.layoutId
    return true
  }
  private showReference(view: ReferenceView): void {
    const root = this.semanticScene?.root
    root?.updateWorldMatrix(true, false)
    this.cameraRig.showReference(root ? { cameraPosition: root.localToWorld(new Vector3().fromArray(view.cameraPosition)).toArray(), cameraTarget: root.localToWorld(new Vector3().fromArray(view.cameraTarget)).toArray() } : view, this.layoutViewport())
  }
  private layoutViewport() {
    const canvas = this.canvas.getBoundingClientRect()
    const region = this.canvas.closest('.viewer-stage')?.querySelector('.layout-workspace')?.getBoundingClientRect()
    const active = region && region.width > 0 && region.height > 0 ? region : canvas
    return { width: active.width, height: active.height, left: active.left - canvas.left, top: active.top - canvas.top, fullWidth: canvas.width, fullHeight: canvas.height }
  }
  returnReference(): void { if (this.reference) this.showReference(this.reference); else this.cameraRig.reset() }
  focusEntity(id: string): void {
    if (!this.semanticScene) return
    const anchor = this.semanticScene.getEntity(id).focusAnchor
    this.semanticScene.root.updateWorldMatrix(true, true)
    const bounds = new Box3()
    for (const object of this.semanticScene.getSupportingObjects(id)) bounds.expandByObject(object)
    const radius = bounds.isEmpty() ? undefined : bounds.getSize(new Vector3()).length() * (anchor ? .12 : .5)
    this.cameraRig.focusPoint(anchor ? this.semanticScene.getWorldPoint(anchor) : this.semanticScene.getWorldPosition(id), radius)
  }
  private pick(x: number, y: number): Selection {
    if (!this.semanticScene || !this.semanticPresentation || this.lighting.comparing) return null
    const id = this.picker.pick(x, y, this.canvas.getBoundingClientRect(), this.cameraRig.camera, this.semanticScene.root, this.semanticScene, this.semanticPresentation.policy)
    return resolveSelection(id, this.context, this.semanticScene.definitions, this.exhibit?.assembly)
  }
  private readonly pointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    this.gesture.down(event.pointerId, event.clientX, event.clientY, event.pointerType)
    this.pointerLeave()
  }
  private readonly pointerMove = (event: PointerEvent): void => {
    this.gesture.move(event.pointerId, event.clientX, event.clientY)
    if (!this.gesture.active && event.pointerType === 'mouse' && event.target === this.canvas) {
      this.hoverPoint = { x: event.clientX, y: event.clientY }; this.scheduler.invalidate()
    }
  }
  private readonly pointerUp = (event: PointerEvent): void => {
    if (this.gesture.up(event.pointerId, event.clientX, event.clientY) && this.semanticScene) this.callbacks.onSelection?.(this.pick(event.clientX, event.clientY))
  }
  private readonly pointerCancel = (event: PointerEvent): void => { this.gesture.cancel(event.pointerId); this.pointerLeave() }
  private readonly pointerLeave = (): void => {
    this.hoverPoint = undefined; this.hover = null; this.semanticPresentation?.setHover(null); this.canvas.style.cursor = ''; this.scheduler.invalidate()
  }

  setScaleComparison(visible: boolean): void {
    if (visible && this.assembly) { this.assembly.reset(); this.setSemanticState(null, 'all', { kind: 'assembled' }) }
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
    clearTimeout(this.resizeTimer)
    if (this.context.kind === 'layout') this.resizeTimer = setTimeout(() => {
      if (this.applyContext(this.context)) this.setSemanticState(this.selection, this.semanticMode, this.context)
    }, 150)
    this.scheduler.invalidate()
  }

  private readonly render = (time: number): boolean => {
    if (this.disposed) return false
    const moving = this.cameraRig.update(time)
    const assembling = this.assembly?.update(time) ?? false
    this.canvas.dataset.assemblyAnimating = String(assembling)
    if (this.hoverPoint && !this.gesture.active) {
      const point = this.hoverPoint; this.hoverPoint = undefined
      const hover = this.pick(point.x, point.y)
      if (selectionKey(hover) !== selectionKey(this.hover)) { this.hover = hover; this.semanticPresentation?.setHover(hover) }
      this.canvas.style.cursor = hover ? 'pointer' : ''
    }
    this.lighting.update(this.cameraRig.camera, this.exhibit, this.canvas)
    this.renderer.render(this.scene, this.cameraRig.camera)
    if (this.firstFramePending && this.models.root) {
      this.firstFramePending = false
      this.callbacks.onReady()
    }
    if (!this.exhibit?.semantics) this.hotspots.project(this.cameraRig.camera, this.lighting.comparing)
    return moving || assembling
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
    clearTimeout(this.resizeTimer)
    this.canvas.removeEventListener('pointerdown', this.pointerDown)
    window.removeEventListener('pointermove', this.pointerMove)
    window.removeEventListener('pointerup', this.pointerUp)
    window.removeEventListener('pointercancel', this.pointerCancel)
    this.canvas.removeEventListener('pointerleave', this.pointerLeave)
    this.canvas.removeEventListener('webglcontextlost', this.handleContextLost)
    this.cameraRig.dispose()
    this.hotspots.dispose()
    this.semanticPresentation?.dispose()
    this.lighting.dispose()
    this.models.dispose()
    this.renderer.renderLists.dispose()
    this.renderer.dispose()
  }
}
