import type { Group, PerspectiveCamera } from 'three'
import type { Exhibit } from '../content/types'
import { bindSurfaceAnchor, projectSurfaceHotspots, type SurfaceAnchor, type ProjectedHotspot } from './hotspotProjection'

export class HotspotSystem {
  private readonly anchors = new Map<string, SurfaceAnchor>()
  private root: Group | null = null
  private exhibit: Exhibit | null = null

  constructor(private readonly publish: (positions: readonly ProjectedHotspot[]) => void) {}

  bind(root: Group, exhibit: Exhibit): void {
    this.clear()
    this.root = root
    this.exhibit = exhibit
    for (const hotspot of exhibit.hotspots) this.anchors.set(hotspot.id, bindSurfaceAnchor(root, hotspot))
  }

  project(camera: PerspectiveCamera, hidden: boolean): void {
    if (!this.root || !this.exhibit || hidden) { this.publish([]); return }
    this.publish(projectSurfaceHotspots(this.root, camera, this.exhibit.hotspots, this.anchors,
      this.exhibit.presentation.hotspotOcclusionTolerance ?? 0.13))
  }

  clear(): void {
    this.anchors.clear()
    this.root = null
    this.exhibit = null
    this.publish([])
  }

  dispose(): void { this.clear() }
}
