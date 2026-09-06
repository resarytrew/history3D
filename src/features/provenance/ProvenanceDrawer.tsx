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
  const evidenceLabels = { known: ui.confirmed, inferred: ui.inferred, uncertain: ui.uncertain, unknown: ui.unknown } as const
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
        {(Object.keys(evidenceLabels) as Array<keyof typeof evidenceLabels>).map((key) => (
          <section className={`evidence-section evidence-${key}`} key={key}>
            <h3>{evidenceLabels[key]}</h3>
            <ul>
              {exhibit.reconstruction[key].map((item) => <li key={item.id}><span>{item.kind}</span>{item.statement}</li>)}
            </ul>
          </section>
        ))}
        <section className="source-list">
          <h3>Источники</h3>
          {exhibit.sources.map((source) => (
            <article key={source.id}>
              <strong>{source.title}</strong>
              {source.author && <span>{source.author}</span>}
              {source.url ? <a href={source.url} target="_blank" rel="noreferrer">{ui.openSource}</a> : <em>{ui.sourceNeedsReview}</em>}
            </article>
          ))}
        </section>
        <p className="accuracy-note">{ui.environmentNote}</p>
      </aside>
    </div>
  )
}
