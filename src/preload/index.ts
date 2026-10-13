import { contextBridge, ipcRenderer } from 'electron'
import { IpcChannels } from '../shared/ipc'
import type { AppPreferences, DisplayInfo, PersonalityId } from '../shared/types'

export interface PetApi {
  getPrefs: () => Promise<AppPreferences>
  setPrefs: (prefs: AppPreferences) => Promise<AppPreferences>
  patchPrefs: (patch: Partial<AppPreferences>) => Promise<AppPreferences>
  completeSetup: (payload: {
    petId: string
    petName: string
    personality: PersonalityId
  }) => Promise<AppPreferences>
  openSettings: () => Promise<void>
  openSetup: () => Promise<void>
  quit: () => Promise<void>
  getDisplays: () => Promise<DisplayInfo[]>
  setOverlayPosition: (pos: { x: number; y: number }) => Promise<{
    x: number
    y: number
    displayId: number
  }>
  getOverlayPosition: () => Promise<{ x: number; y: number }>
  setIgnoreMouse: (ignore: boolean, forward?: boolean) => Promise<void>
  setAlwaysOnTop: (flag: boolean) => Promise<AppPreferences>
  setOverlayVisible: (visible: boolean) => Promise<AppPreferences>
  setLaunchAtStartup: (enabled: boolean) => Promise<AppPreferences>
  getAssetBaseUrl: () => Promise<string>
  onPrefsChanged: (cb: (prefs: AppPreferences) => void) => () => void
  onShowPet: (cb: (prefs: AppPreferences) => void) => () => void
}

const api: PetApi = {
  getPrefs: () => ipcRenderer.invoke(IpcChannels.getPrefs),
  setPrefs: (prefs) => ipcRenderer.invoke(IpcChannels.setPrefs, prefs),
  patchPrefs: (patch) => ipcRenderer.invoke(IpcChannels.patchPrefs, patch),
  completeSetup: (payload) => ipcRenderer.invoke(IpcChannels.setupComplete, payload),
  openSettings: () => ipcRenderer.invoke(IpcChannels.openSettings),
  openSetup: () => ipcRenderer.invoke(IpcChannels.openSetup),
  quit: () => ipcRenderer.invoke(IpcChannels.quit),
  getDisplays: () => ipcRenderer.invoke(IpcChannels.getDisplays),
  setOverlayPosition: (pos) => ipcRenderer.invoke(IpcChannels.setOverlayPosition, pos),
  getOverlayPosition: () => ipcRenderer.invoke(IpcChannels.getOverlayPosition),
  setIgnoreMouse: (ignore, forward = true) =>
    ipcRenderer.invoke(IpcChannels.setIgnoreMouse, { ignore, forward }),
  setAlwaysOnTop: (flag) => ipcRenderer.invoke(IpcChannels.setAlwaysOnTop, flag),
  setOverlayVisible: (visible) =>
    ipcRenderer.invoke(IpcChannels.setOverlayVisible, visible),
  setLaunchAtStartup: (enabled) =>
    ipcRenderer.invoke(IpcChannels.setLaunchAtStartup, enabled),
  getAssetBaseUrl: () => ipcRenderer.invoke(IpcChannels.getAssetBaseUrl),
  onPrefsChanged: (cb) => {
    const listener = (_: Electron.IpcRendererEvent, prefs: AppPreferences): void =>
      cb(prefs)
    ipcRenderer.on(IpcChannels.prefsChanged, listener)
    return () => ipcRenderer.removeListener(IpcChannels.prefsChanged, listener)
  },
  onShowPet: (cb) => {
    const listener = (_: Electron.IpcRendererEvent, prefs: AppPreferences): void =>
      cb(prefs)
    ipcRenderer.on(IpcChannels.overlayShowPet, listener)
    return () => ipcRenderer.removeListener(IpcChannels.overlayShowPet, listener)
  }
}

contextBridge.exposeInMainWorld('petApi', api)

declare global {
  interface Window {
    petApi: PetApi
  }
}
