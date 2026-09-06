import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
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
    const [projected, setProjected] = useState<readonly ProjectedHotspot[]>([])

    const hotspotById = useMemo(
      () => new Map(exhibit.hotspots.map((hotspot) => [hotspot.id, hotspot])),
      [exhibit.hotspots],
    )

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
            setProjected([])
            setError(message)
          },
          onHotspots: setProjected,
        })
      } catch (cause) {
        const detail = cause instanceof Error ? cause.message : 'Неизвестная ошибка инициализации viewer.'
        canvas.dataset.renderer = 'unavailable'
        canvas.dataset.rendererError = detail
        setError(`3D-viewer не запущен — показан poster экспоната. ${detail}`)
        setProjected([])
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
      setProjected([])
      controllerRef.current.load(exhibit)
    }, [exhibit])

    return (
      <div className="viewer-stage" aria-label={`Интерактивная 3D-модель: ${exhibit.content.ru?.title ?? exhibit.id}`}>
        <picture className={`viewer-poster ${ready ? 'is-hidden' : ''}`} aria-hidden="true">
          <img src={exhibit.assets.poster} alt="" />
        </picture>
        <canvas ref={canvasRef} className={`viewer-canvas ${error ? 'is-unavailable' : ''}`} tabIndex={0} aria-label={ui.viewerLabel} />
        <div className="hotspot-layer" aria-label="Точки исследования">
          {projected.map((position) => {
            const hotspot = hotspotById.get(position.id)
            if (!hotspot || !position.visible) return null
            return (
              <button
                key={hotspot.id}
                type="button"
                className={`hotspot-marker ${selectedHotspotId === hotspot.id ? 'is-active' : ''}`}
                style={{ left: `${position.x}%`, top: `${position.y}%` }}
                aria-label={`${hotspot.number}. ${hotspot.label}`}
                onClick={() => onSelectHotspot(hotspot)}
              >
                {hotspot.number}
              </button>
            )
          })}
        </div>
        {!ready && !error && <div className="viewer-loading" role="status">{ui.preparing}</div>}
        {error && <div className="viewer-error" role="alert">{error}</div>}
      </div>
    )
  },
)
