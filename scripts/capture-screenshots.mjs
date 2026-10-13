/**
 * Capture real Electron window screenshots (includes WebGL via capturePage).
 *
 *   npm run build
 *   DISPLAY=:1 npx electron scripts/capture-screenshots.mjs
 */
import {
  app,
  BrowserWindow,
  ipcMain,
  protocol,
  net,
  screen
} from 'electron'
import { writeFileSync, mkdirSync, rmSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = '/opt/cursor/artifacts'
const userData = '/tmp/pet-screenshot-userdata'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

process.chdir(root)
mkdirSync(outDir, { recursive: true })
rmSync(userData, { recursive: true, force: true })
mkdirSync(userData, { recursive: true })
app.setPath('userData', userData)

app.commandLine.appendSwitch('enable-unsafe-swiftshader')
app.commandLine.appendSwitch('use-gl', 'angle')
app.commandLine.appendSwitch('use-angle', 'swiftshader')
app.commandLine.appendSwitch('enable-transparent-visuals')
app.commandLine.appendSwitch('ignore-gpu-blocklist')
app.commandLine.appendSwitch('disable-gpu-sandbox')

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

async function captureWin(win, path) {
  if (!win || win.isDestroyed()) throw new Error(`No window for ${path}`)
  win.show()
  win.focus()
  await sleep(500)
  const img = await win.webContents.capturePage()
  writeFileSync(path, img.toPNG())
  console.log('wrote', path, img.getSize())
  return img
}

function registerIpc(prefsRef) {
  ipcMain.handle('prefs:get', () => prefsRef.current)
  ipcMain.handle('prefs:set', (_e, p) => {
    prefsRef.current = p
    return prefsRef.current
  })
  ipcMain.handle('prefs:patch', (_e, patch) => {
    const cur = prefsRef.current
    prefsRef.current = {
      ...cur,
      ...patch,
      position: { ...cur.position, ...(patch.position || {}) },
      activity: { ...cur.activity, ...(patch.activity || {}) }
    }
    return prefsRef.current
  })
  ipcMain.handle('setup:complete', (_e, payload) => {
    prefsRef.current = {
      ...prefsRef.current,
      setupComplete: true,
      petId: payload.petId,
      petName: payload.petName,
      personality: payload.personality
    }
    return prefsRef.current
  })
  ipcMain.handle('ui:open-settings', () => undefined)
  ipcMain.handle('ui:open-setup', () => undefined)
  ipcMain.handle('app:quit', () => undefined)
  ipcMain.handle('display:list', () => {
    const primary = screen.getPrimaryDisplay()
    return screen.getAllDisplays().map((d) => ({
      id: d.id,
      bounds: d.bounds,
      workArea: d.workArea,
      scaleFactor: d.scaleFactor,
      primary: d.id === primary.id
    }))
  })
  ipcMain.handle('overlay:set-position', (_e, pos) => ({ ...pos, displayId: 0 }))
  ipcMain.handle('overlay:get-position', () => ({ x: 290, y: 220 }))
  ipcMain.handle('overlay:set-ignore-mouse', () => undefined)
  ipcMain.handle('overlay:set-always-on-top', () => prefsRef.current)
  ipcMain.handle('overlay:set-visible', () => prefsRef.current)
  ipcMain.handle('app:set-launch-at-startup', () => prefsRef.current)
  ipcMain.handle('assets:base-url', () => 'pet-asset://local')
}

app.whenReady().then(async () => {
  const assetRoot = join(root, 'assets', 'pets')
  protocol.handle('pet-asset', (request) => {
    try {
      const url = new URL(request.url)
      const rel = decodeURIComponent(url.pathname.replace(/^\/+/, ''))
      const absolute = join(assetRoot, rel)
      if (!absolute.startsWith(assetRoot)) {
        return new Response('Forbidden', { status: 403 })
      }
      return net.fetch(pathToFileURL(absolute).href)
    } catch {
      return new Response('Not found', { status: 404 })
    }
  })

  const prefsRef = {
    current: {
      version: 1,
      setupComplete: false,
      petId: null,
      petName: '',
      personality: 'playful',
      position: { x: 290, y: 220, displayId: null },
      activity: {
        wanderEnabled: true,
        sleepEnabled: true,
        activityLevel: 1,
        paused: true,
        alwaysOnTop: true,
        hidden: false,
        launchAtStartup: false
      }
    }
  }
  registerIpc(prefsRef)

  const preload = join(root, 'out/preload/index.js')
  const setupUrl = pathToFileURL(join(root, 'out/renderer/setup/index.html')).href
  const settingsUrl = pathToFileURL(join(root, 'out/renderer/settings/index.html')).href
  const overlayUrl = pathToFileURL(join(root, 'out/renderer/overlay/index.html')).href

  try {
    // 1) Setup with pet preview
    const setup = new BrowserWindow({
      width: 920,
      height: 640,
      show: true,
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    setup.webContents.on('console-message', (_e, _l, message) => {
      console.log('[setup]', message)
    })
    await setup.loadURL(setupUrl)
    // Wait for model load + a few animation frames
    await sleep(5000)
    await captureWin(setup, join(outDir, '01-setup-pet-preview.png'))

    // Mark setup complete for overlay/settings
    prefsRef.current = {
      ...prefsRef.current,
      setupComplete: true,
      petId: 'corgi',
      petName: 'Beans',
      personality: 'playful'
    }

    // 2) Settings
    const settings = new BrowserWindow({
      width: 480,
      height: 640,
      show: true,
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    await settings.loadURL(settingsUrl)
    await sleep(1500)
    await captureWin(settings, join(outDir, '02-settings-window.png'))

    // 3) Overlay pet on a visible background (opaque stage so Linux/X11 capture is legible)
    const stage = new BrowserWindow({
      width: 420,
      height: 420,
      show: true,
      frame: true,
      backgroundColor: '#2f5d4c',
      title: 'Overlay pet (visible backdrop)',
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    stage.webContents.on('console-message', (_e, _l, message) => {
      console.log('[overlay]', message)
    })
    await stage.loadURL(overlayUrl)
    await stage.webContents.executeJavaScript(`
      document.documentElement.style.background = 'transparent';
      document.body.style.background =
        'radial-gradient(circle at 50% 72%, rgba(255,183,3,0.28), transparent 42%), linear-gradient(165deg,#1a3a30,#3d6b5a 55%,#244d40)';
      const tag = document.getElementById('name-tag');
      if (tag) { document.body.classList.add('show-name'); }
    `)
    await sleep(5000)
    await captureWin(stage, join(outDir, '03-overlay-pet-on-background.png'))

    // Also capture a true transparent overlay window for honesty about Linux compositing
    const overlay = new BrowserWindow({
      width: 220,
      height: 220,
      show: true,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      hasShadow: false,
      alwaysOnTop: true,
      webPreferences: {
        preload,
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true
      }
    })
    await overlay.loadURL(overlayUrl)
    await sleep(4000)
    await captureWin(overlay, join(outDir, '03b-overlay-transparent-window.png'))

    console.log('All captures finished')
    app.exit(0)
  } catch (err) {
    console.error(err)
    app.exit(1)
  }
})
