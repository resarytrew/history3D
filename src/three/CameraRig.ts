import { PerspectiveCamera, Vector3 } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Exhibit, Hotspot } from '../content/types'
import type { ReferenceView } from '../content/assembly'

const vector = (tuple: readonly [number, number, number]) => new Vector3(...tuple)
interface Transition {
  startedAt: number
  fromPosition: Vector3
  toPosition: Vector3
  fromTarget: Vector3
  toTarget: Vector3
}
export interface LayoutViewport { width: number; height: number; left: number; top: number; fullWidth: number; fullHeight: number }

export class CameraRig {
  readonly camera = new PerspectiveCamera(34, 1, 0.05, 100)
  private readonly controls: OrbitControls
  private readonly motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  private exhibit: Exhibit | null = null
  private transition: Transition | null = null
  private interactionStart: Vector3 | null = null

  constructor(private readonly canvas: HTMLCanvasElement, private readonly invalidate: () => void) {
    this.controls = new OrbitControls(this.camera, canvas)
    this.controls.enableDamping = !this.motion.matches
    this.controls.dampingFactor = 0.065
    this.controls.enablePan = false
    this.controls.zoomToCursor = true
    this.controls.minPolarAngle = 0.72
    this.controls.maxPolarAngle = 1.56
    this.controls.addEventListener('start', this.handleStart)
    this.controls.addEventListener('change', this.handleChange)
    this.motion.addEventListener('change', this.handleMotion)
  }

  prepare(exhibit: Exhibit): void {
    this.clearDamping()
    this.exhibit = exhibit
    this.transition = null
    this.interactionStart = null
    delete this.canvas.dataset.orbitChanged
  }

  configure(exhibit: Exhibit): void {
    this.prepare(exhibit)
    const p = exhibit.presentation
    this.controls.minPolarAngle = p.polarAngleRange?.[0] ?? 0.72
    this.controls.maxPolarAngle = p.polarAngleRange?.[1] ?? 1.56
    this.controls.minDistance = p.minDistance
    this.controls.maxDistance = p.maxDistance
    this.camera.near = Math.min(0.05, p.minDistance / 20)
    this.camera.clearViewOffset()
    this.resize(this.camera.aspect)
    this.camera.position.copy(vector(p.cameraPosition))
    this.controls.target.copy(vector(p.cameraTarget))
    this.controls.update()
    this.invalidate()
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect
    const reference = this.exhibit?.presentation.referenceAspect
    this.camera.zoom = reference ? Math.min(1, aspect / reference) : 1
    this.camera.updateProjectionMatrix()
  }

  focus(hotspot: Hotspot): void {
    const target = vector(hotspot.cameraTarget)
    this.move(hotspot.cameraPosition ? vector(hotspot.cameraPosition) : target.clone().add(new Vector3(4.4, 1.3, 6.4)), target)
  }

  focusPoint(target: Vector3, radius?: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target)
    if (radius && radius > 0) {
      const halfFov = Math.atan(Math.tan(this.camera.fov * Math.PI / 360) / this.camera.zoom)
      const distance = radius / Math.sin(halfFov) * 1.2
      offset.setLength(Math.max(this.controls.minDistance, Math.min(this.controls.maxDistance, distance)))
    }
    this.move(target.clone().add(offset), target)
  }

  reset(): void {
    if (this.exhibit) this.move(vector(this.exhibit.presentation.cameraPosition), vector(this.exhibit.presentation.cameraTarget))
  }

  showReference(view: ReferenceView, viewport?: LayoutViewport): void {
    this.clearDamping()
    this.transition = null
    this.camera.clearViewOffset()
    this.camera.zoom = viewport ? viewport.height / viewport.fullHeight : 1
    if (viewport) this.camera.setViewOffset(viewport.fullWidth, viewport.fullHeight,
      viewport.fullWidth / 2 - (viewport.left + viewport.width / 2),
      viewport.fullHeight / 2 - (viewport.top + viewport.height / 2), viewport.fullWidth, viewport.fullHeight)
    this.camera.updateProjectionMatrix()
    this.controls.maxDistance = Math.max(this.exhibit?.presentation.maxDistance ?? 3, vector(view.cameraPosition).distanceTo(vector(view.cameraTarget)) * 4)
    this.camera.position.copy(vector(view.cameraPosition)); this.controls.target.copy(vector(view.cameraTarget))
    this.controls.update(); this.invalidate()
  }

  private clearDamping(): void {
    const damping = this.controls.enableDamping
    this.controls.enableDamping = false; this.controls.update(); this.controls.enableDamping = damping
  }

  compare(visible: boolean): void {
    const p = this.exhibit?.presentation
    if (!p?.scaleComparison) return
    this.controls.maxDistance = visible ? vector(p.scaleComparison.cameraPosition).length() * 1.2 : p.maxDistance
    if (visible) this.move(vector(p.scaleComparison.cameraPosition), vector(p.scaleComparison.cameraTarget))
    else this.reset()
  }

  private move(position: Vector3, target: Vector3): void {
    if (this.motion.matches) {
      this.camera.position.copy(position)
      this.controls.target.copy(target)
      this.controls.update()
      this.transition = null
    } else {
      this.transition = { startedAt: performance.now(), fromPosition: this.camera.position.clone(),
        toPosition: position, fromTarget: this.controls.target.clone(), toTarget: target }
    }
    this.invalidate()
  }

  /** Returns true only while a transition or controls damping needs another frame. */
  update(time: number): boolean {
    if (this.transition) {
      const t = this.transition
      const raw = Math.min(1, (time - t.startedAt) / 720), eased = 1 - Math.pow(1 - raw, 3)
      this.camera.position.lerpVectors(t.fromPosition, t.toPosition, eased)
      this.controls.target.lerpVectors(t.fromTarget, t.toTarget, eased)
      if (raw >= 1) this.transition = null
    }
    const changed = this.controls.update()
    return this.transition !== null || changed
  }

  private readonly handleStart = (): void => {
    this.transition = null
    this.interactionStart = this.camera.position.clone()
  }

  private readonly handleChange = (): void => {
    if (this.interactionStart && this.camera.position.distanceToSquared(this.interactionStart) > 0.0001) this.canvas.dataset.orbitChanged = 'true'
    this.invalidate()
  }

  private readonly handleMotion = (): void => {
    this.controls.enableDamping = !this.motion.matches
    if (this.motion.matches && this.transition) this.move(this.transition.toPosition, this.transition.toTarget)
    this.invalidate()
  }

  dispose(): void {
    this.motion.removeEventListener('change', this.handleMotion)
    this.controls.removeEventListener('start', this.handleStart)
    this.controls.removeEventListener('change', this.handleChange)
    this.controls.dispose()
  }
}
