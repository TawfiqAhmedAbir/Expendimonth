import { getCategoryLabel } from './categories'
import { categoryBreakdown, formatMoney, formatYearMonthLabel, net, totalIn, totalOut } from './calc'
import type { LineItem, MonthRecord, Property, UserCategory } from './types'
import { t } from '../i18n'

export function buildMonthShareText(
  property: Property,
  yearMonth: string,
  month: MonthRecord | undefined,
  lines: LineItem[],
  categories: UserCategory[],
  locale: string,
): string {
  const inC = totalIn(lines)
  const outC = totalOut(lines)
  const n = net(lines)
  const linesOut: string[] = [
    `${property.name} · ${formatYearMonthLabel(yearMonth, locale)}`,
    `${t('money.in', locale)}: ${formatMoney(inC, property.currencyCode, locale)}`,
    `${t('money.out', locale)}: ${formatMoney(outC, property.currencyCode, locale)}`,
    `${t('money.left', locale)}: ${formatMoney(n, property.currencyCode, locale)}`,
  ]
  if (month && (month.reconcileInCents !== null || month.reconcileOutCents !== null)) {
    if (month.reconcileInCents !== null) {
      linesOut.push(`${t('close.paperIn', locale)}: ${formatMoney(month.reconcileInCents, property.currencyCode, locale)}`)
    }
    if (month.reconcileOutCents !== null) {
      linesOut.push(`${t('close.paperOut', locale)}: ${formatMoney(month.reconcileOutCents, property.currencyCode, locale)}`)
    }
  }
  const top = categoryBreakdown(lines, 'out').slice(0, 3)
  if (top.length) {
    linesOut.push('')
    linesOut.push(t('insights.where', locale) + ':')
    for (const b of top) {
      linesOut.push(`· ${getCategoryLabel(b.categoryId, categories)}: ${formatMoney(b.cents, property.currencyCode, locale)}`)
    }
  }
  return linesOut.join('\n')
}

export async function sharePlainText(text: string, title?: string): Promise<boolean> {
  if (typeof navigator.share === 'function') {
    try {
      await navigator.share({ title, text })
      return true
    } catch {
      return false
    }
  }
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return true
  }
  return false
}
