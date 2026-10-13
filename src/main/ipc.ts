import { BrowserWindow, app, ipcMain } from 'electron'
import { IpcChannels } from '../shared/ipc'
import type { AppPreferences } from '../shared/types'
import { loadPreferences, updatePreferences } from './persistence'
import {
  closeSetupWindow,
  createOverlayWindow,
  createSettingsWindow,
  createSetupWindow,
  getOverlayPosition,
  listDisplays,
  setOverlayAlwaysOnTop,
  setOverlayIgnoreMouse,
  setOverlayPosition,
  setOverlayVisible
} from './windows'
import { createTray, updateTrayMenu, type TrayHandlers } from './tray'
import { assetBaseUrl } from './protocol'

let trayHandlers: TrayHandlers | null = null

function broadcastPrefs(prefs: AppPreferences): void {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(IpcChannels.prefsChanged, prefs)
  }
  if (trayHandlers) updateTrayMenu(prefs, trayHandlers)
}

export function registerIpc(): void {
  ipcMain.handle(IpcChannels.getPrefs, () => loadPreferences())

  ipcMain.handle(IpcChannels.setPrefs, (_e, prefs: AppPreferences) => {
    const saved = updatePreferences(prefs)
    applyActivitySideEffects(saved)
    broadcastPrefs(saved)
    return saved
  })

  ipcMain.handle(
    IpcChannels.patchPrefs,
    (_e, patch: Partial<AppPreferences>) => {
      const saved = updatePreferences(patch)
      applyActivitySideEffects(saved)
      broadcastPrefs(saved)
      return saved
    }
  )

  ipcMain.handle(
    IpcChannels.setupComplete,
    (
      _e,
      payload: { petId: string; petName: string; personality: AppPreferences['personality'] }
    ) => {
      const displays = listDisplays()
      const primary = displays.find((d) => d.primary) ?? displays[0]
      const saved = updatePreferences({
        setupComplete: true,
        petId: payload.petId,
        petName: payload.petName.trim().slice(0, 32) || 'Buddy',
        personality: payload.personality,
        position: {
          x: (primary?.workArea.x ?? 0) + Math.max(40, (primary?.workArea.width ?? 800) - 280),
          y: (primary?.workArea.y ?? 0) + Math.max(40, (primary?.workArea.height ?? 600) - 280),
          displayId: primary?.id ?? null
        }
      })
      closeSetupWindow()
      if (process.platform === 'darwin') app.dock?.hide()
      const overlay = createOverlayWindow(saved)
      overlay.webContents.send(IpcChannels.overlayShowPet, saved)
      ensureTray(saved)
      broadcastPrefs(saved)
      return saved
    }
  )

  ipcMain.handle(IpcChannels.openSettings, () => {
    createSettingsWindow()
  })

  ipcMain.handle(IpcChannels.openSetup, () => {
    createSetupWindow()
  })

  ipcMain.handle(IpcChannels.quit, () => {
    app.quit()
  })

  ipcMain.handle(IpcChannels.getDisplays, () => listDisplays())

  ipcMain.handle(
    IpcChannels.setOverlayPosition,
    (_e, pos: { x: number; y: number }) => {
      const next = setOverlayPosition(pos.x, pos.y)
      updatePreferences({
        position: { x: next.x, y: next.y, displayId: next.displayId }
      })
      return next
    }
  )

  ipcMain.handle(IpcChannels.getOverlayPosition, () => getOverlayPosition())

  ipcMain.handle(
    IpcChannels.setIgnoreMouse,
    (_e, payload: { ignore: boolean; forward?: boolean }) => {
      setOverlayIgnoreMouse(payload.ignore, payload.forward ?? true)
    }
  )

  ipcMain.handle(IpcChannels.setAlwaysOnTop, (_e, flag: boolean) => {
    setOverlayAlwaysOnTop(flag)
    return updatePreferences({ activity: { ...loadPreferences().activity, alwaysOnTop: flag } })
  })

  ipcMain.handle(IpcChannels.setOverlayVisible, (_e, visible: boolean) => {
    setOverlayVisible(visible)
    return updatePreferences({
      activity: { ...loadPreferences().activity, hidden: !visible }
    })
  })

  ipcMain.handle(IpcChannels.setLaunchAtStartup, (_e, enabled: boolean) => {
    try {
      app.setLoginItemSettings({ openAtLogin: enabled, path: process.execPath })
    } catch {
      // Unsupported on some Linux environments
    }
    return updatePreferences({
      activity: { ...loadPreferences().activity, launchAtStartup: enabled }
    })
  })

  ipcMain.handle(IpcChannels.getAssetBaseUrl, () => assetBaseUrl())
}

function applyActivitySideEffects(prefs: AppPreferences): void {
  setOverlayAlwaysOnTop(prefs.activity.alwaysOnTop)
  setOverlayVisible(!prefs.activity.hidden)
  try {
    app.setLoginItemSettings({
      openAtLogin: prefs.activity.launchAtStartup,
      path: process.execPath
    })
  } catch {
    /* ignore */
  }
}

export function ensureTray(prefs: AppPreferences): void {
  trayHandlers = {
    openSettings: () => createSettingsWindow(),
    togglePause: () => {
      const current = loadPreferences()
      const saved = updatePreferences({
        activity: { ...current.activity, paused: !current.activity.paused }
      })
      broadcastPrefs(saved)
    },
    toggleHide: () => {
      const current = loadPreferences()
      const hidden = !current.activity.hidden
      setOverlayVisible(!hidden)
      const saved = updatePreferences({
        activity: { ...current.activity, hidden }
      })
      broadcastPrefs(saved)
    },
    quit: () => app.quit()
  }
  createTray(prefs, trayHandlers)
}
