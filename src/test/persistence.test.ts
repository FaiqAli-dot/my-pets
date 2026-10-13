import { describe, expect, it } from 'vitest'
import {
  normalizePreferences,
  patchPreferences,
  resolveClipName
} from '../shared/persistence'
import { createDefaultPreferences } from '../shared/types'

describe('normalizePreferences', () => {
  it('returns defaults for garbage input', () => {
    expect(normalizePreferences(null).version).toBe(1)
    expect(normalizePreferences('nope').setupComplete).toBe(false)
  })

  it('clamps activity and validates pet ids', () => {
    const prefs = normalizePreferences({
      setupComplete: true,
      petId: 'not-a-pet',
      petName: 'A'.repeat(100),
      personality: 'chaotic',
      activity: { activityLevel: 99, wanderEnabled: true }
    })
    expect(prefs.petId).toBeNull()
    expect(prefs.setupComplete).toBe(false)
    expect(prefs.petName.length).toBe(32)
    expect(prefs.personality).toBe('playful')
    expect(prefs.activity.activityLevel).toBe(2)
  })

  it('keeps a valid configured pet across restarts', () => {
    const prefs = normalizePreferences({
      setupComplete: true,
      petId: 'corgi',
      petName: 'Beans',
      personality: 'shy',
      position: { x: 10, y: 20, displayId: 3 },
      activity: {
        wanderEnabled: false,
        sleepEnabled: true,
        activityLevel: 0.5,
        paused: true,
        alwaysOnTop: false,
        hidden: true,
        launchAtStartup: true
      }
    })
    expect(prefs.petId).toBe('corgi')
    expect(prefs.petName).toBe('Beans')
    expect(prefs.personality).toBe('shy')
    expect(prefs.position.displayId).toBe(3)
    expect(prefs.activity.wanderEnabled).toBe(false)
    expect(prefs.activity.launchAtStartup).toBe(true)
  })
})

describe('patchPreferences', () => {
  it('merges nested activity without wiping siblings', () => {
    const base = createDefaultPreferences()
    base.activity.wanderEnabled = true
    base.activity.sleepEnabled = true
    const next = patchPreferences(base, {
      activity: { ...base.activity, paused: true }
    })
    expect(next.activity.paused).toBe(true)
    expect(next.activity.wanderEnabled).toBe(true)
    expect(next.activity.sleepEnabled).toBe(true)
  })
})

describe('resolveClipName', () => {
  it('uses preferred clip when present', () => {
    expect(resolveClipName(['idle', 'walk', 'attack'], 'walk', ['idle'])).toEqual({
      name: 'walk',
      usedFallback: false,
      procedural: false
    })
  })

  it('falls back without returning broken refs', () => {
    expect(resolveClipName(['idle'], 'sleep', ['idle', 'walk'])).toEqual({
      name: 'idle',
      usedFallback: true,
      procedural: false
    })
  })

  it('marks procedural when nothing is available', () => {
    expect(resolveClipName([], 'sleep', ['idle'])).toEqual({
      name: null,
      usedFallback: true,
      procedural: true
    })
  })
})
