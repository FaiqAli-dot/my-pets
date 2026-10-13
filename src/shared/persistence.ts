import {
  createDefaultPreferences,
  DEFAULT_ACTIVITY,
  type AppPreferences,
  type PersonalityId
} from './types'
import { getPetById } from './pets'

const PERSONALITIES: PersonalityId[] = ['playful', 'relaxed', 'shy']

/** Merge unknown JSON into a valid preferences object (never throws). */
export function normalizePreferences(raw: unknown): AppPreferences {
  const defaults = createDefaultPreferences()
  if (!raw || typeof raw !== 'object') return defaults

  const r = raw as Record<string, unknown>
  const activityIn =
    r.activity && typeof r.activity === 'object'
      ? (r.activity as Record<string, unknown>)
      : {}

  const petId =
    typeof r.petId === 'string' && getPetById(r.petId) ? r.petId : defaults.petId

  const personality = PERSONALITIES.includes(r.personality as PersonalityId)
    ? (r.personality as PersonalityId)
    : defaults.personality

  const positionIn =
    r.position && typeof r.position === 'object'
      ? (r.position as Record<string, unknown>)
      : {}

  const activityLevel =
    typeof activityIn.activityLevel === 'number' &&
    Number.isFinite(activityIn.activityLevel)
      ? Math.min(2, Math.max(0.25, activityIn.activityLevel))
      : DEFAULT_ACTIVITY.activityLevel

  return {
    version: 1,
    setupComplete: Boolean(r.setupComplete) && Boolean(petId),
    petId,
    petName: typeof r.petName === 'string' ? r.petName.slice(0, 32) : '',
    personality,
    position: {
      x: num(positionIn.x, defaults.position.x),
      y: num(positionIn.y, defaults.position.y),
      displayId:
        typeof positionIn.displayId === 'number' ? positionIn.displayId : null
    },
    activity: {
      wanderEnabled: bool(activityIn.wanderEnabled, DEFAULT_ACTIVITY.wanderEnabled),
      sleepEnabled: bool(activityIn.sleepEnabled, DEFAULT_ACTIVITY.sleepEnabled),
      activityLevel,
      paused: bool(activityIn.paused, DEFAULT_ACTIVITY.paused),
      alwaysOnTop: bool(activityIn.alwaysOnTop, DEFAULT_ACTIVITY.alwaysOnTop),
      hidden: bool(activityIn.hidden, DEFAULT_ACTIVITY.hidden),
      launchAtStartup: bool(
        activityIn.launchAtStartup,
        DEFAULT_ACTIVITY.launchAtStartup
      )
    }
  }
}

export function patchPreferences(
  current: AppPreferences,
  patch: Partial<AppPreferences>
): AppPreferences {
  return normalizePreferences({
    ...current,
    ...patch,
    position: { ...current.position, ...(patch.position ?? {}) },
    activity: { ...current.activity, ...(patch.activity ?? {}) }
  })
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === 'boolean' ? v : fallback
}

/** Resolve clip name with procedural fallback when missing from definition/asset. */
export function resolveClipName(
  available: string[],
  preferred: string | undefined,
  fallbacks: string[]
): { name: string | null; usedFallback: boolean; procedural: boolean } {
  if (preferred && available.includes(preferred)) {
    return { name: preferred, usedFallback: false, procedural: false }
  }
  for (const fb of fallbacks) {
    if (available.includes(fb)) {
      return { name: fb, usedFallback: true, procedural: false }
    }
  }
  return { name: null, usedFallback: true, procedural: true }
}
