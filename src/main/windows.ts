import {
  BrowserWindow,
  app,
  screen,
  type Display
} from 'electron'
import { join } from 'path'
import type { AppPreferences, DisplayInfo } from '../shared/types'
import { clampToBounds, resolveWorkArea } from '../shared/bounds'

const OVERLAY_SIZE = 220

export { OVERLAY_SIZE }

let overlayWindow: BrowserWindow | null = null
let setupWindow: BrowserWindow | null = null
let settingsWindow: BrowserWindow | null = null

function preloadPath(): string {
  return join(__dirname, '../preload/index.js')
}

function pageUrl(name: 'overlay' | 'setup' | 'settings'): string {
  if (process.env.ELECTRON_RENDERER_URL) {
    return `${process.env.ELECTRON_RENDERER_URL}/${name}/index.html`
  }
  return `file://${join(__dirname, `../renderer/${name}/index.html`)}`
}

export function listDisplays(): DisplayInfo[] {
  const primary = screen.getPrimaryDisplay()
  return screen.getAllDisplays().map((d: Display) => ({
    id: d.id,
    bounds: d.bounds,
    workArea: d.workArea,
    scaleFactor: d.scaleFactor,
    primary: d.id === primary.id
  }))
}

export function getOverlayWindow(): BrowserWindow | null {
  return overlayWindow
}

export function createOverlayWindow(prefs: AppPreferences): BrowserWindow {
  if (overlayWindow && !overlayWindow.isDestroyed()) {
    return overlayWindow
  }

  const displays = listDisplays()
  const { displayId, workArea } = resolveWorkArea(
    displays,
    prefs.position.displayId
  )
  const clamped = clampToBounds(
    prefs.position.x,
    prefs.position.y,
    workArea,
    OVERLAY_SIZE,
    OVERLAY_SIZE
  )

  overlayWindow = new BrowserWindow({
    width: OVERLAY_SIZE,
    height: OVERLAY_SIZE,
    x: Math.round(clamped.x),
    y: Math.round(clamped.y),
    show: !prefs.activity.hidden,
    frame: false,
    transparent: true,
    backgroundColor: '#00000000',
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: prefs.activity.alwaysOnTop,
    focusable: true,
    thickFrame: false,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  const level = process.platform === 'darwin' ? 'floating' : 'screen-saver'
  overlayWindow.setAlwaysOnTop(prefs.activity.alwaysOnTop, level)
  // Start click-through; renderer enables hit-testing when pointer is over the pet
  overlayWindow.setIgnoreMouseEvents(true, { forward: true })

  void overlayWindow.loadURL(pageUrl('overlay'))

  overlayWindow.on('closed', () => {
    overlayWindow = null
  })

  // Keep position valid across display metric changes without recreating the window
  const relayout = (): void => {
    if (!overlayWindow || overlayWindow.isDestroyed()) return
    const [x, y] = overlayWindow.getPosition()
    const infos = listDisplays()
    const resolved = resolveWorkArea(infos, displayId)
    const next = clampToBounds(x, y, resolved.workArea, OVERLAY_SIZE, OVERLAY_SIZE)
    overlayWindow.setBounds({
      x: Math.round(next.x),
      y: Math.round(next.y),
      width: OVERLAY_SIZE,
      height: OVERLAY_SIZE
    })
  }

  screen.on('display-metrics-changed', relayout)
  screen.on('display-added', relayout)
  screen.on('display-removed', relayout)

  overlayWindow.on('closed', () => {
    screen.removeListener('display-metrics-changed', relayout)
    screen.removeListener('display-added', relayout)
    screen.removeListener('display-removed', relayout)
  })

  return overlayWindow
}

export function setOverlayPosition(x: number, y: number): { x: number; y: number; displayId: number } {
  const win = overlayWindow
  if (!win || win.isDestroyed()) {
    return { x, y, displayId: 0 }
  }

  const displays = listDisplays()
  const nearest = screen.getDisplayNearestPoint({ x, y })
  const workArea = nearest.workArea
  const clamped = clampToBounds(x, y, workArea, OVERLAY_SIZE, OVERLAY_SIZE)
  win.setBounds({
    x: Math.round(clamped.x),
    y: Math.round(clamped.y),
    width: OVERLAY_SIZE,
    height: OVERLAY_SIZE
  })
  return { x: clamped.x, y: clamped.y, displayId: nearest.id }
}

export function getOverlayPosition(): { x: number; y: number } {
  if (!overlayWindow || overlayWindow.isDestroyed()) return { x: 0, y: 0 }
  const [x, y] = overlayWindow.getPosition()
  return { x, y }
}

export function setOverlayIgnoreMouse(ignore: boolean, forward = true): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (ignore) {
    overlayWindow.setIgnoreMouseEvents(true, { forward })
  } else {
    overlayWindow.setIgnoreMouseEvents(false)
  }
}

export function setOverlayAlwaysOnTop(flag: boolean): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  const level = process.platform === 'darwin' ? 'floating' : 'screen-saver'
  overlayWindow.setAlwaysOnTop(flag, level)
}

export function setOverlayVisible(visible: boolean): void {
  if (!overlayWindow || overlayWindow.isDestroyed()) return
  if (visible) overlayWindow.showInactive()
  else overlayWindow.hide()
}

export function createSetupWindow(): BrowserWindow {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.focus()
    return setupWindow
  }

  setupWindow = new BrowserWindow({
    width: 920,
    height: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'Choose your pet',
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  void setupWindow.loadURL(pageUrl('setup'))
  setupWindow.once('ready-to-show', () => setupWindow?.show())
  setupWindow.on('closed', () => {
    setupWindow = null
  })
  return setupWindow
}

export function closeSetupWindow(): void {
  if (setupWindow && !setupWindow.isDestroyed()) {
    setupWindow.close()
  }
  setupWindow = null
}

export function createSettingsWindow(): BrowserWindow {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.focus()
    return settingsWindow
  }

  settingsWindow = new BrowserWindow({
    width: 480,
    height: 620,
    show: false,
    autoHideMenuBar: true,
    title: 'Pet Settings',
    resizable: true,
    minimizable: true,
    webPreferences: {
      preload: preloadPath(),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  })

  void settingsWindow.loadURL(pageUrl('settings'))
  settingsWindow.once('ready-to-show', () => settingsWindow?.show())
  settingsWindow.on('closed', () => {
    settingsWindow = null
  })
  return settingsWindow
}

export function destroyAllWindows(): void {
  for (const w of [overlayWindow, setupWindow, settingsWindow]) {
    if (w && !w.isDestroyed()) w.destroy()
  }
  overlayWindow = null
  setupWindow = null
  settingsWindow = null
}

export function getAssetRoot(): string {
  // Packaged: extraResources → Contents/Resources/pets (mac) or resources/pets
  // Dev: repo assets/pets (cwd is project root under electron-vite)
  if (app.isPackaged) {
    return join(process.resourcesPath, 'pets')
  }
  return join(process.cwd(), 'assets', 'pets')
}
