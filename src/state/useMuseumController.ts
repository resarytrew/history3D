import { useCallback, useEffect, useReducer } from 'react'
import { collections, getExhibit } from '../content/catalog'
import type { Hotspot } from '../content/types'
import { initialMuseumState, museumReducer } from './museum-state'
import { readExhibitUrl, writeExhibitUrl } from './exhibit-url'

const readLocation = () => readExhibitUrl(new URL(window.location.href), id => !!getExhibit(id), collections[0].defaultExhibitId)

export function useMuseumController() {
  const [state, dispatch] = useReducer(museumReducer, undefined, () => initialMuseumState(readLocation()))
  useEffect(() => {
    const normalizeLocation = () => {
      const id = readLocation(), url = new URL(window.location.href)
      const next = writeExhibitUrl(url, id)
      if (`${url.pathname}${url.search}${url.hash}` !== next) window.history.replaceState(window.history.state, '', next)
      return id
    }
    normalizeLocation()
    const onPopState = () => dispatch({ type: 'selectExhibit', id: normalizeLocation() })
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])
  const selectExhibit = useCallback((id: string) => {
    if (!getExhibit(id)) return
    const url = new URL(window.location.href), next = writeExhibitUrl(url, id)
    if (`${url.pathname}${url.search}${url.hash}` !== next) window.history.pushState(window.history.state, '', next)
    dispatch({ type: 'selectExhibit', id })
  }, [])
  const setSelectedHotspot = useCallback((hotspot: Hotspot | null) => dispatch({ type: 'selectHotspot', hotspot }), [])
  const setResearchOpen = useCallback((open: boolean) => dispatch({ type: 'research', open }), [])
  const setSourcesOpen = useCallback((open: boolean) => dispatch({ type: 'sources', open }), [])
  const setCompareScale = useCallback((visible: boolean) => dispatch({ type: 'compareScale', visible }), [])
  const announce = useCallback((message: string) => dispatch({ type: 'announce', message }), [])
  useEffect(() => {
    if (!state.liveMessage) return
    const timer = window.setTimeout(() => dispatch({ type: 'announce', message: '' }), 4200)
    return () => window.clearTimeout(timer)
  }, [state.liveMessage])
  return { ...state, selectExhibit, setSelectedHotspot, setResearchOpen, setSourcesOpen, setCompareScale, announce }
}
