import { PETS } from '../../shared/pets'
import { PERSONALITY_LIST } from '../../shared/personalities'
import type { AppPreferences, PersonalityId } from '../../shared/types'

const api = window.petApi

const form = document.getElementById('settings-form') as HTMLFormElement
const petSelect = document.getElementById('pet-id') as HTMLSelectElement
const nameInput = document.getElementById('pet-name') as HTMLInputElement
const personalitySelect = document.getElementById('personality') as HTMLSelectElement
const wander = document.getElementById('wander') as HTMLInputElement
const sleep = document.getElementById('sleep') as HTMLInputElement
const activity = document.getElementById('activity') as HTMLInputElement
const activityLabel = document.getElementById('activity-label') as HTMLSpanElement
const paused = document.getElementById('paused') as HTMLInputElement
const alwaysOnTop = document.getElementById('always-on-top') as HTMLInputElement
const hidden = document.getElementById('hidden') as HTMLInputElement
const launchStartup = document.getElementById('launch-startup') as HTMLInputElement
const status = document.getElementById('status') as HTMLParagraphElement
const openSetup = document.getElementById('open-setup') as HTMLButtonElement
const quitBtn = document.getElementById('quit') as HTMLButtonElement

function fillSelects(): void {
  petSelect.innerHTML = PETS.map(
    (p) => `<option value="${p.id}">${p.displayName}</option>`
  ).join('')
  personalitySelect.innerHTML = PERSONALITY_LIST.map(
    (p) => `<option value="${p.id}">${p.displayName}</option>`
  ).join('')
}

function bindPrefs(prefs: AppPreferences): void {
  petSelect.value = prefs.petId ?? PETS[0].id
  nameInput.value = prefs.petName
  personalitySelect.value = prefs.personality
  wander.checked = prefs.activity.wanderEnabled
  sleep.checked = prefs.activity.sleepEnabled
  activity.value = String(prefs.activity.activityLevel)
  activityLabel.textContent = `${Number(activity.value).toFixed(2)}×`
  paused.checked = prefs.activity.paused
  alwaysOnTop.checked = prefs.activity.alwaysOnTop
  hidden.checked = prefs.activity.hidden
  launchStartup.checked = prefs.activity.launchAtStartup
}

activity.addEventListener('input', () => {
  activityLabel.textContent = `${Number(activity.value).toFixed(2)}×`
})

form.addEventListener('submit', async (ev) => {
  ev.preventDefault()
  status.textContent = 'Saving…'
  const patch: Partial<AppPreferences> = {
    petId: petSelect.value,
    petName: nameInput.value.trim().slice(0, 32) || 'Buddy',
    personality: personalitySelect.value as PersonalityId,
    activity: {
      wanderEnabled: wander.checked,
      sleepEnabled: sleep.checked,
      activityLevel: Number(activity.value),
      paused: paused.checked,
      alwaysOnTop: alwaysOnTop.checked,
      hidden: hidden.checked,
      launchAtStartup: launchStartup.checked
    }
  }
  const saved = await api.patchPrefs(patch)
  await api.setAlwaysOnTop(saved.activity.alwaysOnTop)
  await api.setOverlayVisible(!saved.activity.hidden)
  await api.setLaunchAtStartup(saved.activity.launchAtStartup)
  bindPrefs(saved)
  status.textContent = 'Saved.'
  window.setTimeout(() => {
    if (status.textContent === 'Saved.') status.textContent = ''
  }, 1600)
})

openSetup.addEventListener('click', () => {
  void api.openSetup()
})

quitBtn.addEventListener('click', () => {
  void api.quit()
})

async function boot(): Promise<void> {
  fillSelects()
  const prefs = await api.getPrefs()
  bindPrefs(prefs)
  api.onPrefsChanged(bindPrefs)
}

void boot()
