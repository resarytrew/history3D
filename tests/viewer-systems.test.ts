import { describe, expect, it, vi } from 'vitest'
import { Group, Scene } from 'three'
import { RenderScheduler, type FrameClock } from '../src/three/RenderScheduler'
import { ModelHost } from '../src/three/ModelHost'
import { exhibits } from '../src/content/catalog'
import type { LoadedExhibitModel } from '../src/three/model-runtime'

function clock() {
  let id = 0
  const frames = new Map<number, (time: number) => void>()
  const api: FrameClock = {
    request: (fn) => { frames.set(++id, fn); return id },
    cancel: (handle) => { frames.delete(handle) },
  }
  return { api, frames, tick: (time = 0) => {
    const pending = [...frames.values()]; frames.clear(); pending.forEach(fn => fn(time))
  } }
}

describe('RenderScheduler', () => {
  it('coalesces invalidations and stops requesting frames at rest', () => {
    const c = clock(), render = vi.fn(() => false), scheduler = new RenderScheduler(render, c.api)
    scheduler.invalidate(); scheduler.invalidate()
    expect(c.frames.size).toBe(1)
    c.tick(); expect(render).toHaveBeenCalledTimes(1); expect(c.frames.size).toBe(0)
    c.tick(); expect(render).toHaveBeenCalledTimes(1)
  })
  it('continues motion, preserves invalidation during a frame, pauses and disposes', () => {
    const c = clock(), render = vi.fn(() => true), scheduler = new RenderScheduler(render, c.api)
    scheduler.invalidate(); c.tick(); expect(c.frames.size).toBe(1)
    scheduler.pause(); expect(c.frames.size).toBe(0)
    scheduler.invalidate(); expect(c.frames.size).toBe(0)
    scheduler.resume(); render.mockImplementation(() => { scheduler.invalidate(); return false })
    c.tick(); expect(c.frames.size).toBe(1)
    scheduler.dispose(); scheduler.resume(); expect(c.frames.size).toBe(0)
  })
})

describe('ModelHost', () => {
  it('releases a model exactly once if scene configuration rejects its commit', async () => {
    const scene = new Scene(), root = new Group(), dispose = vi.fn(() => root.removeFromParent())
    const host = new ModelHost(scene, async () => ({ root, dispose }))
    await expect(host.load(exhibits[0], () => { throw new Error('configuration failed') })).rejects.toThrow('configuration failed')
    expect(host.root).toBeNull(); expect(scene.children).toHaveLength(0)
    host.dispose(); expect(dispose).toHaveBeenCalledTimes(1)
  })
  it('aborts replaced loads, drops stale errors and disposes late models', async () => {
    const pending: { resolve: (value: LoadedExhibitModel) => void; reject: (error: Error) => void; signal: AbortSignal }[] = []
    const scene = new Scene()
    const host = new ModelHost(scene, (_, signal) => new Promise((resolve, reject) => pending.push({ resolve, reject, signal })))
    const loaded = () => { const root = new Group(); return { root, dispose: vi.fn(() => root.removeFromParent()) } }
    const first = host.load(exhibits[0], vi.fn()), commit = vi.fn(), second = host.load(exhibits[1], commit)
    expect(pending[0].signal.aborted).toBe(true)
    pending[0].reject(new Error('stale network error')); await expect(first).resolves.toBeUndefined()
    const model = loaded(); pending[1].resolve(model); await second
    expect(host.root).toBe(model.root); expect(scene.children).toContain(model.root)
    const third = host.load(exhibits[0], commit)
    expect(model.dispose).toHaveBeenCalledTimes(1)
    host.dispose(); const late = loaded(); pending[2].resolve(late); await third
    expect(late.dispose).toHaveBeenCalledTimes(1); expect(commit).toHaveBeenCalledTimes(1)
    expect(host.root).toBeNull(); expect(scene.children).toHaveLength(0)
  })
  it('reports an active loading error', async () => {
    const host = new ModelHost(new Scene(), async () => { throw new Error('current failure') })
    await expect(host.load(exhibits[0], vi.fn())).rejects.toThrow('current failure')
    host.dispose()
  })
})
