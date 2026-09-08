/** Owns only the exhibit parameter. Other query parameters, pathname and hash survive. */
export function readExhibitUrl(url: URL, isKnown: (id: string) => boolean, fallback: string): string {
  const requested = url.searchParams.get('exhibit')
  return requested && isKnown(requested) ? requested : fallback
}

export function writeExhibitUrl(url: URL, exhibitId: string): string {
  const next = new URL(url)
  next.searchParams.set('exhibit', exhibitId)
  return `${next.pathname}${next.search}${next.hash}`
}
