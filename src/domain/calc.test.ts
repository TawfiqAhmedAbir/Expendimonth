import { describe, expect, it } from 'vitest'
import {
  compareNetToPreviousMonth,
  net,
  previousYearMonth,
  runningBalanceThrough,
  totalIn,
  totalOut,
} from './calc'
import type { LineItem } from './types'

const lines = (items: Partial<LineItem>[]): LineItem[] =>
  items.map((item, i) => ({
    id: String(i),
    monthId: 'm1',
    type: 'in',
    amountCents: 0,
    categoryId: 'other',
    note: '',
    createdAt: i,
    ...item,
  }))

describe('calc', () => {
  it('totals in and out', () => {
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
    const sorted = ['2026-01', '2026-02']
    expect(runningBalanceThrough(sorted, map, 1000, '2026-01')).toBe(11000)
    expect(runningBalanceThrough(sorted, map, 1000, '2026-02')).toBe(7000)
  })

  it('previous year month', () => {
    expect(previousYearMonth('2026-03')).toBe('2026-02')
    expect(previousYearMonth('2026-01')).toBe('2025-12')
  })

  it('compare to previous month', () => {
    const r = compareNetToPreviousMonth(5000, 3000)
    expect(r?.deltaCents).toBe(2000)
    expect(r?.better).toBe(true)
  })
})
