import { useState } from 'react'
import type { ExhibitContent } from '../../content/types'
import { useUi } from '../../i18n/ui'

interface ResearchFlowProps {
  readonly content: ExhibitContent
  readonly onClose: () => void
}

export function ResearchFlow({ content, onClose }: ResearchFlowProps) {
  const ui = useUi()
  const [showExplanation, setShowExplanation] = useState(false)
  return (
    <section className="research-flow" aria-label="Режим исследования">
      <button className="panel-close" type="button" onClick={onClose} aria-label={ui.closeResearch}>×</button>
      <p className="eyebrow">{ui.observationFirst}</p>
      <h2>{content.researchPrompt}</h2>
      <ol>
        {content.observationSteps.map((step) => <li key={step}>{step}</li>)}
      </ol>
      {!showExplanation ? (
        <button className="button button-primary wide" type="button" onClick={() => setShowExplanation(true)}>
          {ui.explanation}
        </button>
      ) : (
        <div className="research-explanation">
          <p className="eyebrow">{ui.afterObservation}</p>
          <p>{content.explanation}</p>
        </div>
      )}
    </section>
  )
}
