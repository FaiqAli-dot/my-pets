import { net, protocol } from 'electron'
import { join, normalize } from 'path'
import { pathToFileURL } from 'url'
import { getAssetRoot } from './windows'

const SCHEME = 'pet-asset'

/** Must run before app.ready. */
export function registerAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
        stream: true,
        bypassCSP: false
      }
    }
  ])
}

/** Map pet-asset://local/<path> → files under the pets asset root (no path escape). */
export function handleAssetProtocol(): void {
  protocol.handle(SCHEME, (request) => {
    try {
      const url = new URL(request.url)
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
      const root = getAssetRoot()
      const absolute = normalize(join(root, rel))
      if (!absolute.startsWith(normalize(root))) {
        return new Response('Forbidden', { status: 403 })
      }
      return net.fetch(pathToFileURL(absolute).href)
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })
}

export function assetBaseUrl(): string {
  return `${SCHEME}://local`
}
