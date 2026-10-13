import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import {
  createDefaultPreferences,
  type AppPreferences
} from '../shared/types'
import { normalizePreferences, patchPreferences } from '../shared/persistence'

const FILE_NAME = 'preferences.json'

export function getPrefsPath(): string {
  return join(app.getPath('userData'), FILE_NAME)
}

export function loadPreferences(): AppPreferences {
  const path = getPrefsPath()
  try {
    if (!existsSync(path)) return createDefaultPreferences()
    const raw = JSON.parse(readFileSync(path, 'utf8'))
    return normalizePreferences(raw)
  } catch {
    return createDefaultPreferences()
  }
}

export function savePreferences(prefs: AppPreferences): void {
  const dir = app.getPath('userData')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const normalized = normalizePreferences(prefs)
  writeFileSync(getPrefsPath(), JSON.stringify(normalized, null, 2), 'utf8')
}

export function updatePreferences(
  patch: Partial<AppPreferences>
): AppPreferences {
  const next = patchPreferences(loadPreferences(), patch)
  savePreferences(next)
  return next
}
