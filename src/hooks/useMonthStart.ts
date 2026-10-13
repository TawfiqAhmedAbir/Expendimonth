import { useMemo } from 'react'
import { monthStartItems, previousYearMonth } from '../domain/calc'
import { useAppData } from '../storage/AppDataContext'

export function useMonthStart(propertyId: string, yearMonth: string) {
  const { settings, monthsByYearMonth, linesByMonthId, categories, updateSettings } = useAppData()
  const month = monthsByYearMonth.get(yearMonth)
  const lines = month ? (linesByMonthId.get(month.id) ?? []) : []
  const prevYm = previousYearMonth(yearMonth)
  const prev = prevYm ? monthsByYearMonth.get(prevYm) : undefined
  const prevLines = prev ? (linesByMonthId.get(prev.id) ?? []) : []
  const items = useMemo(
    () => monthStartItems(yearMonth, lines, prevLines, categories),
    [yearMonth, lines, prevLines, categories],
  )
  const seenKey = `${propertyId}:${yearMonth}`
  const open = items.length > 0 && month?.status !== 'done' && settings.monthStartSeen !== seenKey

  function markSeen() {
    updateSettings({ monthStartSeen: seenKey })
  }

  return { items, open, markSeen, month, lines, prevLines, prevYm }
}
