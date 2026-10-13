import { Lock, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Sparkline } from '../components/charts'
import { getCategoryLabel } from '../domain/categories'
import {
  closedMonthStreak,
  currentYearMonth,
  formatMoney,
  visibleStatus,
  formatOccurredOn,
  formatYearMonthLabel,
  monthlySeries,
  net,
  parseMoneyToCents,
  reconcileMismatch,
  totalIn,
  totalOut,
  yearMonthsBack,
  yearOf,
} from '../domain/calc'
import type { LineItem, MonthRecord, UserCategory } from '../domain/types'
import { Badge, Chip } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'
import { getOrCreateMonth } from '../storage/repository'

type Filter = 'all' | 'done' | 'mismatch' | 'empty'

function lineMatches(line: LineItem, query: string, categories: UserCategory[]): boolean {
  const label = getCategoryLabel(line.categoryId, categories).toLowerCase()
  if (label.includes(query) || line.note.toLowerCase().includes(query) || (line.occurredOn ?? '').includes(query)) return true
  const money = query.replace(/,/g, '.').replace(/[^\d.]/g, '')
  if (!money) return false
  if ((line.amountCents / 100).toFixed(2).includes(money)) return true
  const parsed = parseMoneyToCents(money)
  return parsed !== null && parsed === line.amountCents
}

export function MonthsPage() {
  const property = useActiveProperty()
  const { settings, months, monthsByYearMonth, linesByMonthId, categories, refresh } = useAppData()
  const locale = settings.locale
  const currency = property.currencyCode
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const current = currentYearMonth()
  const streak = closedMonthStreak(months, property.id, current)
  const last12 = useMemo(() => yearMonthsBack(current, 12), [current])

  useEffect(() => {
    const missing = last12.filter((ym) => !monthsByYearMonth.has(ym))
    if (missing.length === 0) return
    void Promise.all(missing.map((ym) => getOrCreateMonth(property.id, ym))).then(() => refresh())
  }, [last12, monthsByYearMonth, property.id, refresh])

  const q = query.trim().toLowerCase()
  const matchesQuery = (lines: LineItem[]) => !q || lines.some((l) => lineMatches(l, q, categories))

  const visible = useMemo(() => {
    const sorted = [...months].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))
    return sorted.filter((m) => {
      const lines = linesByMonthId.get(m.id) ?? []
      if (!matchesQuery(lines)) return false
      if (filter === 'done') return m.status === 'done'
      if (filter === 'mismatch') return reconcileMismatch(m, lines)
      if (filter === 'empty') return lines.length === 0
      return true
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [months, linesByMonthId, filter, q, categories])

  const byYear = useMemo(() => {
    const map = new Map<string, MonthRecord[]>()
    for (const m of visible) {
      const y = yearOf(m.yearMonth)
      map.set(y, [...(map.get(y) ?? []), m])
    }
    return [...map.entries()]
  }, [visible])

  const filters: { id: Filter; label: string }[] = [
    { id: 'all', label: t('months.filterAll', locale) },
    { id: 'done', label: t('months.filterDone', locale) },
    { id: 'mismatch', label: t('months.filterMismatch', locale) },
    { id: 'empty', label: t('months.filterEmpty', locale) },
  ]

  return (
    <ScreenShell showSwitcher>
      <div className="row row--between" style={{ marginBottom: 'var(--s-2)' }}>
        <h1 className="title" style={{ margin: 0 }}>{t('months.title', locale)}</h1>
        {streak >= 2 ? <Badge status="done">{t('streak.badge', locale, { n: String(streak) })}</Badge> : null}
      </div>
      <div className="row" style={{ marginBottom: 'var(--s-3)' }}>
        <div className="row grow" style={{ position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: 14, color: 'var(--ink-3)' }} aria-hidden />
          <input className="input" style={{ paddingLeft: 42, fontSize: '1rem' }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('months.searchHint', locale)} aria-label={t('common.search', locale)} />
        </div>
      </div>
      <div className="chips" style={{ marginBottom: 'var(--s-2)' }}>
        {filters.map((f) => (
          <Chip key={f.id} active={filter === f.id} onClick={() => setFilter(f.id)}>{f.label}</Chip>
        ))}
      </div>

      {byYear.length === 0 ? <p className="muted">{t('months.noResults', locale)}</p> : null}

      {byYear.map(([year, list]) => {
        const yearSeries = monthlySeries(yearMonthsBack(`${year}-12`, 12), monthsByYearMonth, linesByMonthId)
        const yNet = yearSeries.reduce((s, p) => s + p.netCents, 0)
        return (
          <section key={year}>
            <Link to={`/year/${year}`} className="year-head" style={{ textDecoration: 'none' }}>
              <span>{year}</span>
              <span className="row" style={{ gap: 'var(--s-3)' }}>
                <span className={`money ${yNet < 0 ? 'money--out' : 'money--in'}`} style={{ fontSize: '1rem' }}>{formatMoney(yNet, currency, locale)}</span>
                <Sparkline series={yearSeries} />
              </span>
            </Link>
            <div className="stack">
              {list.map((m) => {
                const lines = linesByMonthId.get(m.id) ?? []
                const i = totalIn(lines)
                const o = totalOut(lines)
                const total = i + o || 1
                const mismatch = reconcileMismatch(m, lines)
                const shown = visibleStatus(m.status)
                const idx = last12.indexOf(m.yearMonth)
                const spark = monthlySeries(yearMonthsBack(m.yearMonth, 6), monthsByYearMonth, linesByMonthId)
                return (
                  <Link key={m.id} to={`/month/${m.yearMonth}`} className="card mcard">
                    <div className="row row--between">
                      <strong>{formatYearMonthLabel(m.yearMonth, locale)}</strong>
                      <Badge status={mismatch && shown !== 'done' ? 'warn' : shown}>
                        {shown === 'done' ? <Lock size={12} /> : null}
                        {mismatch && shown !== 'done' ? t('months.filterMismatch', locale) : t(`status.${shown}`, locale)}
                      </Badge>
                    </div>
                    <div className="row row--between" style={{ marginTop: 'var(--s-3)' }}>
                      <span className="money money--in">{formatMoney(i, currency, locale)}</span>
                      <span className="money money--out">{formatMoney(o, currency, locale)}</span>
                      <strong className="money">{formatMoney(net(lines), currency, locale)}</strong>
                      {idx >= 0 ? <Sparkline series={spark} width={56} height={22} /> : null}
                    </div>
                    <div className="mcard__bar" aria-hidden>
                      <div className="mcard__bar-in" style={{ width: `${(i / total) * 100}%` }} />
                      <div className="mcard__bar-out" style={{ width: `${(o / total) * 100}%` }} />
                    </div>
                    {q ? (
                      <div className="stack" style={{ marginTop: 'var(--s-3)' }}>
                        {lines.filter((l) => lineMatches(l, q, categories)).map((l) => (
                          <div key={l.id} className="caption">
                            {l.occurredOn ? `${formatOccurredOn(l.occurredOn, locale)} · ` : ''}
                            {getCategoryLabel(l.categoryId, categories)}
                            {l.note ? ` · ${l.note}` : ''} · {formatMoney(l.amountCents, currency, locale)}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </Link>
                )
              })}
            </div>
          </section>
        )
      })}
    </ScreenShell>
  )
}
