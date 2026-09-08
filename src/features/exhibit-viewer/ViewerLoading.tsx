import { useUi } from '../../i18n/ui'

/** Shared by the lazy viewer and model loading; no simulated percentage. */
export function ViewerLoading() {
  const ui = useUi()
  return (
    <div className="viewer-loading" role="status">
      <span className="viewer-loading-label">{ui.preparing}</span>
      <div className="viewer-loading-track" aria-hidden="true">
        <span className="viewer-loading-fill" />
      </div>
    </div>
  )
}
