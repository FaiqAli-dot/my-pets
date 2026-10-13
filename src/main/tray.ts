import { Menu, Tray, app, nativeImage } from 'electron'
import { existsSync } from 'fs'
import { join } from 'path'
import type { AppPreferences } from '../shared/types'

let tray: Tray | null = null

export type TrayHandlers = {
  openSettings: () => void
  togglePause: () => void
  toggleHide: () => void
  quit: () => void
}

function createTrayIcon(): Electron.NativeImage {
  const candidates = [
    join(process.cwd(), 'assets', 'trayIcon.png'),
    join(__dirname, '../../assets/trayIcon.png')
  ]
  for (const p of candidates) {
    if (existsSync(p)) {
      const img = nativeImage.createFromPath(p)
      if (!img.isEmpty()) return img.resize({ width: 16, height: 16 })
    }
  }
  return nativeImage.createEmpty()
}

export function createTray(prefs: AppPreferences, handlers: TrayHandlers): Tray {
  if (tray) {
    updateTrayMenu(prefs, handlers)
    return tray
  }

  tray = new Tray(createTrayIcon())
  tray.setToolTip(
    prefs.petName ? `${prefs.petName} — Desktop Pet` : 'Desktop Pet Companion'
  )
  updateTrayMenu(prefs, handlers)
  tray.on('double-click', () => handlers.openSettings())
  tray.on('click', () => {
    // macOS menu bar: single click opens settings for discoverability
    if (process.platform === 'darwin') handlers.openSettings()
  })
  return tray
}

export function updateTrayMenu(prefs: AppPreferences, handlers: TrayHandlers): void {
  if (!tray) return
  const paused = prefs.activity.paused
  const hidden = prefs.activity.hidden
  const menu = Menu.buildFromTemplate([
    {
      label: prefs.petName ? `Pet: ${prefs.petName}` : 'Desktop Pet Companion',
      enabled: false
    },
    { type: 'separator' },
    { label: 'Settings…', click: () => handlers.openSettings() },
    {
      label: paused ? 'Resume' : 'Pause',
      click: () => handlers.togglePause()
    },
    {
      label: hidden ? 'Show pet' : 'Hide pet',
      click: () => handlers.toggleHide()
    },
    { type: 'separator' },
    { label: 'Quit', click: () => handlers.quit() }
  ])
  tray.setContextMenu(menu)
  tray.setToolTip(
    prefs.petName ? `${prefs.petName} — Desktop Pet` : 'Desktop Pet Companion'
  )
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}

void app
