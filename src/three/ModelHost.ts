import type { Scene } from 'three'
import type { Exhibit } from '../content/types'
import { LatestRequestCoordinator } from '../state/latest-request'
import { loadExhibitModel, type LoadedExhibitModel } from './model-runtime'

/** Owns the current model and all in-flight replacements, independently of WebGL. */
export class ModelHost {
  private readonly coordinator = new LatestRequestCoordinator<LoadedExhibitModel>()
  private active: LoadedExhibitModel | null = null
  private disposed = false
  get root() { return this.active?.root ?? null }

  constructor(private readonly scene: Scene, private readonly loader = loadExhibitModel) {}

  async load(exhibit: Exhibit, onLoaded: (model: LoadedExhibitModel) => void): Promise<void> {
    if (this.disposed) return
    this.clear()
    await this.coordinator.run(
      (signal) => this.loader(exhibit.model, signal),
      (loaded) => {
        this.active = loaded
        loaded.root.rotation.y = exhibit.presentation.initialYaw
        this.scene.add(loaded.root)
        try { onLoaded(loaded) }
        catch (error) {
          // The coordinator disposes the rejected commit; never retain its disposed model.
          this.active = null
          loaded.root.removeFromParent()
          throw error
        }
      },
      (stale) => stale.dispose(),
    )
  }

  private clear(): void {
    this.active?.dispose()
    this.active = null
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.coordinator.dispose()
    this.clear()
  }
}
