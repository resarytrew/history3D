import type { Hotspot } from '../content/types'

export interface MuseumState {
  readonly activeExhibitId: string
  readonly selectedHotspot: Hotspot | null
  readonly researchOpen: boolean
  readonly sourcesOpen: boolean
  readonly compareScale: boolean
  readonly liveMessage: string
}

export type MuseumAction =
  | { type: 'selectExhibit'; id: string }
  | { type: 'selectHotspot'; hotspot: Hotspot | null }
  | { type: 'research'; open: boolean }
  | { type: 'sources'; open: boolean }
  | { type: 'compareScale'; visible: boolean }
  | { type: 'announce'; message: string }

export function initialMuseumState(activeExhibitId: string): MuseumState {
  return { activeExhibitId, selectedHotspot: null, researchOpen: false, sourcesOpen: false, compareScale: false, liveMessage: '' }
}

/** Exhibit-scoped state resets atomically; future viewer modes can extend this action boundary. */
export function museumReducer(state: MuseumState, action: MuseumAction): MuseumState {
  switch (action.type) {
    case 'selectExhibit': return state.activeExhibitId === action.id ? state : initialMuseumState(action.id)
    case 'selectHotspot': return { ...state, selectedHotspot: action.hotspot }
    case 'research': return { ...state, researchOpen: action.open }
    case 'sources': return { ...state, sourcesOpen: action.open }
    case 'compareScale': return { ...state, compareScale: action.visible }
    case 'announce': return { ...state, liveMessage: action.message }
  }
}
