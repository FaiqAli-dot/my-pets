import { describe, expect, it } from 'vitest'
import {
  clampToBounds,
  isPositionValid,
  lerpAngle,
  pickWanderDestination,
  resolveWorkArea,
  stepToward
} from '../shared/bounds'

const work = { x: 100, y: 50, width: 1000, height: 700 }

describe('clampToBounds', () => {
  it('keeps the window inside the work area', () => {
    expect(clampToBounds(-10, -10, work, 220, 220)).toEqual({ x: 100, y: 50 })
    expect(clampToBounds(5000, 5000, work, 220, 220)).toEqual({
      x: 100 + 1000 - 220,
      y: 50 + 700 - 220
    })
  })
})

describe('isPositionValid', () => {
  it('accepts fully contained positions and rejects overflow', () => {
    expect(
      isPositionValid({ x: 120, y: 60, displayId: 1 }, work, 220, 220)
    ).toBe(true)
    expect(
      isPositionValid({ x: 950, y: 60, displayId: 1 }, work, 220, 220)
    ).toBe(false)
  })
})

describe('pickWanderDestination', () => {
  it('returns a point inside bounds with deterministic RNG', () => {
    let i = 0
    const seq = [0.1, 0.2, 0.9, 0.8, 0.3, 0.4, 0.7, 0.6, 0.5, 0.55]
    const random = (): number => seq[i++ % seq.length]
    const dest = pickWanderDestination(
      { x: 120, y: 60 },
      work,
      220,
      220,
      random,
      80
    )
    expect(dest.x).toBeGreaterThanOrEqual(work.x)
    expect(dest.y).toBeGreaterThanOrEqual(work.y)
    expect(dest.x).toBeLessThanOrEqual(work.x + work.width - 220)
    expect(dest.y).toBeLessThanOrEqual(work.y + work.height - 220)
  })
})

describe('resolveWorkArea', () => {
  it('prefers the last monitor then falls back to primary', () => {
    const displays = [
      {
        id: 1,
        primary: true,
        workArea: { x: 0, y: 0, width: 1440, height: 900 }
      },
      {
        id: 2,
        primary: false,
        workArea: { x: 1440, y: 0, width: 1920, height: 1080 }
      }
    ]
    expect(resolveWorkArea(displays, 2).displayId).toBe(2)
    expect(resolveWorkArea(displays, 99).displayId).toBe(1)
  })
})

describe('stepToward', () => {
  it('moves by elapsed-time distance and reports arrival', () => {
    const mid = stepToward({ x: 0, y: 0 }, { x: 100, y: 0 }, 50, 0.5)
    expect(mid.arrived).toBe(false)
    expect(mid.position.x).toBeCloseTo(25)
    const end = stepToward({ x: 90, y: 0 }, { x: 100, y: 0 }, 50, 0.5)
    expect(end.arrived).toBe(true)
    expect(end.position).toEqual({ x: 100, y: 0 })
  })
})

describe('lerpAngle', () => {
  it('takes the short path around the circle', () => {
    expect(lerpAngle(0, Math.PI / 2, 0.5)).toBeCloseTo(Math.PI / 4, 5)
    const from = Math.PI - 0.1
    const to = -Math.PI + 0.1
    const mid = lerpAngle(from, to, 0.5)
    // Short arc length is 0.2; midpoint should be ~0.1 along that arc (near ±π)
    const traveled = Math.abs(Math.atan2(Math.sin(mid - from), Math.cos(mid - from)))
    expect(traveled).toBeCloseTo(0.1, 5)
    // Must not go the long way through 0
    expect(Math.abs(Math.atan2(Math.sin(mid), Math.cos(mid)))).toBeGreaterThan(2)
  })
})
