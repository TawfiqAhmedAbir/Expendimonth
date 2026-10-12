import type { LineItem, MonthRecord } from './types'

export function totalIn(lines: LineItem[]): number {
  return lines.filter((l) => l.type === 'in').reduce((s, l) => s + l.amountCents, 0)
}

export function totalOut(lines: LineItem[]): number {
  return lines.filter((l) => l.type === 'out').reduce((s, l) => s + l.amountCents, 0)
}

export function net(lines: LineItem[]): number {
  return totalIn(lines) - totalOut(lines)
}

export function deriveMonthStatus(lines: LineItem[], markedDone: boolean): MonthRecord['status'] {
  if (lines.length === 0) return 'empty'
  if (markedDone) return 'done'
  return 'open'
}

export function sortYearMonths(yearMonths: string[]): string[] {
  return [...yearMonths].sort()
}

export function netForMonth(linesByMonth: Map<string, LineItem[]>, yearMonth: string): number {
  return net(linesByMonth.get(yearMonth) ?? [])
}

export function runningBalanceThrough(
  sortedYearMonths: string[],
  linesByMonth: Map<string, LineItem[]>,
  openingBalanceCents: number,
  throughYearMonth: string,
): number {
  let balance = openingBalanceCents
  for (const ym of sortedYearMonths) {
    balance += netForMonth(linesByMonth, ym)
    if (ym === throughYearMonth) break
  }
  return balance
}

export function previousYearMonth(yearMonth: string): string | null {
  const [y, m] = yearMonth.split('-').map(Number)
  if (!y || !m) return null
  const d = new Date(y, m - 2, 1)
  const py = d.getFullYear()
  const pm = String(d.getMonth() + 1).padStart(2, '0')
  return `${py}-${pm}`
}

export function compareNetToPreviousMonth(
  currentNet: number,
  previousNet: number | null,
): { deltaCents: number; better: boolean } | null {
  if (previousNet === null) return null
  const delta = currentNet - previousNet
  return { deltaCents: delta, better: delta >= 0 }
}

export function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function formatYearMonthLabel(yearMonth: string, locale = 'en'): string {
  const [y, m] = yearMonth.split('-').map(Number)
  if (!y || !m) return yearMonth
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export function parseMoneyToCents(input: string): number | null {
  const normalized = input.replace(/,/g, '.').trim()
  if (!normalized) return null
  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

export function formatMoney(cents: number, currencyCode: string, locale = 'en'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 2,
  }).format(cents / 100)
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}
