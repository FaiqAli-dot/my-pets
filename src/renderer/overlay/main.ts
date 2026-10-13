import { BehaviorMachine, classifyPointerEnd } from '../../shared/behavior'
import { pickWanderDestination, stepToward } from '../../shared/bounds'
import { getPetById, getDefaultPet } from '../../shared/pets'
import type { AppPreferences, PetDefinition } from '../../shared/types'
import { PetRenderer } from './pet-renderer'

const DRAG_THRESHOLD = 6
const WINDOW_SIZE = 220

const hitEl = document.getElementById('hit') as HTMLDivElement
const nameTag = document.getElementById('name-tag') as HTMLDivElement
const appEl = document.getElementById('app') as HTMLDivElement

const api = window.petApi
const renderer = new PetRenderer(appEl)

let prefs: AppPreferences
let petDef: PetDefinition = getDefaultPet()
let machine: BehaviorMachine
let assetBase = ''
let lastClip = ''
let wanderTarget: { x: number; y: number } | null = null
let displayWorkArea = { x: 0, y: 0, width: 1920, height: 1080 }
let lastTs = performance.now()
let pointerOver = false
let dragging = false
let dragArmed = false
let dragOrigin = { x: 0, y: 0 }
let dragGrabOffset = { x: 0, y: 0 }
let movedDistance = 0
let nameHideTimer: number | null = null

async function refreshDisplays(): Promise<void> {
  const displays = await api.getDisplays()
  const id = prefs.position.displayId
  const d =
    (id != null ? displays.find((x) => x.id === id) : undefined) ??
    displays.find((x) => x.primary) ??
    displays[0]
  if (d) displayWorkArea = d.workArea
}

function applyPrefs(next: AppPreferences): void {
  prefs = next
  nameTag.textContent = prefs.petName || petDef.displayName
  machine?.dispatch({
    type: 'setConfig',
    config: {
      personality: prefs.personality,
      wanderEnabled: prefs.activity.wanderEnabled,
      sleepEnabled: prefs.activity.sleepEnabled,
      activityLevel: prefs.activity.activityLevel,
      paused: prefs.activity.paused
    }
  })
  if (prefs.activity.paused) machine?.dispatch({ type: 'pause' })
  else machine?.dispatch({ type: 'resume' })
}

async function loadCurrentPet(): Promise<void> {
  const def = (prefs.petId && getPetById(prefs.petId)) || getDefaultPet()
  petDef = def
  nameTag.textContent = prefs.petName || def.displayName
  await renderer.setPet(def, assetBase)
  lastClip = ''
  syncClip()
}

function syncClip(): void {
  const state = machine.getState()
  const snap = machine.getSnapshot()
  let clip: 'idle' | 'walk' | 'react' | 'sleep' = 'idle'
  if (state === 'WANDER' || (state === 'REACT' && snap.reactionKind === 'flee')) {
    clip = 'walk'
  } else if (state === 'SLEEP') {
    clip = 'sleep'
  } else if (state === 'REACT') {
    clip = 'react'
  } else if (state === 'DRAGGED') {
    clip = 'idle'
  }

  const key = `${state}:${clip}:${snap.reactionKind ?? ''}`
  if (key !== lastClip) {
    lastClip = key
    renderer.playLogical(clip, { loop: clip !== 'react' })
    if (state === 'REACT') renderer.triggerReactionEffect(snap.reactionKind)
  }
}

function showNameBriefly(): void {
  document.body.classList.add('show-name')
  if (nameHideTimer) window.clearTimeout(nameHideTimer)
  nameHideTimer = window.setTimeout(() => {
    document.body.classList.remove('show-name')
  }, 1600)
}

async function beginWander(): Promise<void> {
  const pos = await api.getOverlayPosition()
  wanderTarget = pickWanderDestination(pos, displayWorkArea, WINDOW_SIZE, WINDOW_SIZE)
}

async function tick(now: number): Promise<void> {
  const dt = Math.min(0.05, (now - lastTs) / 1000)
  lastTs = now

  const prevState = machine.getState()
  machine.dispatch({ type: 'tick', dt })
  const state = machine.getState()

  if (!prefs.activity.paused && state === 'WANDER' && prevState !== 'WANDER') {
    await beginWander()
  }

  if (!prefs.activity.paused && state === 'WANDER' && wanderTarget && !dragging) {
    const pos = await api.getOverlayPosition()
    const speed =
      petDef.baseSpeed * Math.min(2, Math.max(0.25, prefs.activity.activityLevel))
    const { position, arrived } = stepToward(pos, wanderTarget, speed, dt)
    renderer.setFacingFromDelta(position.x - pos.x, position.y - pos.y)
    await api.setOverlayPosition(position)
    if (arrived) {
      wanderTarget = null
      machine.dispatch({ type: 'arrive' })
    }
  }

  // Flee reaction: nudge away quickly
  const snap = machine.getSnapshot()
  if (state === 'REACT' && snap.reactionKind === 'flee' && !dragging) {
    const pos = await api.getOverlayPosition()
    const away = {
      x: pos.x + (Math.random() > 0.5 ? 120 : -120),
      y: pos.y + (Math.random() > 0.5 ? 40 : -40)
    }
    const { position } = stepToward(pos, away, petDef.baseSpeed * 1.8, dt)
    renderer.setFacingFromDelta(position.x - pos.x, position.y - pos.y)
    await api.setOverlayPosition(position)
  }

  syncClip()
  renderer.update(dt)
  requestAnimationFrame((t) => {
    void tick(t)
  })
}

function setMouseIgnore(ignore: boolean): void {
  void api.setIgnoreMouse(ignore, true)
}

function setupInput(): void {
  const onEnter = (): void => {
    pointerOver = true
    setMouseIgnore(false)
    machine.dispatch({ type: 'hover' })
    showNameBriefly()
  }

  const onLeave = (): void => {
    if (dragging) return
    pointerOver = false
    setMouseIgnore(true)
  }

  hitEl.addEventListener('pointerenter', onEnter)
  hitEl.addEventListener('pointerleave', onLeave)

  // Also track document-level leave when click-through toggles
  document.addEventListener('pointerleave', () => {
    if (!dragging) {
      pointerOver = false
      setMouseIgnore(true)
    }
  })

  hitEl.addEventListener('pointerdown', async (ev) => {
    if (ev.button !== 0) return
    hitEl.setPointerCapture(ev.pointerId)
    dragArmed = true
    dragging = false
    movedDistance = 0
    const pos = await api.getOverlayPosition()
    dragOrigin = { x: ev.screenX, y: ev.screenY }
    dragGrabOffset = { x: ev.screenX - pos.x, y: ev.screenY - pos.y }
    setMouseIgnore(false)
  })

  hitEl.addEventListener('pointermove', async (ev) => {
    if (!dragArmed) return
    const dist = Math.hypot(ev.screenX - dragOrigin.x, ev.screenY - dragOrigin.y)
    movedDistance = Math.max(movedDistance, dist)
    if (!dragging && dist >= DRAG_THRESHOLD) {
      dragging = true
      machine.dispatch({ type: 'dragStart' })
    }
    if (dragging) {
      const x = ev.screenX - dragGrabOffset.x
      const y = ev.screenY - dragGrabOffset.y
      await api.setOverlayPosition({ x, y })
    }
  })

  const endPointer = (ev: PointerEvent): void => {
    if (!dragArmed) return
    dragArmed = false
    try {
      hitEl.releasePointerCapture(ev.pointerId)
    } catch {
      /* ignore */
    }

    const kind = classifyPointerEnd({
      dragged: dragging,
      movedDistance,
      dragThresholdPx: DRAG_THRESHOLD
    })
    dragging = false

    if (kind === 'dragEnd') {
      machine.dispatch({ type: 'dragEnd' })
    } else {
      machine.dispatch({ type: 'click' })
      showNameBriefly()
    }

    if (!pointerOver) setMouseIgnore(true)
  }

  hitEl.addEventListener('pointerup', endPointer)
  hitEl.addEventListener('pointercancel', endPointer)

  hitEl.addEventListener('dblclick', () => {
    void api.openSettings()
  })

  hitEl.addEventListener('contextmenu', (ev) => {
    ev.preventDefault()
    void api.openSettings()
  })
}

async function boot(): Promise<void> {
  prefs = await api.getPrefs()
  assetBase = await api.getAssetBaseUrl()
  machine = new BehaviorMachine({
    personality: prefs.personality,
    wanderEnabled: prefs.activity.wanderEnabled,
    sleepEnabled: prefs.activity.sleepEnabled,
    activityLevel: prefs.activity.activityLevel,
    paused: prefs.activity.paused
  })
  applyPrefs(prefs)
  await refreshDisplays()
  await loadCurrentPet()
  setupInput()
  setMouseIgnore(true)

  api.onPrefsChanged(async (next) => {
    const petChanged = next.petId !== prefs.petId
    applyPrefs(next)
    await refreshDisplays()
    if (petChanged) await loadCurrentPet()
  })

  api.onShowPet(async (next) => {
    applyPrefs(next)
    await refreshDisplays()
    await loadCurrentPet()
  })

  window.addEventListener('resize', () => {
    /* PetRenderer handles canvas resize */
  })

  requestAnimationFrame((t) => {
    void tick(t)
  })
}

void boot()
