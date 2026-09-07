import type { ExhibitCollection } from '../../content/types'
import { DraftIcon } from './DraftIcon'
import { useUi } from '../../i18n/ui'

interface ExhibitCarouselProps {
  readonly collection: ExhibitCollection
  readonly activeId: string
  readonly thumbnails: Readonly<Record<string, string>>
  readonly onSelect: (id: string) => void
}

export function ExhibitCarousel({ collection, activeId, thumbnails, onSelect }: ExhibitCarouselProps) {
  const ui = useUi()
  return (
    <nav className={`exhibit-carousel ${collection.entries.length === 1 ? 'is-single' : collection.entries.length === 2 ? 'is-pair' : ''}`} aria-label={ui.exhibits}>
      <button className="carousel-arrow" type="button" aria-label={ui.previous}>‹</button>
      <div className="carousel-track">
        {collection.entries.map((entry) => {
          const active = entry.id === activeId
          return (
            <button
              key={entry.id}
              type="button"
              className={`carousel-item ${active ? 'is-active' : ''}`}
              onClick={() => onSelect(entry.id)}
              aria-current={active ? 'true' : undefined}
            >
              <span className="carousel-image">
                {thumbnails[entry.id] ? <img src={thumbnails[entry.id]} alt="" /> : <DraftIcon icon={entry.icon} />}
                {entry.status === 'draft' && <small>{ui.soon}</small>}
              </span>
              <strong>{entry.title}</strong>
            </button>
          )
        })}
      </div>
      <button className="carousel-arrow" type="button" aria-label={ui.next}>›</button>
    </nav>
  )
}
