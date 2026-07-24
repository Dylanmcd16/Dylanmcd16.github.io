// Build asset URLs relative to the deployed base path so the explorer works
// whether the site is served from "/" or a project subpath.
export function assetUrl(relativePath: string): string {
  const cleanPath = relativePath.replace(/^\/+/, '')
  return `${import.meta.env.BASE_URL}${cleanPath}`
}
