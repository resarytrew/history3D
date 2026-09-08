export interface FrameClock {
  request(callback: (time: number) => void): number
  cancel(handle: number): void
}

/** A single pending frame; the client requests continuation only while motion settles. */
export class RenderScheduler {
  private handle: number | null = null
  private stopped = false
  private disposed = false

  constructor(
    private readonly frame: (time: number) => boolean,
    private readonly clock: FrameClock = {
      request: (callback) => requestAnimationFrame(callback),
      cancel: (handle) => cancelAnimationFrame(handle),
    },
  ) {}

  readonly invalidate = (): void => {
    if (this.disposed || this.stopped || this.handle !== null) return
    this.handle = this.clock.request(this.tick)
  }

  private readonly tick = (time: number): void => {
    this.handle = null
    if (this.disposed || this.stopped) return
    if (this.frame(time)) this.invalidate()
  }

  pause(): void {
    this.stopped = true
    if (this.handle !== null) this.clock.cancel(this.handle)
    this.handle = null
  }

  resume(): void {
    this.stopped = false
    this.invalidate()
  }

  dispose(): void {
    this.pause()
    this.disposed = true
  }
}
