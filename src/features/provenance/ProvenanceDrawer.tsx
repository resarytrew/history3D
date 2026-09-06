import { useEffect, useRef } from 'react'
import type { Exhibit } from '../../content/types'
import { Icon } from '../../components/Icon'
import { useUi } from '../../i18n/ui'

interface ProvenanceDrawerProps {
  readonly exhibit: Exhibit
  readonly open: boolean
  readonly onClose: () => void
}

export function ProvenanceDrawer({ exhibit, open, onClose }: ProvenanceDrawerProps) {
  const ui = useUi()
  const evidenceSections = [
    { id: 'known', label: ui.confirmed, symbol: '●', title: ui.confirmed, items: exhibit.reconstruction.known },
    { id: 'inferred', label: ui.inferred, symbol: '◐', title: ui.reconstructedDetail, items: exhibit.reconstruction.inferred },
    { id: 'uncertain', label: ui.uncertain, symbol: '◐', title: ui.uncertain, items: exhibit.reconstruction.uncertain },
    { id: 'unknown', label: ui.unknown, symbol: '○', title: ui.unknown, items: exhibit.reconstruction.unknown },
  ].filter((section) => section.items.length > 0)
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose, open])
  if (!open) return null
  return (
    <div className="drawer-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <aside className="provenance-drawer" role="dialog" aria-modal="true" aria-labelledby="provenance-title">
        <button ref={closeRef} className="drawer-close" type="button" onClick={onClose} aria-label="Закрыть"><Icon name="close" /></button>
        <p className="eyebrow">{ui.reconstructionPassport}</p>
        <h2 id="provenance-title">{ui.sourcesAccuracy}</h2>
        <div className="accuracy-summary">
          <strong>{exhibit.reconstruction.type === 'source-based-reconstruction' ? ui.historicalReconstruction : exhibit.reconstruction.type === 'scan' ? '3D-скан' : ui.interpretive}</strong>
          <span>{exhibit.status === 'historical-review' ? ui.pendingHistoricalReview : ui.technicalReview}</span>
          <p>{exhibit.reconstruction.summary}</p>
        </div>
        {evidenceSections.map((section) => (
          <section className={`evidence-section evidence-${section.id}`} key={section.id}>
            <h3><span className="evidence-symbol" title={section.title} aria-label={section.title}>{section.symbol}</span>{section.label}</h3>
            <ul>
              {section.items.map((item) => <li key={item.id}>{item.statement}</li>)}
            </ul>
          </section>
        ))}
        <section className="source-list">
          <h3>{ui.reconstructionSources}</h3>
          {exhibit.sources.map((source) => (
            <article key={source.id}>
              <strong>{source.visitorTitle ?? source.title}</strong>
              {source.visitorDescription && <p>{source.visitorDescription}</p>}
              {!source.visitorDescription && source.author && <span>{source.author}</span>}
              {source.visitorStatus && <em>{source.visitorStatus}</em>}
              {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.visitorAction ?? ui.openSource}</a> : <em>{ui.sourceNeedsReview}</em>}
            </article>
          ))}
        </section>
        <p className="accuracy-note">{ui.environmentNote}</p>
      </aside>
    </div>
  )
}
