export function Brand({ subtitle = 'Древняя Русь' }: { readonly subtitle?: string }) {
  return (
    <div className="brand" aria-label="HISTORIA 3D, Древняя Русь">
      <svg className="brand-mark" viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <g stroke="currentColor" strokeWidth="2.5">
          <ellipse cx="32" cy="19" rx="12" ry="17" />
          <ellipse cx="32" cy="45" rx="12" ry="17" />
          <ellipse cx="19" cy="32" rx="17" ry="12" />
          <ellipse cx="45" cy="32" rx="17" ry="12" />
          <circle cx="32" cy="32" r="9" />
        </g>
      </svg>
      <span>
        <strong>Historia 3D</strong>
        <small>{subtitle}</small>
      </span>
    </div>
  )
}
