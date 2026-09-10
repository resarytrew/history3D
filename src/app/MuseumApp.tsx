import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { Brand } from '../components/Brand'
import { Icon } from '../components/Icon'
import { collections, getExhibit } from '../content/catalog'
import type { Hotspot, Locale } from '../content/types'
import { ExhibitCarousel } from '../features/exhibit-carousel/ExhibitCarousel'
import { ExhibitInfo } from '../features/exhibit-info/ExhibitInfo'
import { ResearchFlow } from '../features/exhibit-info/ResearchFlow'
import type { ExhibitViewerHandle } from '../features/exhibit-viewer/ExhibitViewer'
import { ViewerLoading } from '../features/exhibit-viewer/ViewerLoading'
import { HotspotCard } from '../features/hotspots/HotspotCard'
import { useNarration } from '../features/narration/useNarration'
import { ProvenanceDrawer } from '../features/provenance/ProvenanceDrawer'
import { UiProvider, useUi } from '../i18n/ui'
import { useMuseumController } from '../state/useMuseumController'

const ExhibitViewer = lazy(async () => {
  const module = await import('../features/exhibit-viewer/ExhibitViewer')
  return { default: module.ExhibitViewer }
})

function MuseumExperience({ locale, setLocale }: { readonly locale: Locale; readonly setLocale: (locale: Locale) => void }) {
  const ui = useUi()
  const { activeExhibitId, selectedHotspot, researchOpen, sourcesOpen, compareScale, liveMessage,
    setSelectedHotspot, setResearchOpen, setSourcesOpen, setCompareScale, announce, selectExhibit: changeExhibit } = useMuseumController()
  const exhibit = getExhibit(activeExhibitId)
  if (!exhibit) throw new Error('Default exhibit is missing from the catalog')
  const collection = collections.find((item) => item.id === exhibit.collectionId) ?? collections[0]
  const content = exhibit.content[locale] ?? exhibit.content.ru
  if (!content) throw new Error(`Exhibit ${exhibit.id} has no usable content record`)

  const viewerRef = useRef<ExhibitViewerHandle>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [structureQuery, setStructureQuery] = useState('')
  const [panelsHidden, setPanelsHidden] = useState(false)
  const sourcesTriggerRef = useRef<HTMLButtonElement | null>(null)
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

  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement || (event.target instanceof HTMLElement && event.target.isContentEditable)) return
      if (searchRef.current) { event.preventDefault(); setPanelsHidden(false); requestAnimationFrame(() => searchRef.current?.focus()) }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [])

  const selectHotspot = useCallback((hotspot: Hotspot) => {
    setSelectedHotspot(hotspot)
    viewerRef.current?.focusHotspot(hotspot)
  }, [setSelectedHotspot])

  const closeSources = useCallback(() => {
    setSourcesOpen(false)
    window.requestAnimationFrame(() => sourcesTriggerRef.current?.focus())
  }, [setSourcesOpen])

  const openSources = () => {
    sourcesTriggerRef.current = document.activeElement instanceof HTMLButtonElement ? document.activeElement : null
    setSourcesOpen(true)
  }

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
    setStructureQuery('')
    setPanelsHidden(false)
    changeExhibit(id)
  }

  const selectCollectionEntry = (entryId: string) => {
    const entry = collection.entries.find((item) => item.id === entryId)
    if (entry?.exhibitId) {
      selectExhibit(entry.exhibitId)
    } else {
      announce(ui.draftMessage)
    }
  }

  return (
    <main className={`museum-shell ${exhibit.reconstruction.type === 'source-based-reconstruction' ? 'studio-exhibit' : ''} ${exhibit.semantics ? 'semantic-exhibit' : ''} ${panelsHidden ? 'panels-hidden' : ''}`}>
      <header className="museum-header">
        <div className="collection-navigation">
          <Brand subtitle={content.collectionLabel} />
          {collections.length > 1 && <select className="collection-select" aria-label={locale === 'ru' ? 'Коллекция' : 'Collection'} value={collection.id} onChange={(event) => {
            const next = collections.find((item) => item.id === event.target.value)
            if (next) selectExhibit(next.defaultExhibitId)
          }}>
            {collections.map((item) => <option key={item.id} value={item.id}>{locale === 'en' ? (getExhibit(item.defaultExhibitId)?.content.en?.collectionLabel ?? item.title) : item.title}</option>)}
          </select>}
        </div>
        <div className="top-controls">
          {exhibit.semantics && <label className="structure-search"><Icon name="search" /><input ref={searchRef} type="search" aria-label={locale === 'ru' ? 'Найти деталь' : 'Find a structure'} placeholder={locale === 'ru' ? 'Найти деталь' : 'Find a structure'} value={structureQuery} onChange={event => setStructureQuery(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') { setStructureQuery(''); event.currentTarget.blur() } }} /><kbd>/</kbd></label>}
          <button className="top-button language-button" type="button" onClick={() => {
            setSelectedHotspot(null)
            setResearchOpen(false)
            narration.stop()
            setLocale(locale === 'ru' ? 'en' : 'ru')
          }} aria-label="Переключить язык">
            <Icon name="globe" />{locale.toUpperCase()}
          </button>
          <button className="top-button icon-only" type="button" onClick={openSources} aria-label={locale === 'ru' ? 'Об экспонате и источниках' : 'About this exhibit and sources'} title={ui.sources}><Icon name="info" /></button>
        </div>
      </header>

      <nav className="viewer-tools" aria-label={locale === 'ru' ? 'Управление видом' : 'View controls'}>
        <button type="button" onClick={() => setPanelsHidden(!panelsHidden)} aria-pressed={panelsHidden} aria-label={locale === 'ru' ? (panelsHidden ? 'Показать панели' : 'Скрыть панели') : (panelsHidden ? 'Show panels' : 'Hide panels')} title={locale === 'ru' ? (panelsHidden ? 'Показать панели' : 'Скрыть панели') : (panelsHidden ? 'Show panels' : 'Hide panels')}><Icon name="eye" /></button>
        <button type="button" onClick={resetView} aria-label={ui.reset} title={ui.reset}><Icon name="reset" /></button>
        <button className={compareScale ? 'is-active' : ''} type="button" onClick={toggleCompare} aria-label={ui.compareScale} title={ui.compareScale} aria-pressed={compareScale}><Icon name="scale" /></button>
        <span className="viewer-tools-divider" />
        <button type="button" onClick={() => void enterFullscreen()} aria-label={ui.fullscreen} title={ui.fullscreen}><Icon name="expand" /></button>
      </nav>

      <Suspense fallback={(
        <div className="viewer-stage viewer-suspense" data-state="loading" aria-busy="true" aria-label={ui.preparing}>
          <ViewerLoading />
        </div>
      )}>
        <ExhibitViewer ref={viewerRef} exhibit={exhibit} structureQuery={structureQuery} selectedHotspotId={selectedHotspot?.id ?? null} onSelectHotspot={selectHotspot} />
      </Suspense>

      <div className={`left-panel-wrap ${researchOpen ? 'is-research' : ''}`}>
        {researchOpen ? (
          <ResearchFlow content={content} onClose={() => setResearchOpen(false)} />
        ) : (
          <div>
            <ExhibitInfo
              content={content}
              isScan={exhibit.reconstruction.type === 'scan'}
              isSourceBased={exhibit.reconstruction.type === 'source-based-reconstruction'}
              narrationState={narration.state}
              onNarration={() => void narration.toggle()}
              onResearch={() => setResearchOpen(true)}
              onSources={openSources}
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

      <footer className="viewer-footer">
        <p>{locale === 'ru' ? 'Перетащите, чтобы вращать · Масштабируйте жестом · Нажмите, чтобы исследовать' : 'Drag to orbit · Pinch to zoom · Tap to inspect'}</p>
        <button type="button" onClick={openSources}>{locale === 'ru' ? 'Источники и авторство' : 'Sources & credits'}<Icon name="sources" /></button>
      </footer>

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
