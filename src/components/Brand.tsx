import { useLocale } from '../i18n/ui'

export function Brand({ subtitle = 'Отечественная война 1812 года' }: { readonly subtitle?: string }) {
  const locale = useLocale()
  return (
    <div className="brand" aria-label={`HISTORIA 3D, ${subtitle}`}>
      <span>
        <span className="brand-eyebrow">{locale === 'ru' ? 'Интерактивный музей' : 'Interactive museum'}</span>
        <strong>Historia <span className="brand-dimension">3D</span></strong>
        <small>{subtitle}</small>
      </span>
    </div>
  )
}
