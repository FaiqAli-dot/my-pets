import { app, BrowserWindow } from 'electron'
import { loadPreferences } from './persistence'
import { registerIpc, ensureTray } from './ipc'
import {
  createOverlayWindow,
  createSetupWindow,
  destroyAllWindows
} from './windows'
import { destroyTray } from './tray'
import { handleAssetProtocol, registerAssetScheme } from './protocol'

registerAssetScheme()

// Prevent multiple instances
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const prefs = loadPreferences()
    if (!prefs.setupComplete) createSetupWindow()
    else {
      const wins = BrowserWindow.getAllWindows()
      if (wins[0]) {
        if (wins[0].isMinimized()) wins[0].restore()
        wins[0].focus()
      }
    }
  })

  app.whenReady().then(() => {
    handleAssetProtocol()
    registerIpc()

    const prefs = loadPreferences()

    // macOS: agent-style (LSUIElement) — keep dock hidden once the pet is running.
    // Show dock during first-run setup so the wizard is easy to find.
    if (process.platform === 'darwin') {
      if (prefs.setupComplete) app.dock?.hide()
      else app.dock?.show()
    }

    if (!prefs.setupComplete) {
      createSetupWindow()
    } else {
      createOverlayWindow(prefs)
      ensureTray(prefs)
    }

    app.on('activate', () => {
      const current = loadPreferences()
      if (BrowserWindow.getAllWindows().length === 0) {
        if (!current.setupComplete) createSetupWindow()
        else {
          createOverlayWindow(current)
          ensureTray(current)
        }
      }
    })
  })

  app.on('window-all-closed', () => {
    const prefs = loadPreferences()
    // Desktop pet stays alive in the menu bar / tray after setup.
    // If the user closes setup without finishing, quit.
    if (!prefs.setupComplete) app.quit()
  })

  app.on('before-quit', () => {
    destroyTray()
    destroyAllWindows()
  })
}
