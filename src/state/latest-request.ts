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
      if (!(error instanceof DOMException && error.name === 'AbortError')) throw error
      if (value !== undefined) disposeStale(value)
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

