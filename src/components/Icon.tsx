import type { SVGProps } from 'react'

interface IconProps extends SVGProps<SVGSVGElement> {
  readonly name: 'audio' | 'search' | 'sources' | 'reset' | 'expand' | 'scale' | 'globe' | 'eye' | 'close' | 'arrow' | 'cube' | 'info' | 'isolate'
}

export function Icon({ name, ...props }: IconProps) {
  const paths = {
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.1"/></>,
    isolate: <><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M3 16v3a2 2 0 0 0 2 2h3M21 16v3a2 2 0 0 1-2 2h-3"/><circle cx="12" cy="12" r="3"/></>,
    audio: <><path d="M4 14v-4a8 8 0 0 1 16 0v4"/><path d="M4 14a2 2 0 0 1 2-2h1v6H6a2 2 0 0 1-2-2v-2Zm16 0a2 2 0 0 0-2-2h-1v6h1a2 2 0 0 0 2-2v-2Z"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m16 16 5 5"/></>,
    sources: <><path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h6"/></>,
    reset: <><path d="M4 8a8 8 0 1 1-1 7"/><path d="M4 3v5h5"/></>,
    expand: <><path d="M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5"/><path d="m3 8 6-6m12 6-6-6M3 16l6 6m12-6-6 6"/></>,
    scale: <><path d="M4 12h16M7 8l-3 4 3 4m10-8 3 4-3 4"/><path d="M12 4v16"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    cube: <><path d="m12 2 8 4.5v9L12 20l-8-4.5v-9L12 2Z"/><path d="m4 6.5 8 4.5 8-4.5M12 11v9"/></>,
  } as const
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  )
}

