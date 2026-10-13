import type { Settings } from '../domain/types'
import { LEGACY_PROPERTY_ID } from './db'

const SETTINGS_KEY = 'expendimonth-settings'

const defaults = (): Settings => ({
  userName: '',
  locale: 'en',
  activePropertyId: null,
  theme: 'light',
  pinHash: null,
  pinSalt: null,
  lastExportAt: null,
  coachDismissed: false,
  remindersEnabled: false,
  reminderLastFiredAt: null,
  monthStartSeen: null,
})

type Stored = Partial<Settings> & { propertyName?: string; houseName?: string; currencyCode?: string }

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return defaults()
    const parsed = JSON.parse(raw) as Stored
    const s: Settings = { ...defaults(), ...parsed }
    // Legacy single-property install: point at the migrated property.
    if (!s.activePropertyId && parsed.currencyCode && (parsed.propertyName || parsed.houseName)) {
      s.activePropertyId = LEGACY_PROPERTY_ID
    }
    return s
  } catch {
    return defaults()
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
}

export function patchSettings(patch: Partial<Settings>): Settings {
  const next = { ...loadSettings(), ...patch }
  saveSettings(next)
  return next
}
