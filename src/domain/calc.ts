import type { LineItem, LineType, MonthRecord, MonthStatus } from './types'

export function totalIn(lines: LineItem[]): number {
  return lines.filter((l) => l.type === 'in').reduce((s, l) => s + l.amountCents, 0)
}

export function totalOut(lines: LineItem[]): number {
  return lines.filter((l) => l.type === 'out').reduce((s, l) => s + l.amountCents, 0)
}

export function net(lines: LineItem[]): number {
  return totalIn(lines) - totalOut(lines)
}

/** Status after a line change: empty when no lines, otherwise keep done, else open. */
export function deriveMonthStatus(lines: LineItem[], current: MonthStatus): MonthStatus {
  if (lines.length === 0) return 'empty'
  if (current === 'done') return 'done'
  return 'open'
}

export function sortYearMonths(yearMonths: string[]): string[] {
  return [...yearMonths].sort()
}

export function runningBalanceThrough(
  sortedYearMonths: string[],
  linesByYearMonth: Map<string, LineItem[]>,
  openingBalanceCents: number,
  throughYearMonth: string,
): number {
  let balance = openingBalanceCents
  for (const ym of sortedYearMonths) {
    balance += net(linesByYearMonth.get(ym) ?? [])
    if (ym === throughYearMonth) break
  }
  return balance
}

/** Opening balance plus every month's net up to and including throughYearMonth. */
export function cashBalanceThrough(
  months: MonthRecord[],
  linesByMonthId: Map<string, LineItem[]>,
  openingBalanceCents: number,
  throughYearMonth: string,
): number {
  const sorted = months.map((m) => m.yearMonth).filter((ym) => ym <= throughYearMonth).sort()
  const byYm = new Map<string, LineItem[]>()
  for (const m of months) {
    if (m.yearMonth <= throughYearMonth) byYm.set(m.yearMonth, linesByMonthId.get(m.id) ?? [])
  }
  return runningBalanceThrough(sorted, byYm, openingBalanceCents, throughYearMonth)
}

export function daysInMonth(yearMonth: string): number {
  const [y, m] = yearMonth.split('-').map(Number)
  if (!y || !m) return 31
  return new Date(y, m, 0).getDate()
}

export function monthDateBounds(yearMonth: string): { min: string; max: string } {
  const last = daysInMonth(yearMonth)
  return { min: `${yearMonth}-01`, max: `${yearMonth}-${String(last).padStart(2, '0')}` }
}

function isoFromDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Keep the day-of-month, limited to a real day in yearMonth. */
export function clampDateToMonth(isoDate: string, yearMonth: string): string {
  const { min, max } = monthDateBounds(yearMonth)
  if (isoDate >= min && isoDate <= max && isoDate.startsWith(`${yearMonth}-`)) return isoDate
  const day = Number(isoDate.slice(8, 10))
  const last = Number(max.slice(8, 10))
  const d = Number.isFinite(day) && day > 0 ? Math.min(day, last) : 1
  return `${yearMonth}-${String(d).padStart(2, '0')}`
}

/** Today when it falls in the month, otherwise the last day of a past month or the first of a future one. */
export function defaultOccurredOn(yearMonth: string, now = new Date()): string {
  const today = isoFromDate(now)
  const { min, max } = monthDateBounds(yearMonth)
  if (today < min) return min
  if (today > max) return max
  return today
}

export function occurredOnFromCreatedAt(createdAt: number, yearMonth: string): string {
  return clampDateToMonth(isoFromDate(new Date(createdAt)), yearMonth)
}

export function formatOccurredOn(isoDate: string, locale = 'en'): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (!y || !m || !d) return isoDate
  return new Date(y, m - 1, d).toLocaleDateString(locale, { month: 'short', day: 'numeric' })
}

export type CategoryChange = {
  categoryId: string
  type: LineType
  deltaCents: number
}

/** Largest category total change versus the previous month. Null when there is nothing to compare. */
export function biggestCategoryChange(current: LineItem[], previous: LineItem[]): CategoryChange | null {
  if (previous.length === 0) return null
  const totals = (list: LineItem[]) => {
    const map = new Map<string, { type: LineType; categoryId: string; cents: number }>()
    for (const l of list) {
      const key = `${l.type}:${l.categoryId}`
      const prev = map.get(key)
      if (prev) prev.cents += l.amountCents
      else map.set(key, { type: l.type, categoryId: l.categoryId, cents: l.amountCents })
    }
    return map
  }
  const a = totals(current)
  const b = totals(previous)
  let best: CategoryChange | null = null
  for (const key of new Set([...a.keys(), ...b.keys()])) {
    const delta = (a.get(key)?.cents ?? 0) - (b.get(key)?.cents ?? 0)
    if (delta === 0) continue
    const src = a.get(key) ?? b.get(key)!
    if (!best || Math.abs(delta) > Math.abs(best.deltaCents)) {
      best = { categoryId: src.categoryId, type: src.type, deltaCents: delta }
    }
  }
  return best
}

export function shiftYearMonth(yearMonth: string, deltaMonths: number): string | null {
  const [y, m] = yearMonth.split('-').map(Number)
  if (!y || !m) return null
  const d = new Date(y, m - 1 + deltaMonths, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function previousYearMonth(yearMonth: string): string | null {
  return shiftYearMonth(yearMonth, -1)
}

export function sameMonthLastYear(yearMonth: string): string | null {
  return shiftYearMonth(yearMonth, -12)
}

export function yearMonthsBack(from: string, count: number): string[] {
  const out: string[] = []
  for (let i = count - 1; i >= 0; i--) {
    const ym = shiftYearMonth(from, -i)
    if (ym) out.push(ym)
  }
  return out
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

export function yearOf(yearMonth: string): string {
  return yearMonth.slice(0, 4)
}

export function formatYearMonthLabel(yearMonth: string, locale = 'en'): string {
  const [y, m] = yearMonth.split('-').map(Number)
  if (!y || !m) return yearMonth
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })
}

export function formatMonthShort(yearMonth: string, locale = 'en'): string {
  const [y, m] = yearMonth.split('-').map(Number)
  if (!y || !m) return yearMonth
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'short' })
}

export function parseMoneyToCents(input: string): number | null {
  const normalized = input.replace(/,/g, '.').trim()
  if (!normalized) return null
  const value = Number.parseFloat(normalized)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 100)
}

/** Evaluates a chained expression such as "3200+850+12.5" into cents. */
export function evaluateAmountExpression(expr: string): number | null {
  const parts = expr.split('+').map((p) => p.trim())
  if (parts.length === 0) return null
  let total = 0
  for (const p of parts) {
    if (!p) continue
    const cents = parseMoneyToCents(p)
    if (cents === null) return null
    total += cents
  }
  return total
}

const fmtCache = new Map<string, Intl.NumberFormat>()

function moneyFormatter(currencyCode: string, locale: string, compact: boolean): Intl.NumberFormat {
  const key = `${locale}|${currencyCode}|${compact}`
  let f = fmtCache.get(key)
  if (!f) {
    const base: Intl.NumberFormatOptions = compact
      ? { style: 'currency', currency: currencyCode, notation: 'compact', maximumFractionDigits: 1 }
      : { style: 'currency', currency: currencyCode, maximumFractionDigits: 2 }
    try {
      f = new Intl.NumberFormat(locale, { ...base, currencyDisplay: 'narrowSymbol' })
    } catch {
      f = new Intl.NumberFormat(locale, base)
    }
    fmtCache.set(key, f)
  }
  return f
}

export function formatMoney(cents: number, currencyCode: string, locale = 'en'): string {
  if (!currencyCode) return (cents / 100).toFixed(2)
  return moneyFormatter(currencyCode, locale, false).format(cents / 100)
}

export function formatMoneyCompact(cents: number, currencyCode: string, locale = 'en'): string {
  if (!currencyCode) return (cents / 100).toFixed(0)
  return moneyFormatter(currencyCode, locale, true).format(cents / 100)
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2)
}

export type SeriesPoint = {
  yearMonth: string
  inCents: number
  outCents: number
  netCents: number
}

/** In/out/net per month for a list of yearMonths (missing months are zero). */
export function monthlySeries(
  yearMonths: string[],
  monthsByYearMonth: Map<string, MonthRecord>,
  linesByMonthId: Map<string, LineItem[]>,
): SeriesPoint[] {
  return yearMonths.map((ym) => {
    const m = monthsByYearMonth.get(ym)
    const lines = m ? (linesByMonthId.get(m.id) ?? []) : []
    const i = totalIn(lines)
    const o = totalOut(lines)
    return { yearMonth: ym, inCents: i, outCents: o, netCents: i - o }
  })
}

export type CategorySlice = { categoryId: string; cents: number; share: number }

export function categoryBreakdown(lines: LineItem[], type: 'in' | 'out'): CategorySlice[] {
  const map = new Map<string, number>()
  for (const l of lines) {
    if (l.type !== type) continue
    map.set(l.categoryId, (map.get(l.categoryId) ?? 0) + l.amountCents)
  }
  const total = [...map.values()].reduce((s, v) => s + v, 0)
  return [...map.entries()]
    .map(([categoryId, cents]) => ({ categoryId, cents, share: total ? cents / total : 0 }))
    .sort((a, b) => b.cents - a.cents)
}

export type YearSummary = {
  year: string
  inCents: number
  outCents: number
  netCents: number
  bestMonth: SeriesPoint | null
  worstMonth: SeriesPoint | null
  monthsWithData: number
}

export function yearSummary(year: string, series: SeriesPoint[]): YearSummary {
  const inYear = series.filter((p) => p.yearMonth.startsWith(year))
  const withData = inYear.filter((p) => p.inCents || p.outCents)
  const inCents = inYear.reduce((s, p) => s + p.inCents, 0)
  const outCents = inYear.reduce((s, p) => s + p.outCents, 0)
  let best: SeriesPoint | null = null
  let worst: SeriesPoint | null = null
  for (const p of withData) {
    if (!best || p.netCents > best.netCents) best = p
    if (!worst || p.netCents < worst.netCents) worst = p
  }
  return {
    year,
    inCents,
    outCents,
    netCents: inCents - outCents,
    bestMonth: best,
    worstMonth: worst,
    monthsWithData: withData.length,
  }
}

export function reconcileMismatch(month: MonthRecord, lines: LineItem[]): boolean {
  const i = totalIn(lines)
  const o = totalOut(lines)
  if (month.reconcileInCents !== null && month.reconcileInCents !== i) return true
  if (month.reconcileOutCents !== null && month.reconcileOutCents !== o) return true
  return false
}

/** Average money-out over months with out > 0, up to lastN most recent in series order. */
export function averageMonthlyOutCents(series: SeriesPoint[], lastN = 6): number | null {
  const withOut = series.filter((p) => p.outCents > 0)
  if (withOut.length < 2) return null
  const slice = withOut.slice(-lastN)
  const sum = slice.reduce((s, p) => s + p.outCents, 0)
  return Math.round(sum / slice.length)
}

/** Whole months of balance at recent average spending; null when not meaningful. */
export function runwayMonths(balanceCents: number, avgOutCents: number | null): number | null {
  if (avgOutCents === null || avgOutCents <= 0 || balanceCents <= 0) return null
  return Math.floor(balanceCents / avgOutCents)
}

/** Consecutive closed months ending at the month before fromYm. */
export function closedMonthStreak(months: MonthRecord[], propertyId: string, fromYm: string): number {
  let ym: string | null = previousYearMonth(fromYm)
  let count = 0
  while (ym) {
    const m = months.find((x) => x.propertyId === propertyId && x.yearMonth === ym)
    if (!m || m.status !== 'done') break
    count += 1
    ym = previousYearMonth(ym)
  }
  return count
}

export function categorySpend(lines: LineItem[], categoryId: string, type: LineType): number {
  return lines.filter((l) => l.type === type && l.categoryId === categoryId).reduce((s, l) => s + l.amountCents, 0)
}

export function linesOnDay(lines: LineItem[], day: string): LineItem[] {
  return lines.filter((l) => l.occurredOn === day)
}

export function dayActivityMap(lines: LineItem[]): Map<string, { inCents: number; outCents: number }> {
  const map = new Map<string, { inCents: number; outCents: number }>()
  for (const l of lines) {
    const cur = map.get(l.occurredOn) ?? { inCents: 0, outCents: 0 }
    if (l.type === 'in') cur.inCents += l.amountCents
    else cur.outCents += l.amountCents
    map.set(l.occurredOn, cur)
  }
  return map
}
