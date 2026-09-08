import { describe, expect, it } from 'vitest'
import { initialMuseumState, museumReducer } from '../src/state/museum-state'
import { exhibits } from '../src/content/catalog'

describe('museum state', () => {
  it('resets every exhibit-scoped field in one transition', () => {
    const state = { ...initialMuseumState('old'), selectedHotspot: exhibits[0].hotspots[0], researchOpen: true, sourcesOpen: true, compareScale: true, liveMessage: 'draft' }
    expect(museumReducer(state, { type: 'selectExhibit', id: 'new' })).toEqual(initialMuseumState('new'))
    expect(museumReducer(state, { type: 'selectExhibit', id: 'old' })).toBe(state)
  })
  it('keeps independent panels and comparison updates scoped', () => {
    const state = initialMuseumState('old')
    expect(museumReducer(state, { type: 'research', open: true })).toEqual({ ...state, researchOpen: true })
    expect(museumReducer(state, { type: 'sources', open: true })).toEqual({ ...state, sourcesOpen: true })
    expect(museumReducer(state, { type: 'compareScale', visible: true })).toEqual({ ...state, compareScale: true })
  })
})
