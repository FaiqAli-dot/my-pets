import { getPersonality } from './personalities'
import type {
  PersonalityId,
  PersonalityParams,
  PetState,
  ReactionKind
} from './types'

export interface BehaviorConfig {
  personality: PersonalityId
  wanderEnabled: boolean
  sleepEnabled: boolean
  activityLevel: number
  paused: boolean
  random?: () => number
  now?: () => number
}

export interface BehaviorSnapshot {
  state: PetState
  reactionKind: ReactionKind | null
  stateEnteredAt: number
  nextDecisionAt: number
  hoverCooldownUntil: number
}

export type BehaviorEvent =
  | { type: 'tick'; dt: number }
  | { type: 'hover' }
  | { type: 'click' }
  | { type: 'dragStart' }
  | { type: 'dragEnd' }
  | { type: 'arrive' }
  | { type: 'wake' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'setConfig'; config: Partial<BehaviorConfig> }

function randRange(random: () => number, min: number, max: number): number {
  return min + random() * (max - min)
}

function scaleTime(sec: number, activityLevel: number): number {
  const level = Math.min(2, Math.max(0.25, activityLevel))
  // Higher activity → shorter waits
  return sec / level
}

export class BehaviorMachine {
  private state: PetState = 'IDLE'
  private reactionKind: ReactionKind | null = null
  private stateEnteredAt: number
  private nextDecisionAt: number
  private hoverCooldownUntil = 0
  private config: BehaviorConfig
  private readonly random: () => number
  private readonly now: () => number
  private reactEndsAt = 0

  constructor(config: BehaviorConfig) {
    this.config = config
    this.random = config.random ?? Math.random
    this.now = config.now ?? (() => performance.now() / 1000)
    const t = this.now()
    this.stateEnteredAt = t
    this.nextDecisionAt = t + this.pickIdleWait()
  }

  getSnapshot(): BehaviorSnapshot {
    return {
      state: this.state,
      reactionKind: this.reactionKind,
      stateEnteredAt: this.stateEnteredAt,
      nextDecisionAt: this.nextDecisionAt,
      hoverCooldownUntil: this.hoverCooldownUntil
    }
  }

  getState(): PetState {
    return this.state
  }

  getPersonality(): PersonalityParams {
    return getPersonality(this.config.personality)
  }

  dispatch(event: BehaviorEvent): BehaviorSnapshot {
    if (event.type === 'setConfig') {
      this.config = { ...this.config, ...event.config }
      return this.getSnapshot()
    }

    if (this.config.paused && event.type !== 'resume' && event.type !== 'dragStart') {
      if (event.type === 'pause') return this.getSnapshot()
      return this.getSnapshot()
    }

    switch (event.type) {
      case 'pause':
        this.config.paused = true
        break
      case 'resume':
        this.config.paused = false
        this.scheduleIdleDecision()
        break
      case 'dragStart':
        this.enter('DRAGGED')
        break
      case 'dragEnd':
        // No click reaction after drag
        this.enter('IDLE')
        this.scheduleIdleDecision()
        break
      case 'click':
        this.handleClick()
        break
      case 'hover':
        this.handleHover()
        break
      case 'arrive':
        if (this.state === 'WANDER') {
          this.enter('IDLE')
          this.scheduleIdleDecision()
        }
        break
      case 'wake':
        if (this.state === 'SLEEP') {
          this.enter('IDLE')
          this.scheduleIdleDecision()
        }
        break
      case 'tick':
        this.handleTick()
        break
      default:
        break
    }

    return this.getSnapshot()
  }

  private handleTick(): void {
    const t = this.now()

    if (this.state === 'REACT' && t >= this.reactEndsAt) {
      this.enter('IDLE')
      this.scheduleIdleDecision()
      return
    }

    if (this.state === 'SLEEP' && t >= this.nextDecisionAt) {
      this.enter('IDLE')
      this.scheduleIdleDecision()
      return
    }

    if (this.state === 'IDLE' && t >= this.nextDecisionAt) {
      this.decideFromIdle()
    }
  }

  private handleClick(): void {
    if (this.state === 'DRAGGED') return

    if (this.state === 'SLEEP') {
      this.enter('IDLE')
      this.scheduleIdleDecision()
      return
    }

    // Don't stack reactions
    if (this.state === 'REACT') return

    const p = this.getPersonality()
    if (this.random() > p.reactionProbability) {
      return
    }

    const kinds = p.preferredClickReactions
    this.reactionKind = kinds[Math.floor(this.random() * kinds.length)] ?? 'hop'
    const duration = scaleTime(0.9 * p.reactionIntensity, 1)
    this.enter('REACT')
    this.reactEndsAt = this.now() + duration
  }

  private handleHover(): void {
    const t = this.now()
    if (t < this.hoverCooldownUntil) return
    if (this.state === 'DRAGGED' || this.state === 'REACT') return

    // Don't wake sleep on every micro-move / hover
    if (this.state === 'SLEEP') return

    const p = this.getPersonality()
    this.hoverCooldownUntil = t + p.hoverCooldownSec

    if (this.random() < p.fleeFromCursor) {
      this.reactionKind = 'flee'
      this.enter('REACT')
      this.reactEndsAt = t + 0.7
      return
    }

    // Casual glance / leave — brief react then back to idle/wander decision
    this.reactionKind = 'glance'
    this.enter('REACT')
    this.reactEndsAt = t + 0.55
  }

  private decideFromIdle(): void {
    const p = this.getPersonality()

    if (this.config.sleepEnabled && this.random() < p.sleepChance) {
      const dur = scaleTime(
        randRange(this.random, p.sleepDurationSec[0], p.sleepDurationSec[1]),
        this.config.activityLevel
      )
      this.enter('SLEEP')
      this.nextDecisionAt = this.now() + dur
      return
    }

    if (this.config.wanderEnabled) {
      this.enter('WANDER')
      return
    }

    this.scheduleIdleDecision()
  }

  private scheduleIdleDecision(): void {
    this.nextDecisionAt = this.now() + this.pickIdleWait()
  }

  private pickIdleWait(): number {
    const p = this.getPersonality()
    // Blend idle duration with wander interval feel
    const base = randRange(this.random, p.idleDurationSec[0], p.idleDurationSec[1])
    const wanderBias = randRange(
      this.random,
      p.wanderIntervalSec[0],
      p.wanderIntervalSec[1]
    )
    const wait = (base + wanderBias * 0.35) / 1.35
    return scaleTime(wait, this.config.activityLevel)
  }

  private enter(state: PetState): void {
    this.state = state
    this.stateEnteredAt = this.now()
    // Keep reactionKind only while REACT is active (animation consumers read it).
    if (state !== 'REACT') {
      this.reactionKind = null
    }
  }
}

/** Detect whether a pointer-up should count as click or drag end. */
export function classifyPointerEnd(opts: {
  dragged: boolean
  movedDistance: number
  dragThresholdPx: number
}): 'click' | 'dragEnd' {
  if (opts.dragged || opts.movedDistance >= opts.dragThresholdPx) {
    return 'dragEnd'
  }
  return 'click'
}
