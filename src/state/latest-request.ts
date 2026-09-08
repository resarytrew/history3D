export class LatestRequestCoordinator<T> {
  private token = 0
  private controller: AbortController | null = null
  private disposed = false

  async run(
    load: (signal: AbortSignal) => Promise<T>,
    commit: (value: T) => void,
    disposeStale: (value: T) => void,
  ): Promise<void> {
    if (this.disposed) throw new Error('Coordinator has been disposed')
    this.controller?.abort()
    const requestToken = ++this.token
    const controller = new AbortController()
    this.controller = controller
    let value: T | undefined
    try {
      value = await load(controller.signal)
      if (this.disposed || requestToken !== this.token || controller.signal.aborted) {
        disposeStale(value)
        return
      }
      commit(value)
    } catch (error) {
      if (value !== undefined) disposeStale(value)
      // Network/parser failures after replacement belong to the old request.
      if (this.disposed || requestToken !== this.token || controller.signal.aborted) return
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
    }
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.token += 1
    this.controller?.abort()
    this.controller = null
  }
}
