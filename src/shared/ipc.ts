/** Typed IPC channel names and payload shapes. */

export const IpcChannels = {
  getPrefs: 'prefs:get',
  setPrefs: 'prefs:set',
  patchPrefs: 'prefs:patch',
  setupComplete: 'setup:complete',
  openSettings: 'ui:open-settings',
  openSetup: 'ui:open-setup',
  quit: 'app:quit',
  getDisplays: 'display:list',
  setOverlayPosition: 'overlay:set-position',
  getOverlayPosition: 'overlay:get-position',
  setIgnoreMouse: 'overlay:set-ignore-mouse',
  setAlwaysOnTop: 'overlay:set-always-on-top',
  setOverlayVisible: 'overlay:set-visible',
  setLaunchAtStartup: 'app:set-launch-at-startup',
  getAssetBaseUrl: 'assets:base-url',
  prefsChanged: 'prefs:changed',
  overlayShowPet: 'overlay:show-pet'
} as const

export type IpcChannel = (typeof IpcChannels)[keyof typeof IpcChannels]
