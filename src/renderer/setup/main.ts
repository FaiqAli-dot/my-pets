import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { PETS } from '../../shared/pets'
import { PERSONALITY_LIST } from '../../shared/personalities'
import type { PersonalityId, PetDefinition } from '../../shared/types'
import { resolveClipName } from '../../shared/persistence'

const api = window.petApi

const listEl = document.getElementById('pet-list') as HTMLDivElement
const titleEl = document.getElementById('pet-title') as HTMLHeadingElement
const blurbEl = document.getElementById('pet-blurb') as HTMLParagraphElement
const animEl = document.getElementById('anim-buttons') as HTMLDivElement
const nameInput = document.getElementById('pet-name') as HTMLInputElement
const personalitySelect = document.getElementById('personality') as HTMLSelectElement
const form = document.getElementById('setup-form') as HTMLFormElement
const confirmBtn = document.getElementById('confirm-btn') as HTMLButtonElement
const canvas = document.getElementById('preview') as HTMLCanvasElement

let selected = PETS[0]
let assetBase = ''
let mixer: THREE.AnimationMixer | null = null
let currentRoot: THREE.Object3D | null = null
let clips: Record<string, THREE.AnimationClip> = {}
let available: string[] = []
let currentAction: THREE.AnimationAction | null = null
let raf = 0

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'low-power'
})
renderer.setClearColor(0x000000, 0)
renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
renderer.outputColorSpace = THREE.SRGBColorSpace

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50)
camera.position.set(0, 0.6, 3.4)
camera.lookAt(0, 0.25, 0)
scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.15))
const key = new THREE.DirectionalLight(0xffffff, 0.9)
key.position.set(2, 3, 2)
scene.add(key)

function resize(): void {
  const w = canvas.clientWidth || 320
  const h = canvas.clientHeight || 240
  renderer.setSize(w, h, false)
  camera.aspect = w / h
  camera.updateProjectionMatrix()
}

function renderLoop(t: number): void {
  const dt = Math.min(0.05, 1 / 60)
  mixer?.update(dt)
  if (currentRoot) currentRoot.rotation.y = Math.sin(t * 0.001) * 0.25
  renderer.render(scene, camera)
  raf = requestAnimationFrame(renderLoop)
}

function playClip(logical: 'idle' | 'walk' | 'react' | 'sleep'): void {
  const map = selected.clips
  let preferred: string | undefined
  let fallbacks = ['idle']
  if (logical === 'idle') preferred = map.idle
  if (logical === 'walk') {
    preferred = map.walk
    fallbacks = ['walk', 'idle']
  }
  if (logical === 'react') {
    preferred = map.react
    fallbacks = ['attack', 'idle']
  }
  if (logical === 'sleep') {
    preferred = map.sleep
    fallbacks = ['idle']
  }
  const resolved = resolveClipName(available, preferred, fallbacks)
  animEl.querySelectorAll('button').forEach((b) => {
    b.classList.toggle('active', b.getAttribute('data-clip') === logical)
  })
  if (!resolved.name || !mixer) return
  const clip = clips[resolved.name]
  if (!clip) return
  const action = mixer.clipAction(clip)
  action.reset()
  action.setLoop(logical === 'react' ? THREE.LoopOnce : THREE.LoopRepeat, Infinity)
  action.timeScale = logical === 'sleep' ? 0.35 : 1
  action.fadeIn(0.15)
  currentAction?.fadeOut(0.15)
  action.play()
  currentAction = action
}

async function loadPreview(def: PetDefinition): Promise<void> {
  if (currentRoot) {
    scene.remove(currentRoot)
    currentRoot = null
  }
  mixer = null
  clips = {}
  available = []
  currentAction = null

  const loader = new GLTFLoader()
  const url = `${assetBase.replace(/\/$/, '')}/${def.assetPath}`
  try {
    const gltf = await loader.loadAsync(url)
    currentRoot = gltf.scene
    currentRoot.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace
          mat.map.needsUpdate = true
        }
        mat.transparent = typeof mat.opacity === 'number' ? mat.opacity < 1 : false
        mat.needsUpdate = true
      }
      mesh.frustumCulled = false
    })
    currentRoot.updateMatrixWorld(true)
    const raw = new THREE.Box3().setFromObject(currentRoot)
    const rawSize = new THREE.Vector3()
    raw.getSize(rawSize)
    const normalize = 1.05 / Math.max(rawSize.y, 1e-3)
    currentRoot.scale.setScalar(normalize * def.scale)
    currentRoot.updateMatrixWorld(true)
    const fitted = new THREE.Box3().setFromObject(currentRoot)
    currentRoot.position.y = -fitted.min.y + def.yOffset
    scene.add(currentRoot)
    mixer = new THREE.AnimationMixer(currentRoot)
    for (const c of gltf.animations) {
      clips[c.name] = c
      available.push(c.name)
    }
    buildAnimButtons()
    playClip('idle')
  } catch (err) {
    console.error(err)
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.5, 20, 16),
      new THREE.MeshStandardMaterial({ color: 0x4ecdc4 })
    )
    mesh.position.y = 0.2
    currentRoot = mesh
    scene.add(mesh)
    animEl.innerHTML = '<span style="color:#b7d8c8;font-size:0.85rem">Preview unavailable — asset missing</span>'
  }
}

function buildAnimButtons(): void {
  const buttons: Array<{ id: 'idle' | 'walk' | 'react' | 'sleep'; label: string }> = [
    { id: 'idle', label: 'Idle' },
    { id: 'walk', label: 'Walk' },
    { id: 'react', label: 'React' },
    { id: 'sleep', label: 'Sleep' }
  ]
  animEl.innerHTML = ''
  for (const b of buttons) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.textContent = b.label
    btn.dataset.clip = b.id
    btn.addEventListener('click', () => playClip(b.id))
    animEl.appendChild(btn)
  }
}

function renderCatalog(): void {
  listEl.innerHTML = ''
  for (const pet of PETS) {
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'pet-card' + (pet.id === selected.id ? ' selected' : '')
    btn.innerHTML = `<strong>${pet.displayName}</strong><span>${pet.thumbnailHint}</span>`
    btn.addEventListener('click', () => {
      selected = pet
      titleEl.textContent = pet.displayName
      blurbEl.textContent = pet.thumbnailHint
      if (!nameInput.value) nameInput.placeholder = pet.displayName
      personalitySelect.value = pet.defaultPersonality
      renderCatalog()
      void loadPreview(pet)
    })
    listEl.appendChild(btn)
  }
}

function fillPersonalities(): void {
  personalitySelect.innerHTML = ''
  for (const p of PERSONALITY_LIST) {
    const opt = document.createElement('option')
    opt.value = p.id
    opt.textContent = `${p.displayName} — ${p.description}`
    personalitySelect.appendChild(opt)
  }
  personalitySelect.value = selected.defaultPersonality
}

form.addEventListener('submit', async (ev) => {
  ev.preventDefault()
  const name = nameInput.value.trim() || selected.displayName
  const personality = personalitySelect.value as PersonalityId
  confirmBtn.disabled = true
  confirmBtn.textContent = 'Summoning…'
  try {
    await api.completeSetup({
      petId: selected.id,
      petName: name,
      personality
    })
  } catch (err) {
    console.error(err)
    confirmBtn.disabled = false
    confirmBtn.textContent = 'Bring to desktop'
  }
})

async function boot(): Promise<void> {
  assetBase = await api.getAssetBaseUrl()
  fillPersonalities()
  renderCatalog()
  titleEl.textContent = selected.displayName
  blurbEl.textContent = selected.thumbnailHint
  nameInput.placeholder = selected.displayName
  resize()
  window.addEventListener('resize', resize)
  await loadPreview(selected)
  raf = requestAnimationFrame(renderLoop)
}

void boot()

window.addEventListener('beforeunload', () => cancelAnimationFrame(raf))
