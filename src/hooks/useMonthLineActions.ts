import { useCallback } from 'react'
import type { AmountPadResult } from '../components/AmountPadSheet'
import { useToast } from '../components/Toast'
import { clampDateToMonth } from '../domain/calc'
import type { LineItem, MonthRecord } from '../domain/types'
import { t } from '../i18n'
import { createCategory, touchCategory } from '../storage/categories'
import { useAppData } from '../storage/AppDataContext'
import { addLine, deleteLine, getOrCreateMonth, restoreLines, setMonthStatus, updateLine } from '../storage/repository'

type SaveContext = {
  yearMonth: string
  month: MonthRecord
  editLine?: LineItem | null
}

export function useMonthLineActions(propertyId: string, locale: string) {
  const { monthsByYearMonth, refresh } = useAppData()
  const { showUndo, showToast } = useToast()

  const saveLine = useCallback(
    async (data: AmountPadResult, ctx: SaveContext) => {
      const { yearMonth, month, editLine } = ctx
      let categoryId = data.categoryId ?? editLine?.categoryId
      if (data.newCategoryLabel) categoryId = (await createCategory(propertyId, data.newCategoryLabel)).id
      if (!categoryId) return false
      const targetYm = data.moveToYearMonth && data.moveToYearMonth !== yearMonth ? data.moveToYearMonth : yearMonth
      if (targetYm !== yearMonth && monthsByYearMonth.get(targetYm)?.status === 'done') {
        showToast({ message: t('line.moveClosed', locale) })
        return false
      }
      await touchCategory(categoryId, data.amountCents)
      const payload = {
        type: data.type,
        amountCents: data.amountCents,
        categoryId,
        note: data.note,
        occurredOn: clampDateToMonth(data.occurredOn, targetYm),
      }
      if (editLine && targetYm !== yearMonth) {
        const dest = await getOrCreateMonth(propertyId, targetYm)
        await updateLine({ ...editLine, ...payload, monthId: dest.id })
      } else if (editLine) await updateLine({ ...editLine, ...payload })
      else await addLine(month.id, payload)
      if (month.status === 'checked') await setMonthStatus(month.id, 'open')
      await refresh()
      showToast({ message: t('line.saved', locale) })
      return true
    },
    [propertyId, locale, monthsByYearMonth, refresh, showToast],
  )

  const removeLine = useCallback(
    async (line: LineItem, month: MonthRecord) => {
      const removed = await deleteLine(line.id)
      if (month.status === 'checked') await setMonthStatus(month.id, 'open')
      await refresh()
      if (removed.length > 0) {
        showUndo(t('line.deleted', locale), t('common.undo', locale), async () => {
          await restoreLines(removed)
          await refresh()
        })
      }
    },
    [locale, refresh, showUndo],
  )

  const addPrefilledLine = useCallback(
    async (
      month: MonthRecord,
      item: { type: 'in' | 'out'; amountCents: number; categoryId: string; note?: string; occurredOn: string },
    ) => {
      await touchCategory(item.categoryId, item.amountCents)
      await addLine(month.id, {
        type: item.type,
        amountCents: item.amountCents,
        categoryId: item.categoryId,
        note: item.note ?? '',
        occurredOn: clampDateToMonth(item.occurredOn, month.yearMonth),
      })
      if (month.status === 'checked') await setMonthStatus(month.id, 'open')
      await refresh()
      showToast({ message: t('line.saved', locale) })
    },
    [locale, refresh, showToast],
  )

  return { saveLine, removeLine, addPrefilledLine }
}
