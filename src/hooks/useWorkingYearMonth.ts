import { useCallback } from 'react'
import { getWorkingYearMonthFromSettings } from '../storage/workingMonth'
import { loadSettings } from '../storage/settings'
import { useAppData } from '../storage/AppDataContext'

export function useWorkingYearMonth(propertyId: string): [string, (ym: string) => void] {
  const { settings, updateSettings } = useAppData()
  const ym = getWorkingYearMonthFromSettings(settings, propertyId)

  const setYm = useCallback(
    (next: string) => {
      const current = loadSettings()
      if (current.workingMonthByProperty[propertyId] === next) return
      updateSettings({
        workingMonthByProperty: { ...current.workingMonthByProperty, [propertyId]: next },
      })
    },
    [propertyId, updateSettings],
  )

  return [ym, setYm]
}
