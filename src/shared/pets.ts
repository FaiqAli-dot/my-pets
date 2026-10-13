import type { PetDefinition } from './types'

/**
 * Data-driven pet catalog.
 * Assets: Gobkit Free Animal Pack (CC0 1.0) — see docs/ATTRIBUTION.md
 *
 * Clip notes (verified against shipped GLBs):
 * - Named clips: idle, attack, dead, walk
 * - No dedicated sleep clip → sleep uses slowed idle + procedural bob
 * - react maps to attack (brief personality reaction)
 */
export const PETS: PetDefinition[] = [
  {
    id: 'corgi',
    displayName: 'Corgi',
    assetPath: 'gobkit/Corgi.glb',
    thumbnailHint: 'Loyal short-legged pup',
    clips: { idle: 'idle', walk: 'walk', react: 'attack', sleep: undefined },
    scale: 1.15,
    yawOffset: 0,
    yOffset: -0.15,
    defaultPersonality: 'playful',
    baseSpeed: 110,
    hitRadius: 72
  },
  {
    id: 'duck',
    displayName: 'Duck',
    assetPath: 'gobkit/Duck.glb',
    thumbnailHint: 'Waddling waterfowl',
    clips: { idle: 'idle', walk: 'walk', react: 'attack', sleep: undefined },
    scale: 1.1,
    yawOffset: 0,
    yOffset: -0.12,
    defaultPersonality: 'playful',
    baseSpeed: 95,
    hitRadius: 68
  },
  {
    id: 'red',
    displayName: 'Red Panda',
    assetPath: 'gobkit/Red.glb',
    thumbnailHint: 'Fluffy forest friend',
    clips: { idle: 'idle', walk: 'walk', react: 'attack', sleep: undefined },
    scale: 1.05,
    yawOffset: 0,
    yOffset: -0.1,
    defaultPersonality: 'relaxed',
    baseSpeed: 85,
    hitRadius: 70
  },
  {
    id: 'platypus',
    displayName: 'Platypus',
    assetPath: 'gobkit/Platypus.glb',
    thumbnailHint: 'Curious river dweller',
    clips: { idle: 'idle', walk: 'walk', react: 'attack', sleep: undefined },
    scale: 1.05,
    yawOffset: 0,
    yOffset: -0.1,
    defaultPersonality: 'shy',
    baseSpeed: 90,
    hitRadius: 70
  },
  {
    id: 'hippo',
    displayName: 'Hippo',
    assetPath: 'gobkit/Hippo.glb',
    thumbnailHint: 'Gentle giant',
    clips: { idle: 'idle', walk: 'walk', react: 'attack', sleep: undefined },
    scale: 0.95,
    yawOffset: 0,
    yOffset: -0.08,
    defaultPersonality: 'relaxed',
    baseSpeed: 70,
    hitRadius: 78
  },
  {
    id: 'bat',
    displayName: 'Bat',
    assetPath: 'gobkit/Bat.glb',
    thumbnailHint: 'Nighttime flutter',
    clips: { idle: 'idle', walk: 'walk', react: 'attack', sleep: undefined },
    scale: 1.2,
    yawOffset: 0,
    yOffset: 0.05,
    defaultPersonality: 'shy',
    baseSpeed: 130,
    hitRadius: 64
  }
]

export function getPetById(id: string): PetDefinition | undefined {
  return PETS.find((p) => p.id === id)
}

export function getDefaultPet(): PetDefinition {
  return PETS[0]
}
