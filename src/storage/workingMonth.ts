import { currentYearMonth } from '../domain/calc'
import type { Settings } from '../domain/types'
import { loadSettings, patchSettings } from './settings'

export function getWorkingYearMonthFromSettings(settings: Settings, propertyId: string): string {
  return settings.workingMonthByProperty[propertyId] ?? currentYearMonth()
}

export function getWorkingYearMonth(propertyId: string): string {
  return getWorkingYearMonthFromSettings(loadSettings(), propertyId)
}

export function setWorkingYearMonth(propertyId: string, yearMonth: string): Settings {
  const current = loadSettings()
  return patchSettings({
    workingMonthByProperty: { ...current.workingMonthByProperty, [propertyId]: yearMonth },
  })
}
