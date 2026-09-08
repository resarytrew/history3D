import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { readExhibitUrl, writeExhibitUrl } from '../src/state/exhibit-url'
import { useMuseumController } from '../src/state/useMuseumController'

describe('exhibit URL state', () => {
  it('preserves unrelated parameters and existing path/hash links', () => {
    const url = new URL('https://museum.example/gallery?campaign=school&mode=future#details')
    expect(writeExhibitUrl(url, 'helmet')).toBe('/gallery?campaign=school&mode=future&exhibit=helmet#details')
    expect(readExhibitUrl(url, () => false, 'default')).toBe('default')
  })
  it('opens deep links, replaces invalid ids and avoids duplicate history entries', () => {
    window.history.replaceState({ preserved: true }, '', '/?exhibit=russian-pistol-1798-1804&campaign=school#view')
    const { result, unmount } = renderHook(useMuseumController)
    expect(result.current.activeExhibitId).toBe('russian-pistol-1798-1804')
    const length = window.history.length
    act(() => result.current.selectExhibit('russian-pistol-1798-1804'))
    expect(window.history.length).toBe(length)
    act(() => result.current.selectExhibit('russian-shako-1808'))
    expect(window.location.search).toContain('exhibit=russian-shako-1808')
    expect(window.location.search).toContain('campaign=school'); expect(window.location.hash).toBe('#view')
    expect(window.history.state).toEqual({ preserved: true })
    unmount()
    window.history.replaceState(null, '', '/?exhibit=not-found')
    const next = renderHook(useMuseumController)
    expect(next.result.current.activeExhibitId).toBe('pokrov-na-nerli')
    expect(window.location.search).toBe('?exhibit=pokrov-na-nerli')
  })
  it('restores the exhibit and clears panels/comparison on popstate', () => {
    const { result } = renderHook(useMuseumController)
    act(() => { result.current.selectExhibit('russian-shako-1808'); result.current.setResearchOpen(true); result.current.setSourcesOpen(true); result.current.setCompareScale(true) })
    act(() => { window.history.replaceState(null, '', '/?exhibit=ivan-iv-helmet'); window.dispatchEvent(new PopStateEvent('popstate')) })
    expect(result.current.activeExhibitId).toBe('ivan-iv-helmet')
    expect(result.current.researchOpen).toBe(false); expect(result.current.sourcesOpen).toBe(false); expect(result.current.compareScale).toBe(false)
  })
})
