import { describe, expect, it } from 'vitest'
import { BehaviorMachine, classifyPointerEnd } from '../shared/behavior'
import { getPersonality } from '../shared/personalities'

describe('personality params', () => {
  it('exposes distinct wander/sleep/flee profiles', () => {
    const playful = getPersonality('playful')
    const relaxed = getPersonality('relaxed')
    const shy = getPersonality('shy')
    expect(playful.wanderIntervalSec[0]).toBeLessThan(relaxed.wanderIntervalSec[0])
    expect(relaxed.sleepChance).toBeGreaterThan(playful.sleepChance)
    expect(shy.fleeFromCursor).toBeGreaterThan(playful.fleeFromCursor)
    expect(playful.preferredClickReactions.length).toBeGreaterThan(0)
  })
})

describe('BehaviorMachine transitions', () => {
  it('enters WANDER from IDLE when wander is enabled', () => {
    let t = 0
    const machine = new BehaviorMachine({
      personality: 'playful',
      wanderEnabled: true,
      sleepEnabled: false,
      activityLevel: 1,
      paused: false,
      random: () => 0.99,
      now: () => t
    })
    expect(machine.getState()).toBe('IDLE')
    t = machine.getSnapshot().nextDecisionAt + 0.01
    machine.dispatch({ type: 'tick', dt: 0.016 })
    expect(machine.getState()).toBe('WANDER')
    machine.dispatch({ type: 'arrive' })
    expect(machine.getState()).toBe('IDLE')
  })

  it('can sleep from idle when chance hits', () => {
    let t = 0
    const machine = new BehaviorMachine({
      personality: 'relaxed',
      wanderEnabled: true,
      sleepEnabled: true,
      activityLevel: 1,
      paused: false,
      random: () => 0.01,
      now: () => t
    })
    t = machine.getSnapshot().nextDecisionAt + 0.01
    machine.dispatch({ type: 'tick', dt: 0.016 })
    expect(machine.getState()).toBe('SLEEP')
    machine.dispatch({ type: 'click' })
    expect(machine.getState()).toBe('IDLE')
  })

  it('reacts to click without stacking', () => {
    let t = 0
    const machine = new BehaviorMachine({
      personality: 'playful',
      wanderEnabled: true,
      sleepEnabled: true,
      activityLevel: 1,
      paused: false,
      random: () => 0,
      now: () => t
    })
    machine.dispatch({ type: 'click' })
    expect(machine.getState()).toBe('REACT')
    const kind = machine.getSnapshot().reactionKind
    machine.dispatch({ type: 'click' })
    expect(machine.getState()).toBe('REACT')
    expect(machine.getSnapshot().reactionKind).toBe(kind)
  })

  it('does not wake from sleep on hover', () => {
    let t = 0
    const machine = new BehaviorMachine({
      personality: 'relaxed',
      wanderEnabled: false,
      sleepEnabled: true,
      activityLevel: 1,
      paused: false,
      random: () => 0,
      now: () => t
    })
    t = machine.getSnapshot().nextDecisionAt + 0.01
    machine.dispatch({ type: 'tick', dt: 0.016 })
    expect(machine.getState()).toBe('SLEEP')
    machine.dispatch({ type: 'hover' })
    expect(machine.getState()).toBe('SLEEP')
  })

  it('drag end does not fire a click reaction path', () => {
    let t = 0
    const machine = new BehaviorMachine({
      personality: 'playful',
      wanderEnabled: true,
      sleepEnabled: true,
      activityLevel: 1,
      paused: false,
      random: () => 0,
      now: () => t
    })
    machine.dispatch({ type: 'dragStart' })
    expect(machine.getState()).toBe('DRAGGED')
    machine.dispatch({ type: 'dragEnd' })
    expect(machine.getState()).toBe('IDLE')
    expect(machine.getSnapshot().reactionKind).toBeNull()
  })
})

describe('classifyPointerEnd', () => {
  it('distinguishes drag vs click by threshold', () => {
    expect(
      classifyPointerEnd({ dragged: false, movedDistance: 2, dragThresholdPx: 6 })
    ).toBe('click')
    expect(
      classifyPointerEnd({ dragged: false, movedDistance: 10, dragThresholdPx: 6 })
    ).toBe('dragEnd')
    expect(
      classifyPointerEnd({ dragged: true, movedDistance: 1, dragThresholdPx: 6 })
    ).toBe('dragEnd')
  })
})
