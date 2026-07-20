export function caseStudyUrl(slug: string): string {
  return `${import.meta.env.BASE_URL}work/${encodeURIComponent(slug)}/`
}

export type RouteState = 
  | { type: 'home' }
  | { type: 'case-study'; slug: string }
  | { type: 'not-found' }

export function getRouteState(): RouteState {
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, '')
  let pathname = window.location.pathname

  if (basePath && pathname.startsWith(basePath)) {
    pathname = pathname.slice(basePath.length)
  }

  const segments = pathname
    .replace(/\/index\.html$/, '/')
    .split('/')
    .filter(Boolean)

  if (segments.length === 0) {
    return { type: 'home' }
  }

  if (segments.length !== 2 || segments[0] !== 'work') {
    return { type: 'not-found' }
  }

  return { type: 'case-study', slug: decodeURIComponent(segments[1]) }
}

