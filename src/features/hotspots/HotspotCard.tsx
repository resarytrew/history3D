import type { Hotspot } from '../../content/types'
import { useUi } from '../../i18n/ui'

interface HotspotCardProps {
  readonly hotspot: Hotspot
  readonly onClose: () => void
  readonly observationFirst?: boolean
}

export function HotspotCard({ hotspot, onClose, observationFirst = false }: HotspotCardProps) {
  const ui = useUi()
  return (
    <aside className="hotspot-card" aria-live="polite">
      <button type="button" className="hotspot-card-close" onClick={onClose} aria-label="Закрыть точку исследования">×</button>
      <div className="hotspot-card-title"><span>{hotspot.number}</span><strong>{hotspot.label}</strong></div>
      {!observationFirst && <p>{hotspot.description}</p>}
      <blockquote>{hotspot.observationQuestion}</blockquote>
      {observationFirst && <details><summary>{ui.explanation}</summary><p>{hotspot.description}</p></details>}
    </aside>
  )
}
