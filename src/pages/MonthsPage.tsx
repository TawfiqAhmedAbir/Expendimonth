import { useEffect, useMemo } from 'react'
import { currentYearMonth, formatYearMonthLabel, totalIn, totalOut } from '../domain/calc'
import { t } from '../i18n'
import { ScreenShell } from '../design-kit/ScreenShell'
import { MonthCard } from '../components/MonthCard'
import { MoneyBarChart } from '../components/MoneyBarChart'
import { getOrCreateMonth } from '../storage/repository'
import { useAppData } from '../storage/AppDataContext'

function addMonthsBack(from: string, count: number): string[] {
  const [y, m] = from.split('-').map(Number)
  const out: string[] = []
  const d = new Date(y!, m! - 1, 1)
  for (let i = count - 1; i >= 0; i--) {
    const dt = new Date(d.getFullYear(), d.getMonth() - i, 1)
    out.push(`${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`)
  }
  return out
}

export function MonthsPage() {
  const { settings, months, linesByMonthId, refresh } = useAppData()
  const locale = settings.locale
  const currency = settings.currencyCode

  const yearMonths = useMemo(() => addMonthsBack(currentYearMonth(), 12), [])

  useEffect(() => {
    void (async () => {
      for (const ym of yearMonths) await getOrCreateMonth(ym)
      await refresh()
    })()
  }, [yearMonths, refresh])

  const monthByYm = useMemo(() => {
    const map = new Map<string, (typeof months)[0]>()
    for (const m of months) map.set(m.yearMonth, m)
    return map
  }, [months])

  const trendData = yearMonths.map((ym) => {
    const m = monthByYm.get(ym)
    const lines = m ? (linesByMonthId.get(m.id) ?? []) : []
    return {
      label: formatYearMonthLabel(ym, locale).slice(0, 3),
      inCents: totalIn(lines),
      outCents: totalOut(lines),
    }
  })

  const sortedMonths = [...months].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth))

  return (
    <ScreenShell>
      <h1 className="page-title">{t('months.title', locale)}</h1>
      <h2 className="section-head">{t('months.trends', locale)}</h2>
      <div className="card">
        <MoneyBarChart data={trendData} currencyCode={currency} locale={locale} compact />
      </div>
      {sortedMonths.map((month) => (
        <MonthCard
          key={month.id}
          month={month}
          lines={linesByMonthId.get(month.id) ?? []}
          currencyCode={currency}
          locale={locale}
        />
      ))}
      {sortedMonths.length === 0 ? (
        <p style={{ color: 'var(--color-muted)' }}>{t('status.empty', locale)}</p>
      ) : null}
    </ScreenShell>
  )
}
