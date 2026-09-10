import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Exhibit, Hotspot } from '../../content/types'
import { ViewerController, type ProjectedHotspot } from '../../three/ViewerController'
import { useUi } from '../../i18n/ui'
import { ViewerLoading } from './ViewerLoading'
import { AssemblyControls } from './AssemblyControls'
import { assembledState, type SemanticState } from '../../content/assembly'

export interface ExhibitViewerHandle {
  readonly reset: () => void
  readonly focusHotspot: (hotspot: Hotspot) => void
  readonly setScaleComparison: (visible: boolean) => void
}

interface ExhibitViewerProps {
  readonly exhibit: Exhibit
  readonly selectedHotspotId: string | null
  readonly onSelectHotspot: (hotspot: Hotspot) => void
}

export const ExhibitViewer = forwardRef<ExhibitViewerHandle, ExhibitViewerProps>(
  function ExhibitViewer({ exhibit, selectedHotspotId, onSelectHotspot }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const ui = useUi()
    const controllerRef = useRef<ViewerController | null>(null)
    const [readyExhibitId, setReadyExhibitId] = useState<string | null>(null)
    const loadingExhibitId = useRef(exhibit.id)
    const ready = readyExhibitId === exhibit.id
    const [error, setError] = useState<string | null>(null)
    const [semanticState, setSemanticState] = useState<SemanticState>(assembledState)
    const semanticStateRef = useRef(semanticState)
    const [assemblyError, setAssemblyError] = useState<string | null>(null)
    const changeSemanticState = (state: SemanticState) => {
      if (!controllerRef.current?.setSemanticState(state.selection, state.displayMode, state.assemblyContext)) return
      semanticStateRef.current = state; setSemanticState(state); setAssemblyError(null)
    }
    const hotspotLayerRef = useRef<HTMLDivElement>(null)
    // Write projection in the renderer's frame; React state would introduce a frame of lag.
    const publishProjection = (positions: readonly ProjectedHotspot[]) => {
      const byId = new Map(positions.map((position) => [position.id, position]))
      hotspotLayerRef.current?.querySelectorAll<HTMLButtonElement>('[data-hotspot-id]').forEach((button) => {
        const position = byId.get(button.dataset.hotspotId!)
        button.hidden = !position?.visible
        if (position) { button.style.left = `${position.x}%`; button.style.top = `${position.y}%` }
        const dx = Number(button.dataset.offsetX ?? 0), dy = Number(button.dataset.offsetY ?? 0)
        button.style.marginLeft = `${dx}px`; button.style.marginTop = `${dy}px`
        button.style.setProperty('--leader-length', `${Math.hypot(dx, dy)}px`)
        button.style.setProperty('--leader-angle', `${Math.atan2(dx, -dy)}rad`)
      })
    }

    useImperativeHandle(ref, () => ({
      reset: () => controllerRef.current?.reset(),
      focusHotspot: (hotspot) => controllerRef.current?.focusHotspot(hotspot),
      setScaleComparison: (visible) => {
        if (visible) { semanticStateRef.current = assembledState; setSemanticState(assembledState) }
        controllerRef.current?.setScaleComparison(visible)
      },
    }), [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      let controller: ViewerController
      try {
        controller = new ViewerController(canvas, {
          onReady: () => setReadyExhibitId(loadingExhibitId.current),
          onError: (message) => {
            canvas.dataset.rendererError = message
            publishProjection([])
            setError(message)
          },
          onHotspots: publishProjection,
          onSelection: (selection) => changeSemanticState({ ...semanticStateRef.current, selection, displayMode: selection ? semanticStateRef.current.displayMode : 'all' }),
          onAssemblyError: (message) => setAssemblyError(message),
        })
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : 'Неизвестная ошибка инициализации viewer.'
        canvas.dataset.renderer = 'unavailable'
        canvas.dataset.rendererError = detail
        setError(detail)
        publishProjection([])
        return
      }
      controllerRef.current = controller
      return () => {
        controllerRef.current = null
        controller.dispose()
      }
    }, [])

    useEffect(() => {
      if (!controllerRef.current) return
      loadingExhibitId.current = exhibit.id
      setReadyExhibitId(null)
      setError(null)
      semanticStateRef.current = assembledState; setSemanticState(assembledState); setAssemblyError(null)
      if (canvasRef.current) delete canvasRef.current.dataset.rendererError
      publishProjection([])
      controllerRef.current.load(exhibit)
    }, [exhibit])

    return (
      <div className={`viewer-stage ${exhibit.semantics ? 'semantic-stage' : ''}`} data-state={error ? 'error' : ready ? 'ready' : 'loading'} aria-busy={!ready && !error} aria-label={`Интерактивная 3D-модель: ${exhibit.content.ru?.title ?? exhibit.id}`}>
        <div className="canvas-workspace"><canvas ref={canvasRef} className="viewer-canvas" tabIndex={ready && !error ? 0 : -1} aria-label={ui.viewerLabel} /></div>
        <div ref={hotspotLayerRef} className="hotspot-layer" aria-label="Точки исследования">
          {!exhibit.semantics && exhibit.hotspots.map((hotspot) => (
              <button
                key={hotspot.id}
                type="button"
                className={`hotspot-marker ${hotspot.labelOffset ? 'has-leader' : ''} ${selectedHotspotId === hotspot.id ? 'is-active' : ''}`}
                data-hotspot-id={hotspot.id}
                data-offset-x={hotspot.labelOffset?.[0]}
                data-offset-y={hotspot.labelOffset?.[1]}
                hidden
                aria-label={`${hotspot.number}. ${hotspot.label}`}
                onClick={() => onSelectHotspot(hotspot)}
              >
                {hotspot.number}
              </button>
          ))}
        </div>
        {ready && !error && exhibit.semantics && <AssemblyControls key={exhibit.id} exhibit={exhibit} state={semanticState}
          onChange={changeSemanticState} onFocus={id => controllerRef.current?.focusEntity(id)} onReference={() => controllerRef.current?.returnReference()} />}
        {assemblyError && <p className="assembly-error" role="alert">{ui.assemblyUnavailable}</p>}
        {!ready && !error && <ViewerLoading />}
        {error && <div className="viewer-error" role="alert">{ui.viewerUnavailable}</div>}
      </div>
    )
  },
)
