import * as THREE from 'three'
import type { LoadedPet } from './assets'
import { loadPetModel } from './assets'
import type { PetDefinition } from '../../shared/types'
import { lerpAngle } from '../../shared/bounds'

export class PetRenderer {
  readonly renderer: THREE.WebGLRenderer
  readonly scene: THREE.Scene
  readonly camera: THREE.PerspectiveCamera
  private pet: LoadedPet | null = null
  private yaw = 0
  private targetYaw = 0
  private hop = 0
  private spin = 0
  private disposed = false

  constructor(private readonly host: HTMLElement) {
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100)
    this.camera.position.set(0, 0.55, 3.2)
    this.camera.lookAt(0, 0.2, 0)

    this.renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'low-power'
    })
    this.renderer.setClearColor(0x000000, 0)
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.host.appendChild(this.renderer.domElement)

    const hemi = new THREE.HemisphereLight(0xffffff, 0x445566, 1.1)
    this.scene.add(hemi)
    const dir = new THREE.DirectionalLight(0xffffff, 0.85)
    dir.position.set(2, 4, 3)
    this.scene.add(dir)

    this.resize()
    window.addEventListener('resize', this.resize)
  }

  private resize = (): void => {
    const w = this.host.clientWidth || 220
    const h = this.host.clientHeight || 220
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h, false)
  }

  async setPet(def: PetDefinition, assetBaseUrl: string): Promise<void> {
    if (this.pet) {
      this.scene.remove(this.pet.root)
      this.pet.dispose()
      this.pet = null
    }
    try {
      this.pet = await loadPetModel(def, assetBaseUrl)
      this.scene.add(this.pet.root)
      this.pet.play('idle')
    } catch (err) {
      console.error('Failed to load pet model', def.id, err)
      // Graceful placeholder: simple colored sphere
      const geo = new THREE.SphereGeometry(0.45, 24, 16)
      const mat = new THREE.MeshStandardMaterial({ color: 0x4ecdc4 })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.y = 0.2
      this.scene.add(mesh)
      this.pet = {
        root: mesh,
        mixer: new THREE.AnimationMixer(mesh),
        clips: {},
        available: [],
        proceduralSleep: true,
        setProceduralSleep: () => undefined,
        play: () => undefined,
        update: (dt) => {
          mesh.rotation.y += dt * 0.6
        },
        dispose: () => {
          geo.dispose()
          mat.dispose()
        }
      }
    }
  }

  playLogical(
    clip: 'idle' | 'walk' | 'react' | 'sleep',
    opts?: { loop?: boolean }
  ): void {
    this.pet?.play(clip, opts)
  }

  setFacingFromDelta(dx: number, _dy: number): void {
    if (Math.abs(dx) < 0.5) return
    // Models face +Z; screen +X is right. Turn toward movement.
    this.targetYaw = dx > 0 ? Math.PI / 2 : -Math.PI / 2
  }

  /** Brief visual flourishes for reactions without requiring extra clips. */
  triggerReactionEffect(kind: string | null): void {
    if (kind === 'hop' || kind === 'nuzzle') this.hop = 1
    if (kind === 'spin') this.spin = 1
  }

  update(dt: number): void {
    if (this.disposed) return
    this.yaw = lerpAngle(this.yaw, this.targetYaw, Math.min(1, dt * 6))
    if (this.pet) {
      this.pet.root.rotation.y = this.yaw
      this.pet.update(dt)

      if (this.hop > 0) {
        this.hop = Math.max(0, this.hop - dt * 2.2)
        this.pet.root.position.y += Math.sin((1 - this.hop) * Math.PI) * 0.18
      }
      if (this.spin > 0) {
        this.spin = Math.max(0, this.spin - dt * 1.6)
        this.pet.root.rotation.y += (1 - this.spin) * Math.PI * 2 * dt * 1.6
      }
    }
    this.renderer.render(this.scene, this.camera)
  }

  dispose(): void {
    this.disposed = true
    window.removeEventListener('resize', this.resize)
    if (this.pet) {
      this.scene.remove(this.pet.root)
      this.pet.dispose()
      this.pet = null
    }
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }
}
