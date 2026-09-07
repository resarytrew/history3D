import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { Exhibit, Hotspot } from '../../content/types'
import { ViewerController, type ProjectedHotspot } from '../../three/ViewerController'
import { useUi } from '../../i18n/ui'

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
    const [ready, setReady] = useState(false)
    const [error, setError] = useState<string | null>(null)
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
      setScaleComparison: (visible) => controllerRef.current?.setScaleComparison(visible),
    }), [])

    useEffect(() => {
      const canvas = canvasRef.current
      if (!canvas) return
      let controller: ViewerController
      try {
        controller = new ViewerController(canvas, {
          onReady: () => setReady(true),
          onError: (message) => {
            publishProjection([])
            setError(message)
          },
          onHotspots: publishProjection,
        })
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : 'Неизвестная ошибка инициализации viewer.'
        canvas.dataset.renderer = 'unavailable'
        canvas.dataset.rendererError = detail
        setError(`3D-viewer не запущен — показан poster экспоната. ${detail}`)
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
      setReady(false)
      setError(null)
      publishProjection([])
      controllerRef.current.load(exhibit)
    }, [exhibit])

    return (
      <div className="viewer-stage" aria-label={`Интерактивная 3D-модель: ${exhibit.content.ru?.title ?? exhibit.id}`}>
        <picture className={`viewer-poster ${ready ? 'is-hidden' : ''}`} aria-hidden="true">
          <img src={exhibit.assets.poster} alt="" />
        </picture>
        <canvas ref={canvasRef} className={`viewer-canvas ${error ? 'is-unavailable' : ''}`} tabIndex={0} aria-label={ui.viewerLabel} />
        <div ref={hotspotLayerRef} className="hotspot-layer" aria-label="Точки исследования">
          {exhibit.hotspots.map((hotspot) => (
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
        {!ready && !error && <div className="viewer-loading" role="status">{ui.preparing}</div>}
        {error && <div className="viewer-error" role="alert">{error}</div>}
      </div>
    )
  },
)
