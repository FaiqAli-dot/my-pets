import { app, protocol, net } from 'electron'
import { join } from 'path'
import { pathToFileURL } from 'url'

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'pet-asset',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true
    }
  }
])

app.whenReady().then(async () => {
  const root = join(process.cwd(), 'assets', 'pets')
  protocol.handle('pet-asset', (req) => {
    const u = new URL(req.url)
    const rel = decodeURIComponent(u.pathname.replace(/^\/+/, ''))
    const abs = join(root, rel)
    console.log('fetch', req.url, '->', abs)
    return net.fetch(pathToFileURL(abs).href)
  })
  for (const url of [
    'pet-asset://local/gobkit/Corgi.glb',
    'pet-asset://local/gobkit/Corgi.glb'
  ]) {
    const r = await net.fetch(url)
    const buf = await r.arrayBuffer()
    console.log(url, 'status', r.status, 'len', buf.byteLength)
  }
  app.exit(0)
})
