import { useCallback } from 'react'
import { getWorkingYearMonthFromSettings } from '../storage/workingMonth'
import { useAppData } from '../storage/AppDataContext'

export function useWorkingYearMonth(propertyId: string): [string, (ym: string) => void] {
  const { settings, updateSettings } = useAppData()
  const ym = getWorkingYearMonthFromSettings(settings, propertyId)

  const setYm = useCallback(
    (next: string) => {
      updateSettings({
        workingMonthByProperty: { ...settings.workingMonthByProperty, [propertyId]: next },
      })
    },
    [propertyId, settings.workingMonthByProperty, updateSettings],
  )

  return [ym, setYm]
}
