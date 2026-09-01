import { describe, expect, it, vi } from 'vitest'
import { LatestRequestCoordinator } from '../src/state/latest-request'

describe('LatestRequestCoordinator', () => {
  it('commits only the newest result and disposes stale data', async () => {
    const coordinator = new LatestRequestCoordinator<string>()
    const commit = vi.fn()
    const dispose = vi.fn()
    let finishFirst: ((value: string) => void) | undefined
    const first = coordinator.run(
      () => new Promise<string>((resolve) => { finishFirst = resolve }),
      commit,
      dispose,
    )
    const second = coordinator.run(async () => 'newest', commit, dispose)
    finishFirst?.('stale')
    await Promise.all([first, second])
    expect(commit).toHaveBeenCalledTimes(1)
    expect(commit).toHaveBeenCalledWith('newest')
    expect(dispose).toHaveBeenCalledWith('stale')
    coordinator.dispose()
  })
})

