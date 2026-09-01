import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Brand } from '../components/Brand'
import { Icon } from '../components/Icon'
import { ancientRusCollection } from '../content/collections/ancient-rus'
import { getExhibit } from '../content/catalog'
import type { Hotspot, Locale } from '../content/types'
import { ExhibitCarousel } from '../features/exhibit-carousel/ExhibitCarousel'
import { ExhibitInfo } from '../features/exhibit-info/ExhibitInfo'
import { ResearchFlow } from '../features/exhibit-info/ResearchFlow'
import type { ExhibitViewerHandle } from '../features/exhibit-viewer/ExhibitViewer'
import { HotspotCard } from '../features/hotspots/HotspotCard'
import { useNarration } from '../features/narration/useNarration'
import { ProvenanceDrawer } from '../features/provenance/ProvenanceDrawer'
import { UiProvider, useUi } from '../i18n/ui'

const ExhibitViewer = lazy(async () => {
  const module = await import('../features/exhibit-viewer/ExhibitViewer')
  return { default: module.ExhibitViewer }
})

function MuseumExperience({ locale, setLocale }: { readonly locale: Locale; readonly setLocale: (locale: Locale) => void }) {
  const ui = useUi()
  const [activeExhibitId, setActiveExhibitId] = useState(ancientRusCollection.defaultExhibitId)
  const exhibit = getExhibit(activeExhibitId)
  if (!exhibit) throw new Error('Default exhibit is missing from the catalog')
  const content = exhibit.content[locale] ?? exhibit.content.ru
  if (!content) throw new Error(`Exhibit ${exhibit.id} has no usable content record`)

  const viewerRef = useRef<ExhibitViewerHandle>(null)
  const sourcesTriggerRef = useRef<HTMLButtonElement | null>(null)
  const [selectedHotspot, setSelectedHotspot] = useState<Hotspot | null>(null)
  const [researchOpen, setResearchOpen] = useState(false)
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const [compareScale, setCompareScale] = useState(false)
  const [liveMessage, setLiveMessage] = useState('')
  const narration = useNarration(content.narration, locale)
  const thumbnails = Object.fromEntries(
    ancientRusCollection.entries.flatMap((entry) => {
      const entryExhibit = entry.exhibitId ? getExhibit(entry.exhibitId) : undefined
      return entryExhibit ? [[entry.id, entryExhibit.assets.thumbnail]] : []
    }),
  )

  useEffect(() => {
    document.documentElement.lang = locale
  }, [locale])

  const selectHotspot = useCallback((hotspot: Hotspot) => {
    setSelectedHotspot(hotspot)
    viewerRef.current?.focusHotspot(hotspot)
  }, [])

  const closeSources = useCallback(() => {
    setSourcesOpen(false)
    window.requestAnimationFrame(() => sourcesTriggerRef.current?.focus())
  }, [])

  const toggleCompare = () => {
    const next = !compareScale
    setCompareScale(next)
    viewerRef.current?.setScaleComparison(next)
  }

  const resetView = () => {
    setSelectedHotspot(null)
    viewerRef.current?.reset()
  }

  const enterFullscreen = async () => {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen?.()
    else await document.exitFullscreen?.()
  }

  const selectCollectionEntry = (entryId: string) => {
    const entry = ancientRusCollection.entries.find((item) => item.id === entryId)
    if (entry?.exhibitId) {
      narration.stop()
      setSelectedHotspot(null)
      setResearchOpen(false)
      setSourcesOpen(false)
      setCompareScale(false)
      setActiveExhibitId(entry.exhibitId)
    } else {
      setLiveMessage(ui.draftMessage)
      window.setTimeout(() => setLiveMessage(''), 4200)
    }
  }

  return (
    <main className="museum-shell">
      <picture className="scene-background" aria-hidden="true">
        <source media="(max-width: 720px), (orientation: portrait)" srcSet={exhibit.assets.backgrounds.portrait} />
        <img src={exhibit.assets.backgrounds.landscape} alt="" />
      </picture>
      <div className="scene-vignette" aria-hidden="true" />

      <header className="museum-header">
        <Brand subtitle={ui.ancientRus} />
        <div className="top-controls">
          <button className="top-button language-button" type="button" onClick={() => {
            setSelectedHotspot(null)
            setResearchOpen(false)
            narration.stop()
            setLocale(locale === 'ru' ? 'en' : 'ru')
          }} aria-label="Переключить язык">
            <Icon name="globe" />{locale.toUpperCase()}
          </button>
          <button className={`top-button scale-button ${compareScale ? 'is-active' : ''}`} type="button" onClick={toggleCompare} aria-pressed={compareScale}>
            <Icon name="scale" />{ui.compareScale}
          </button>
          <button className="top-button icon-only" type="button" onClick={resetView} aria-label={ui.reset} title={ui.reset}><Icon name="reset" /></button>
          <button className="top-button icon-only" type="button" onClick={() => void enterFullscreen()} aria-label={ui.fullscreen} title={ui.fullscreen}><Icon name="expand" /></button>
        </div>
      </header>

      <Suspense fallback={(
        <div className="viewer-stage viewer-suspense" aria-label={ui.preparing}>
          <picture className="viewer-poster"><img src={exhibit.assets.poster} alt="" /></picture>
        </div>
      )}>
        <ExhibitViewer key={exhibit.id} ref={viewerRef} exhibit={exhibit} selectedHotspotId={selectedHotspot?.id ?? null} onSelectHotspot={selectHotspot} />
      </Suspense>

      <div className="left-panel-wrap">
        {researchOpen ? (
          <ResearchFlow content={content} onClose={() => setResearchOpen(false)} />
        ) : (
          <div ref={(node) => {
            sourcesTriggerRef.current = node?.querySelector<HTMLButtonElement>('.button-icon-label') ?? null
          }}>
            <ExhibitInfo
              content={content}
              isScan={exhibit.reconstruction.type === 'scan'}
              narrationState={narration.state}
              onNarration={() => void narration.toggle()}
              onResearch={() => setResearchOpen(true)}
              onSources={() => setSourcesOpen(true)}
            />
          </div>
        )}
      </div>

      {selectedHotspot && <HotspotCard hotspot={selectedHotspot} onClose={resetView} />}

      <ExhibitCarousel
        collection={ancientRusCollection}
        activeId={exhibit.id}
        thumbnails={thumbnails}
        onSelect={selectCollectionEntry}
      />

      <aside className="exhibit-mode" aria-label={ui.exhibitMode}>
        <span><Icon name="eye" /></span>
        <div><strong>{ui.exhibitMode}</strong><p>{exhibit.category === 'armor' ? `${content.categoryLabel} • 360°` : ui.exterior}</p></div>
      </aside>

      <div className="development-notice">
        {exhibit.reconstruction.type === 'scan' ? '3D-СКАН • CC BY 4.0' : 'DEV_ONLY • не научная реконструкция'}
      </div>
      <div className="live-region" aria-live="polite">{liveMessage}</div>
      {liveMessage && <div className="toast" role="status">{liveMessage}</div>}
      <ProvenanceDrawer exhibit={exhibit} open={sourcesOpen} onClose={closeSources} />
    </main>
  )
}

export function MuseumApp() {
  const [locale, setLocale] = useState<Locale>('ru')
  return (
    <UiProvider locale={locale}>
      <MuseumExperience locale={locale} setLocale={setLocale} />
    </UiProvider>
  )
}
