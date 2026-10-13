import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { resolveClipName } from '../../shared/persistence'
import type { ClipMap, PetDefinition } from '../../shared/types'

export interface LoadedPet {
  root: THREE.Object3D
  mixer: THREE.AnimationMixer
  clips: Record<string, THREE.AnimationClip>
  available: string[]
  play: (logical: keyof ClipMap | 'sleep', opts?: { loop?: boolean; fade?: number }) => void
  update: (dt: number) => void
  dispose: () => void
  /** True when sleep has no real clip and uses procedural bob. */
  proceduralSleep: boolean
  setProceduralSleep: (on: boolean) => void
}

const cache = new Map<string, THREE.Group>()

export async function loadPetModel(
  def: PetDefinition,
  assetBaseUrl: string
): Promise<LoadedPet> {
  const url = `${assetBaseUrl.replace(/\/$/, '')}/${def.assetPath}`
  const loader = new GLTFLoader()

  const gltf = await new Promise<Awaited<ReturnType<typeof loader.loadAsync>>>(
    (resolve, reject) => {
      loader.load(url, resolve, undefined, reject)
    }
  )

  const root = gltf.scene
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.isMesh) {
      mesh.castShadow = false
      mesh.receiveShadow = false
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats) {
        const mat = m as THREE.MeshStandardMaterial & {
          map?: THREE.Texture | null
          opacity?: number
        }
        // Gobkit atlases are opaque unlit/baked color. Never force transparent
        // from map.format (truthy enum) — that made meshes invisible on some GPUs.
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace
          mat.map.needsUpdate = true
        }
        if ('transparent' in mat) {
          mat.transparent = typeof mat.opacity === 'number' ? mat.opacity < 1 : false
          mat.depthWrite = true
        }
        mat.needsUpdate = true
      }
      mesh.frustumCulled = false
    }
  })

  // Gobkit packs vary in authored units (some are ~metres, some hundreds of units).
  // Normalize to a ~1.05 unit tall pet, then apply the definition's artistic scale.
  root.updateMatrixWorld(true)
  const rawBounds = new THREE.Box3().setFromObject(root)
  const rawSize = new THREE.Vector3()
  rawBounds.getSize(rawSize)
  const rawHeight = Math.max(rawSize.y, 1e-3)
  const normalize = 1.05 / rawHeight
  root.scale.setScalar(normalize * def.scale)
  root.rotation.y = def.yawOffset
  root.updateMatrixWorld(true)
  const fitted = new THREE.Box3().setFromObject(root)
  // Sit feet near y=0, then apply definition offset.
  root.position.y = -fitted.min.y + def.yOffset

  const fittedSize = new THREE.Vector3()
  fitted.getSize(fittedSize)
  console.info(
    `[pet-assets] loaded ${def.id} rawHeight=${rawHeight.toFixed(2)} fitted=${fittedSize.x.toFixed(2)}x${fittedSize.y.toFixed(2)}x${fittedSize.z.toFixed(2)}`
  )

  const mixer = new THREE.AnimationMixer(root)
  const clips: Record<string, THREE.AnimationClip> = {}
  const available: string[] = []
  for (const clip of gltf.animations) {
    clips[clip.name] = clip
    available.push(clip.name)
  }

  let currentAction: THREE.AnimationAction | null = null
  let proceduralSleep = false
  let sleepBob = 0

  const sleepResolve = resolveClipName(available, def.clips.sleep, ['idle'])
  const proceduralSleepFlag = sleepResolve.procedural || !def.clips.sleep

  const play = (
    logical: keyof ClipMap | 'sleep',
    opts?: { loop?: boolean; fade?: number }
  ): void => {
    let preferred: string | undefined
    let fallbacks: string[] = ['idle']

    if (logical === 'idle') {
      preferred = def.clips.idle
      fallbacks = ['idle', 'walk']
    } else if (logical === 'walk') {
      preferred = def.clips.walk
      fallbacks = ['walk', 'idle']
    } else if (logical === 'react') {
      preferred = def.clips.react
      fallbacks = ['attack', 'idle', 'walk']
    } else if (logical === 'sleep') {
      preferred = def.clips.sleep
      fallbacks = ['idle']
      proceduralSleep = proceduralSleepFlag
    }

    if (logical !== 'sleep') proceduralSleep = false

    const resolved = resolveClipName(available, preferred, fallbacks)
    if (!resolved.name) {
      // Fully procedural — no clip available
      if (currentAction) {
        currentAction.fadeOut(opts?.fade ?? 0.15)
        currentAction = null
      }
      return
    }

    const clip = clips[resolved.name]
    if (!clip) return

    const next = mixer.clipAction(clip)
    const loop = opts?.loop ?? logical !== 'react'
    next.reset()
    next.setLoop(loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity)
    next.clampWhenFinished = !loop
    // Sleep: slow idle
    next.timeScale = logical === 'sleep' ? 0.35 : 1
    next.fadeIn(opts?.fade ?? 0.2)
    if (currentAction && currentAction !== next) {
      currentAction.fadeOut(opts?.fade ?? 0.2)
    }
    next.play()
    currentAction = next
  }

  // Warm cache key
  cache.set(def.id, root)

  return {
    root,
    mixer,
    clips,
    available,
    play,
    proceduralSleep: proceduralSleepFlag,
    setProceduralSleep: (on) => {
      proceduralSleep = on
    },
    update: (dt: number) => {
      mixer.update(dt)
      if (proceduralSleep) {
        sleepBob += dt
        root.position.y = def.yOffset + Math.sin(sleepBob * 1.2) * 0.02
        root.rotation.z = Math.sin(sleepBob * 0.8) * 0.05
      } else {
        root.position.y = def.yOffset
        root.rotation.z = 0
      }
    },
    dispose: () => {
      mixer.stopAllAction()
      root.traverse((obj) => {
        const mesh = obj as THREE.Mesh
        if (mesh.isMesh) {
          mesh.geometry?.dispose()
          const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
          for (const m of mats) m?.dispose?.()
        }
      })
      cache.delete(def.id)
    }
  }
}
