/** Shared types for main, preload, and renderer. */

export type PetState = 'IDLE' | 'WANDER' | 'SLEEP' | 'REACT' | 'DRAGGED'

export type PersonalityId = 'playful' | 'relaxed' | 'shy'

export type ReactionKind = 'spin' | 'hop' | 'glance' | 'flee' | 'nuzzle'

export interface ClipMap {
  idle?: string
  walk?: string
  react?: string
  sleep?: string
}

export interface PetDefinition {
  id: string
  displayName: string
  assetPath: string
  thumbnailHint: string
  clips: ClipMap
  /** Uniform scale applied after load. */
  scale: number
  /** Yaw offset in radians (models face +Z by default). */
  yawOffset: number
  /** Vertical offset so feet sit nicely in the overlay window. */
  yOffset: number
  defaultPersonality: PersonalityId
  /** Base wander speed in screen px/sec before activity multiplier. */
  baseSpeed: number
  /** Approximate hit radius in overlay-local pixels for mouse. */
  hitRadius: number
}

export interface PersonalityParams {
  id: PersonalityId
  displayName: string
  description: string
  /** Mean seconds between wander starts while idle. */
  wanderIntervalSec: [number, number]
  /** Idle hold duration range before considering wander/sleep. */
  idleDurationSec: [number, number]
  /** Chance per idle decision tick to start sleeping (0–1). */
  sleepChance: number
  sleepDurationSec: [number, number]
  /** Probability of reacting to a click (0–1). */
  reactionProbability: number
  /** Multiplier for reaction animation intensity / duration. */
  reactionIntensity: number
  /** Likelihood of fleeing cursor on hover (0–1). */
  fleeFromCursor: number
  preferredClickReactions: ReactionKind[]
  /** Hover glance cooldown seconds. */
  hoverCooldownSec: number
}

export interface ActivitySettings {
  wanderEnabled: boolean
  sleepEnabled: boolean
  /** 0.25 – 2.0, scales timers and move speed. */
  activityLevel: number
  paused: boolean
  alwaysOnTop: boolean
  hidden: boolean
  launchAtStartup: boolean
}

export interface PetPosition {
  x: number
  y: number
  displayId: number | null
}

export interface AppPreferences {
  version: 1
  setupComplete: boolean
  petId: string | null
  petName: string
  personality: PersonalityId
  position: PetPosition
  activity: ActivitySettings
}

export interface BoundsRect {
  x: number
  y: number
  width: number
  height: number
}

export interface DisplayInfo {
  id: number
  bounds: BoundsRect
  workArea: BoundsRect
  scaleFactor: number
  primary: boolean
}

export const DEFAULT_ACTIVITY: ActivitySettings = {
  wanderEnabled: true,
  sleepEnabled: true,
  activityLevel: 1,
  paused: false,
  alwaysOnTop: true,
  hidden: false,
  launchAtStartup: false
}

export function createDefaultPreferences(): AppPreferences {
  return {
    version: 1,
    setupComplete: false,
    petId: null,
    petName: '',
    personality: 'playful',
    position: { x: 120, y: 120, displayId: null },
    activity: { ...DEFAULT_ACTIVITY }
  }
}
