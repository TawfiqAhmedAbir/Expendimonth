import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Donut, DONUT_COLORS, InOutBars, NetLine } from '../components/charts'
import { getCategoryLabel } from '../domain/categories'
import {
  biggestCategoryChange,
  categoryBreakdown,
  categorySpend,
  compareNetToPreviousMonth,
  currentYearMonth,
  formatMoney,
  formatMonthShort,
  formatYearMonthLabel,
  monthlySeries,
  previousYearMonth,
  sameMonthLastYear,
  yearMonthsBack,
  yearOf,
  yearSummary,
  type CategoryChange,
} from '../domain/calc'
import { Card, Chip, LinkButton } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'

function categoryTone(change: CategoryChange): string {
  const up = change.deltaCents > 0
  const better = change.type === 'in' ? up : !up
  return better ? 'insight--positive' : 'insight--negative'
}

export function InsightsPage() {
  const property = useActiveProperty()
  const { settings, monthsByYearMonth, linesByMonthId, categories } = useAppData()
  const locale = settings.locale
  const currency = property.currencyCode
  const navigate = useNavigate()
  const current = currentYearMonth()
  const [selected, setSelected] = useState(current)
  const [donutType, setDonutType] = useState<'out' | 'in'>('out')

  const last12 = useMemo(() => yearMonthsBack(current, 12), [current])
  const series = useMemo(() => monthlySeries(last12, monthsByYearMonth, linesByMonthId), [last12, monthsByYearMonth, linesByMonthId])
  const hasData = series.some((p) => p.inCents || p.outCents)

  const selMonth = monthsByYearMonth.get(selected)
  const selLines = selMonth ? (linesByMonthId.get(selMonth.id) ?? []) : []
  const selNet = series.find((p) => p.yearMonth === selected)?.netCents ?? 0

  const vsLast = useMemo(() => {
    const p = previousYearMonth(selected)
    const pm = p ? monthsByYearMonth.get(p) : undefined
    const pl = pm ? (linesByMonthId.get(pm.id) ?? []) : []
    if (pl.length === 0) return null
    return compareNetToPreviousMonth(selNet, pl.reduce((s, l) => s + (l.type === 'in' ? l.amountCents : -l.amountCents), 0))
  }, [selected, monthsByYearMonth, linesByMonthId, selNet])

  const vsLastYear = useMemo(() => {
    const p = sameMonthLastYear(selected)
    const pm = p ? monthsByYearMonth.get(p) : undefined
    const pl = pm ? (linesByMonthId.get(pm.id) ?? []) : []
    if (pl.length === 0) return null
    return compareNetToPreviousMonth(selNet, pl.reduce((s, l) => s + (l.type === 'in' ? l.amountCents : -l.amountCents), 0))
  }, [selected, monthsByYearMonth, linesByMonthId, selNet])

  const breakdown = useMemo(() => categoryBreakdown(selLines, donutType), [selLines, donutType])
  const categoryMove = useMemo(() => {
    const p = previousYearMonth(selected)
    const pm = p ? monthsByYearMonth.get(p) : undefined
    const pl = pm ? (linesByMonthId.get(pm.id) ?? []) : []
    return biggestCategoryChange(selLines, pl)
  }, [selected, monthsByYearMonth, linesByMonthId, selLines])
  const year = yearOf(selected)
  const ySummary = useMemo(() => yearSummary(year, monthlySeries(yearMonthsBack(`${year}-12`, 12), monthsByYearMonth, linesByMonthId)), [year, monthsByYearMonth, linesByMonthId])

  const delta = (d: { deltaCents: number; better: boolean } | null) =>
    d ? <span className={`money ${d.better ? 'money--in' : 'money--out'}`}>{d.better ? '+' : '−'}{formatMoney(Math.abs(d.deltaCents), currency, locale)}</span> : <span className="muted">—</span>

  return (
    <ScreenShell showSwitcher>
      <h1 className="title">{t('insights.title', locale)}</h1>

      {!hasData ? (
        <Card variant="flat"><p className="muted" style={{ margin: 0 }}>{t('insights.noData', locale)}</p></Card>
      ) : (
        <div className="stack">
          <Card>
            <h2 className="section" style={{ marginTop: 0 }}>{t('insights.inOut', locale)}</h2>
            <InOutBars series={series} currencyCode={currency} locale={locale} onSelect={(ym) => navigate(`/month/${ym}`)} />
          </Card>

          <Card>
            <h2 className="section" style={{ marginTop: 0 }}>{t('insights.net', locale)}</h2>
            <NetLine series={series} currencyCode={currency} locale={locale} />
          </Card>

          <Card>
            <div className="stack" style={{ gap: 'var(--s-2)', marginBottom: 'var(--s-3)' }}>
              <h2 className="section" style={{ margin: 0 }}>{formatYearMonthLabel(selected, locale)}</h2>
              <select className="input" style={{ minHeight: '2.75rem', fontSize: '1rem' }} value={selected} onChange={(e) => setSelected(e.target.value)} aria-label={t('insights.selectMonth', locale)}>
                {[...last12].reverse().map((ym) => (
                  <option key={ym} value={ym}>{formatYearMonthLabel(ym, locale)}</option>
                ))}
              </select>
            </div>
            <div className="totals" style={{ borderTop: 'none', paddingTop: 0 }}>
              <div className="totals__row"><span>{t('money.left', locale)}</span><strong className="money">{formatMoney(selNet, currency, locale)}</strong></div>
              <div className="totals__row"><span>{t('insights.vsLast', locale)}</span>{delta(vsLast)}</div>
              <div className="totals__row"><span>{t('insights.vsLastYear', locale, { month: formatMonthShort(selected, locale) })}</span>{delta(vsLastYear)}</div>
            </div>
            {categoryMove ? (
              <div className={`insight ${categoryTone(categoryMove)}`} style={{ marginTop: 'var(--s-3)' }}>
                {t(categoryMove.deltaCents > 0 ? 'home.categoryUp' : 'home.categoryDown', locale, {
                  category: getCategoryLabel(categoryMove.categoryId, categories),
                  amount: formatMoney(Math.abs(categoryMove.deltaCents), currency, locale),
                })}
              </div>
            ) : null}
            <div className="row" style={{ marginTop: 'var(--s-3)' }}>
              <LinkButton to={`/month/${selected}`} variant="ghost" className="grow">{t('home.openMonth', locale)}</LinkButton>
            </div>
          </Card>

          <Card>
            <div className="stack" style={{ gap: 'var(--s-2)', marginBottom: 'var(--s-3)' }}>
              <h2 className="section" style={{ margin: 0 }}>{donutType === 'out' ? t('insights.where', locale) : t('insights.whereIn', locale)}</h2>
              <div className="chips">
                <Chip active={donutType === 'out'} onClick={() => setDonutType('out')}>{t('money.out', locale)}</Chip>
                <Chip active={donutType === 'in'} onClick={() => setDonutType('in')}>{t('money.in', locale)}</Chip>
              </div>
            </div>
            {breakdown.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>{t('insights.noData', locale)}</p>
            ) : (
              <>
                <Donut
                  slices={breakdown.map((b) => ({ id: b.categoryId, label: getCategoryLabel(b.categoryId, categories), cents: b.cents }))}
                  currencyCode={currency}
                  locale={locale}
                  onSelectSlice={(id) => navigate(`/month/${selected}?category=${id}`)}
                />
                <div className="stack" style={{ marginTop: 'var(--s-3)' }}>
                  {breakdown.map((b, i) => {
                    const cat = categories.find((c) => c.id === b.categoryId)
                    const budget = donutType === 'out' && cat?.budgetCents ? cat.budgetCents : null
                    const spent = budget ? categorySpend(selLines, b.categoryId, 'out') : 0
                    return (
                    <button
                      key={b.categoryId}
                      type="button"
                      className="row row--between"
                      style={{ marginTop: 'var(--s-2)', width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 'var(--s-2) 0', font: 'inherit', color: 'inherit' }}
                      onClick={() => navigate(`/month/${selected}?category=${b.categoryId}`)}
                    >
                      <span className="row"><span className="topbar__dot" style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />{getCategoryLabel(b.categoryId, categories)}</span>
                      <span className="money">
                        {formatMoney(b.cents, currency, locale)} <span className="caption">{Math.round(b.share * 100)}%</span>
                        {budget ? <span className="caption"> · {t('budget.ofLimit', locale, { pct: String(Math.min(999, Math.round((spent / budget) * 100))) })}</span> : null}
                      </span>
                    </button>
                    )
                  })}
                </div>
              </>
            )}
          </Card>

          <Card variant="flat">
            <div className="row row--between">
              <h2 className="section" style={{ margin: 0 }}>{t('year.title', locale, { year })}</h2>
              <button type="button" className="btn btn--ghost btn--sm" onClick={() => navigate(`/year/${year}`)}>{t('months.yearSummary', locale)}</button>
            </div>
            <div className="totals" style={{ marginTop: 'var(--s-3)' }}>
              <div className="totals__row"><span>{t('money.in', locale)}</span><span className="money money--in">{formatMoney(ySummary.inCents, currency, locale)}</span></div>
              <div className="totals__row"><span>{t('money.out', locale)}</span><span className="money money--out">{formatMoney(ySummary.outCents, currency, locale)}</span></div>
              <div className="totals__row" style={{ fontWeight: 800 }}><span>{t('money.left', locale)}</span><span className="money">{formatMoney(ySummary.netCents, currency, locale)}</span></div>
            </div>
          </Card>
        </div>
      )}
    </ScreenShell>
  )
}
