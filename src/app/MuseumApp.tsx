import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Brand } from '../components/Brand'
import { Icon } from '../components/Icon'
import { collections, getExhibit } from '../content/catalog'
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
  const [activeExhibitId, setActiveExhibitId] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get('exhibit')
    return requested && getExhibit(requested) ? requested : collections[0].defaultExhibitId
  })
  const exhibit = getExhibit(activeExhibitId)
  if (!exhibit) throw new Error('Default exhibit is missing from the catalog')
  const collection = collections.find((item) => item.id === exhibit.collectionId) ?? collections[0]
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
    collection.entries.flatMap((entry) => {
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
  }, [setSelectedHotspot])

  const closeSources = useCallback(() => {
    setSourcesOpen(false)
    window.requestAnimationFrame(() => sourcesTriggerRef.current?.focus())
  }, [setSourcesOpen])

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

  const selectExhibit = (id: string) => {
      narration.stop()
      setSelectedHotspot(null)
      setResearchOpen(false)
      setSourcesOpen(false)
      setCompareScale(false)
      setActiveExhibitId(id)
  }

  const selectCollectionEntry = (entryId: string) => {
    const entry = collection.entries.find((item) => item.id === entryId)
    if (entry?.exhibitId) {
      selectExhibit(entry.exhibitId)
    } else {
      setLiveMessage(ui.draftMessage)
      window.setTimeout(() => setLiveMessage(''), 4200)
    }
  }

  return (
    <main className={`museum-shell ${exhibit.reconstruction.type === 'source-based-reconstruction' ? 'studio-exhibit' : ''}`}>
      <picture className="scene-background" aria-hidden="true">
        <source media="(max-width: 720px), (orientation: portrait)" srcSet={exhibit.assets.backgrounds.portrait} />
        <img src={exhibit.assets.backgrounds.landscape} alt="" />
      </picture>
      <div className="scene-vignette" aria-hidden="true" />

      <header className="museum-header">
        <div className="collection-navigation">
          <Brand subtitle={content.collectionLabel} />
          <select className="collection-select" aria-label={locale === 'ru' ? 'Коллекция' : 'Collection'} value={collection.id} onChange={(event) => {
            const next = collections.find((item) => item.id === event.target.value)
            if (next) selectExhibit(next.defaultExhibitId)
          }}>
            {collections.map((item) => <option key={item.id} value={item.id}>{locale === 'en' ? (getExhibit(item.defaultExhibitId)?.content.en?.collectionLabel ?? item.title) : item.title}</option>)}
          </select>
        </div>
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
        <ExhibitViewer ref={viewerRef} exhibit={exhibit} selectedHotspotId={selectedHotspot?.id ?? null} onSelectHotspot={selectHotspot} />
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
              isSourceBased={exhibit.reconstruction.type === 'source-based-reconstruction'}
              narrationState={narration.state}
              onNarration={() => void narration.toggle()}
              onResearch={() => setResearchOpen(true)}
              onSources={() => setSourcesOpen(true)}
            />
          </div>
        )}
      </div>

      {selectedHotspot && <HotspotCard key={selectedHotspot.id} hotspot={selectedHotspot} observationFirst={exhibit.reconstruction.type === 'source-based-reconstruction'} onClose={resetView} />}

      <ExhibitCarousel
        collection={collection}
        activeId={exhibit.id}
        thumbnails={thumbnails}
        onSelect={selectCollectionEntry}
      />

      <aside className="exhibit-mode" aria-label={ui.exhibitMode}>
        <span><Icon name="eye" /></span>
        <div><strong>{ui.exhibitMode}</strong><p>{exhibit.category !== 'architecture' ? `${content.categoryLabel} • 360°` : ui.exterior}</p></div>
      </aside>

      <div className="development-notice">
        {exhibit.reconstruction.type === 'scan' ? '3D-СКАН • CC BY 4.0' : exhibit.reconstruction.type === 'source-based-reconstruction' ? ui.pendingHistoricalReview : 'DEV_ONLY • не научная реконструкция'}
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
