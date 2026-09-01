import type { Hotspot } from '../../content/types'

interface HotspotCardProps {
  readonly hotspot: Hotspot
  readonly onClose: () => void
}

export function HotspotCard({ hotspot, onClose }: HotspotCardProps) {
  return (
    <aside className="hotspot-card" aria-live="polite">
      <button type="button" className="hotspot-card-close" onClick={onClose} aria-label="Закрыть точку исследования">×</button>
      <div className="hotspot-card-title"><span>{hotspot.number}</span><strong>{hotspot.label}</strong></div>
      <p>{hotspot.description}</p>
      <blockquote>{hotspot.observationQuestion}</blockquote>
    </aside>
  )
}

