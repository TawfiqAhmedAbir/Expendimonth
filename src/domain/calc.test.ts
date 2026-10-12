import { describe, expect, it } from 'vitest'
import {
  categoryBreakdown,
  compareNetToPreviousMonth,
  deriveMonthStatus,
  evaluateAmountExpression,
  monthlySeries,
  net,
  previousYearMonth,
  reconcileMismatch,
  runningBalanceThrough,
  sameMonthLastYear,
  totalIn,
  totalOut,
  yearMonthsBack,
  yearSummary,
} from './calc'
import type { LineItem, MonthRecord } from './types'

const lines = (items: Partial<LineItem>[], monthId = 'm1'): LineItem[] =>
  items.map((item, i) => ({
    id: `${monthId}-${i}`,
    monthId,
    type: 'in',
    amountCents: 0,
    categoryId: 'c',
    note: '',
    createdAt: i,
    ...item,
  }))

const month = (yearMonth: string, extra: Partial<MonthRecord> = {}): MonthRecord => ({
  id: `p:${yearMonth}`,
  propertyId: 'p',
  yearMonth,
  status: 'open',
  reconcileInCents: null,
  reconcileOutCents: null,
  closedAt: null,
  ...extra,
})

describe('totals', () => {
  it('sums in, out and net', () => {
    const l = lines([
      { type: 'in', amountCents: 10000 },
      { type: 'in', amountCents: 5000 },
      { type: 'out', amountCents: 3000 },
    ])
    expect(totalIn(l)).toBe(15000)
    expect(totalOut(l)).toBe(3000)
    expect(net(l)).toBe(12000)
  })

  it('running balance through month', () => {
    const map = new Map<string, LineItem[]>()
    map.set('2026-01', lines([{ type: 'in', amountCents: 10000 }]))
    map.set('2026-02', lines([{ type: 'out', amountCents: 4000 }]))
    expect(runningBalanceThrough(['2026-01', '2026-02'], map, 1000, '2026-01')).toBe(11000)
    expect(runningBalanceThrough(['2026-01', '2026-02'], map, 1000, '2026-02')).toBe(7000)
  })
})

describe('dates', () => {
  it('previous and same-month-last-year', () => {
    expect(previousYearMonth('2026-03')).toBe('2026-02')
    expect(previousYearMonth('2026-01')).toBe('2025-12')
    expect(sameMonthLastYear('2026-03')).toBe('2025-03')
  })

  it('yearMonthsBack returns ascending list ending at from', () => {
    expect(yearMonthsBack('2026-02', 3)).toEqual(['2025-12', '2026-01', '2026-02'])
  })
})

describe('status and compare', () => {
  it('derives status', () => {
    expect(deriveMonthStatus([], 'done')).toBe('empty')
    expect(deriveMonthStatus(lines([{ amountCents: 1 }]), 'done')).toBe('done')
    expect(deriveMonthStatus(lines([{ amountCents: 1 }]), 'checked')).toBe('open')
  })

  it('compares to previous month', () => {
    const r = compareNetToPreviousMonth(5000, 3000)
    expect(r?.deltaCents).toBe(2000)
    expect(r?.better).toBe(true)
  })

  it('flags reconcile mismatch', () => {
    const l = lines([{ type: 'in', amountCents: 1000 }])
    expect(reconcileMismatch(month('2026-01', { reconcileInCents: 1000 }), l)).toBe(false)
    expect(reconcileMismatch(month('2026-01', { reconcileInCents: 900 }), l)).toBe(true)
  })
})

describe('amount expression', () => {
  it('chains additions', () => {
    expect(evaluateAmountExpression('3200+850')).toBe(405000)
    expect(evaluateAmountExpression('12.5')).toBe(1250)
    expect(evaluateAmountExpression('3200+')).toBe(320000)
    expect(evaluateAmountExpression('abc')).toBeNull()
  })
})

describe('series and summaries', () => {
  const months = new Map<string, MonthRecord>([
    ['2026-01', month('2026-01')],
    ['2026-02', month('2026-02')],
  ])
  const byMonthId = new Map<string, LineItem[]>([
    ['p:2026-01', lines([{ type: 'in', amountCents: 5000 }, { type: 'out', amountCents: 1000, categoryId: 'a' }], 'p:2026-01')],
    ['p:2026-02', lines([{ type: 'in', amountCents: 2000 }, { type: 'out', amountCents: 3000, categoryId: 'b' }], 'p:2026-02')],
  ])

  it('monthlySeries zero-fills missing months', () => {
    const s = monthlySeries(['2025-12', '2026-01', '2026-02'], months, byMonthId)
    expect(s[0]).toEqual({ yearMonth: '2025-12', inCents: 0, outCents: 0, netCents: 0 })
    expect(s[1]?.netCents).toBe(4000)
    expect(s[2]?.netCents).toBe(-1000)
  })

  it('yearSummary picks best and worst', () => {
    const s = monthlySeries(['2026-01', '2026-02'], months, byMonthId)
    const y = yearSummary('2026', s)
    expect(y.inCents).toBe(7000)
    expect(y.outCents).toBe(4000)
    expect(y.bestMonth?.yearMonth).toBe('2026-01')
    expect(y.worstMonth?.yearMonth).toBe('2026-02')
    expect(y.monthsWithData).toBe(2)
  })

  it('categoryBreakdown shares sum to 1', () => {
    const l = lines([
      { type: 'out', amountCents: 300, categoryId: 'a' },
      { type: 'out', amountCents: 100, categoryId: 'b' },
      { type: 'in', amountCents: 999, categoryId: 'c' },
    ])
    const b = categoryBreakdown(l, 'out')
    expect(b[0]).toEqual({ categoryId: 'a', cents: 300, share: 0.75 })
    expect(b.reduce((s, x) => s + x.share, 0)).toBeCloseTo(1)
  })
})
