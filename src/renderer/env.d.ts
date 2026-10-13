import type { PetApi } from '../preload/index'

declare global {
  interface Window {
    petApi: PetApi
  }
}

export {}
