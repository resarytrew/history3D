import type { ExhibitContent } from '../../content/types'
import { Icon } from '../../components/Icon'
import { useUi } from '../../i18n/ui'

interface ExhibitInfoProps {
  readonly content: ExhibitContent
  readonly isScan?: boolean
  readonly narrationState: 'idle' | 'playing' | 'paused' | 'unavailable'
  readonly onNarration: () => void
  readonly onResearch: () => void
  readonly onSources: () => void
}

export function ExhibitInfo({ content, isScan = false, narrationState, onNarration, onResearch, onSources }: ExhibitInfoProps) {
  const ui = useUi()
  const narrationLabel = narrationState === 'playing' ? ui.pause : narrationState === 'paused' ? ui.resume : ui.listen
  return (
    <section className="exhibit-info" aria-labelledby="exhibit-title">
      <p className="eyebrow">{content.categoryLabel} <span>•</span> {content.periodLabel}</p>
      <h1 id="exhibit-title">{content.title}</h1>
      <div className="reconstruction-badge">
        <Icon name="cube" />{isScan ? '3D-скан' : ui.reconstruction} <span>{isScan ? 'CC BY' : 'DEV'}</span>
      </div>
      <p className="research-prompt">{content.researchPrompt}</p>
      <div className="info-actions">
        <button className="button button-primary" type="button" onClick={onNarration} disabled={narrationState === 'unavailable'} aria-pressed={narrationState === 'playing'}>
          <Icon name="audio" />{narrationLabel}
        </button>
        <button className="button" type="button" onClick={onResearch}><Icon name="search" />{ui.research}</button>
        <button className="button button-icon-label" type="button" onClick={onSources}><Icon name="sources" /><span>{ui.sources}</span></button>
      </div>
    </section>
  )
}
