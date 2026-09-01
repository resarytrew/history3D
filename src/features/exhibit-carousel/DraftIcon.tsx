import type { CollectionEntry } from '../../content/types'

export function DraftIcon({ icon }: Pick<CollectionEntry, 'icon'>) {
  if (icon === 'axe') return <svg viewBox="0 0 60 44" aria-hidden="true"><path d="m27 8 22-4 7 9-22 10-8-5Z"/><path d="m25 13 5 1-12 28-5-2Z"/></svg>
  if (icon === 'boat') return <svg viewBox="0 0 60 44" aria-hidden="true"><path d="M5 30c13 9 37 9 50 0H5Z"/><path d="M30 4v27M30 6 13 25h17Z"/></svg>
  if (icon === 'helmet') return <svg viewBox="0 0 60 44" aria-hidden="true"><path d="M15 34v-9C15 10 23 3 30 3s15 7 15 22v9Z"/><path d="M15 34h30M30 4v30"/></svg>
  if (icon === 'cross') return <svg viewBox="0 0 60 44" aria-hidden="true"><path d="M26 3h8v10h9v8h-9v20h-8V21h-9v-8h9Z"/></svg>
  return <svg viewBox="0 0 60 44" aria-hidden="true"><path d="M18 39V18h24v21M25 18V9h10v9M28 9V3h4v6M23 39V29h14v10"/></svg>
}

