import type { PersonalityId, PersonalityParams } from './types'

export const PERSONALITIES: Record<PersonalityId, PersonalityParams> = {
  playful: {
    id: 'playful',
    displayName: 'Playful',
    description: 'Wanders often, reacts eagerly, rarely flees.',
    wanderIntervalSec: [2.5, 5],
    idleDurationSec: [1.5, 4],
    sleepChance: 0.08,
    sleepDurationSec: [8, 16],
    reactionProbability: 0.95,
    reactionIntensity: 1.25,
    fleeFromCursor: 0.08,
    preferredClickReactions: ['hop', 'spin', 'nuzzle'],
    hoverCooldownSec: 2.5
  },
  relaxed: {
    id: 'relaxed',
    displayName: 'Relaxed',
    description: 'Slow wander, naps often, gentle reactions.',
    wanderIntervalSec: [6, 12],
    idleDurationSec: [4, 9],
    sleepChance: 0.28,
    sleepDurationSec: [14, 28],
    reactionProbability: 0.7,
    reactionIntensity: 0.85,
    fleeFromCursor: 0.12,
    preferredClickReactions: ['nuzzle', 'glance', 'hop'],
    hoverCooldownSec: 4
  },
  shy: {
    id: 'shy',
    displayName: 'Shy',
    description: 'Short bursts of movement, may flee the cursor.',
    wanderIntervalSec: [4, 8],
    idleDurationSec: [3, 7],
    sleepChance: 0.16,
    sleepDurationSec: [10, 20],
    reactionProbability: 0.55,
    reactionIntensity: 0.7,
    fleeFromCursor: 0.55,
    preferredClickReactions: ['glance', 'flee', 'hop'],
    hoverCooldownSec: 3.2
  }
}

export function getPersonality(id: PersonalityId): PersonalityParams {
  return PERSONALITIES[id] ?? PERSONALITIES.playful
}

export const PERSONALITY_LIST = Object.values(PERSONALITIES)
