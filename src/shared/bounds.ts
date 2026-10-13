import type { BoundsRect, PetPosition } from './types'

export interface Point {
  x: number
  y: number
}

/** Clamp a point so the pet window stays fully inside work-area bounds. */
export function clampToBounds(
  x: number,
  y: number,
  workArea: BoundsRect,
  windowWidth: number,
  windowHeight: number
): Point {
  const maxX = workArea.x + Math.max(0, workArea.width - windowWidth)
  const maxY = workArea.y + Math.max(0, workArea.height - windowHeight)
  return {
    x: Math.min(Math.max(x, workArea.x), maxX),
    y: Math.min(Math.max(y, workArea.y), maxY)
  }
}

/** True if the given top-left window position is fully inside the work area. */
export function isPositionValid(
  position: PetPosition,
  workArea: BoundsRect,
  windowWidth: number,
  windowHeight: number
): boolean {
  const right = position.x + windowWidth
  const bottom = position.y + windowHeight
  return (
    position.x >= workArea.x &&
    position.y >= workArea.y &&
    right <= workArea.x + workArea.width + 0.5 &&
    bottom <= workArea.y + workArea.height + 0.5
  )
}

/**
 * Pick a wander destination inside the work area, preferring a minimum travel distance
 * when space allows. Uses a seeded RNG for tests.
 */
export function pickWanderDestination(
  current: Point,
  workArea: BoundsRect,
  windowWidth: number,
  windowHeight: number,
  random: () => number = Math.random,
  minDistance = 80
): Point {
  const maxX = workArea.x + Math.max(0, workArea.width - windowWidth)
  const maxY = workArea.y + Math.max(0, workArea.height - windowHeight)

  if (maxX <= workArea.x && maxY <= workArea.y) {
    return { x: workArea.x, y: workArea.y }
  }

  let best: Point = {
    x: workArea.x + random() * Math.max(1, maxX - workArea.x),
    y: workArea.y + random() * Math.max(1, maxY - workArea.y)
  }
  let bestDist = 0

  for (let i = 0; i < 8; i++) {
    const candidate: Point = {
      x: workArea.x + random() * Math.max(1, maxX - workArea.x),
      y: workArea.y + random() * Math.max(1, maxY - workArea.y)
    }
    const dist = Math.hypot(candidate.x - current.x, candidate.y - current.y)
    if (dist >= minDistance) {
      return candidate
    }
    if (dist > bestDist) {
      best = candidate
      bestDist = dist
    }
  }

  return best
}

/** Resolve which display to use after restart; fall back to primary work area. */
export function resolveWorkArea(
  displays: Array<{ id: number; workArea: BoundsRect; primary: boolean }>,
  preferredDisplayId: number | null
): { displayId: number; workArea: BoundsRect } {
  if (displays.length === 0) {
    return {
      displayId: 0,
      workArea: { x: 0, y: 0, width: 1920, height: 1080 }
    }
  }

  const preferred =
    preferredDisplayId != null
      ? displays.find((d) => d.id === preferredDisplayId)
      : undefined
  const primary = displays.find((d) => d.primary) ?? displays[0]
  const chosen = preferred ?? primary
  return { displayId: chosen.id, workArea: chosen.workArea }
}

/** Smoothly approach a target with elapsed-time based movement (no frame-rate jitter). */
export function stepToward(
  current: Point,
  target: Point,
  speedPxPerSec: number,
  dtSec: number
): { position: Point; arrived: boolean } {
  const dx = target.x - current.x
  const dy = target.y - current.y
  const dist = Math.hypot(dx, dy)
  const step = Math.max(0, speedPxPerSec) * Math.max(0, dtSec)

  if (dist <= step || dist < 0.5) {
    return { position: { ...target }, arrived: true }
  }

  const nx = dx / dist
  const ny = dy / dist
  return {
    position: {
      x: current.x + nx * step,
      y: current.y + ny * step
    },
    arrived: false
  }
}

/** Shortest-angle lerp for facing direction (radians). */
export function lerpAngle(from: number, to: number, t: number): number {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from))
  return from + delta * Math.min(1, Math.max(0, t))
}
