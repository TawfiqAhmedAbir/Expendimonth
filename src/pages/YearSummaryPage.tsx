import { ArrowLeft, Printer } from 'lucide-react'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { InOutBars, NetLine } from '../components/charts'
import { formatMoney, formatYearMonthLabel, monthlySeries, yearMonthsBack, yearSummary } from '../domain/calc'
import { Card, LinkButton } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'

export function YearSummaryPage() {
  const { year = '' } = useParams()
  const property = useActiveProperty()
  const { settings, monthsByYearMonth, linesByMonthId } = useAppData()
  const locale = settings.locale
  const currency = property.currencyCode

  const series = useMemo(() => monthlySeries(yearMonthsBack(`${year}-12`, 12), monthsByYearMonth, linesByMonthId), [year, monthsByYearMonth, linesByMonthId])
  const s = useMemo(() => yearSummary(year, series), [year, series])

  return (
    <ScreenShell>
      <LinkButton to="/months" variant="subtle" style={{ marginBottom: 'var(--s-2)', paddingLeft: 0 }}>
        <ArrowLeft size={18} /> {t('nav.months', locale)}
      </LinkButton>
      <div className="row row--between" style={{ marginBottom: 'var(--s-4)' }}>
        <h1 className="title" style={{ margin: 0 }}>{t('year.title', locale, { year })}</h1>
        <LinkButton to={`/report/year/${year}`} variant="ghost"><Printer size={18} /> {t('year.print', locale)}</LinkButton>
      </div>

      <Card>
        <p className="caption" style={{ margin: 0 }}>{t('money.left', locale)}</p>
        <p className={`money money--hero ${s.netCents < 0 ? 'money--out' : ''}`} style={{ margin: '0 0 var(--s-3)' }}>{formatMoney(s.netCents, currency, locale)}</p>
        <div className="totals" style={{ marginTop: 0 }}>
          <div className="totals__row"><span>{t('money.in', locale)}</span><span className="money money--in">{formatMoney(s.inCents, currency, locale)}</span></div>
          <div className="totals__row"><span>{t('money.out', locale)}</span><span className="money money--out">{formatMoney(s.outCents, currency, locale)}</span></div>
          <div className="totals__row"><span>{t('year.monthsWithData', locale, { n: String(s.monthsWithData) })}</span><span /></div>
        </div>
      </Card>

      <div className="row" style={{ marginTop: 'var(--s-4)', alignItems: 'stretch' }}>
        <Card variant="flat" className="grow">
          <p className="caption" style={{ margin: 0 }}>{t('year.best', locale)}</p>
          {s.bestMonth ? (<><strong>{formatYearMonthLabel(s.bestMonth.yearMonth, locale)}</strong><div className="money money--in">{formatMoney(s.bestMonth.netCents, currency, locale)}</div></>) : <span className="muted">—</span>}
        </Card>
        <Card variant="flat" className="grow">
          <p className="caption" style={{ margin: 0 }}>{t('year.worst', locale)}</p>
          {s.worstMonth ? (<><strong>{formatYearMonthLabel(s.worstMonth.yearMonth, locale)}</strong><div className="money money--out">{formatMoney(s.worstMonth.netCents, currency, locale)}</div></>) : <span className="muted">—</span>}
        </Card>
      </div>

      <Card style={{ marginTop: 'var(--s-4)' }}>
        <h2 className="section" style={{ marginTop: 0 }}>{t('insights.inOut', locale)}</h2>
        <InOutBars series={series} currencyCode={currency} locale={locale} />
      </Card>
      <Card style={{ marginTop: 'var(--s-4)' }}>
        <h2 className="section" style={{ marginTop: 0 }}>{t('insights.net', locale)}</h2>
        <NetLine series={series} currencyCode={currency} locale={locale} />
      </Card>
    </ScreenShell>
  )
}
