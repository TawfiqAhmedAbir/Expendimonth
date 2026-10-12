import { Link } from 'react-router-dom'
import {
  currentYearMonth,
  formatMoney,
  formatYearMonthLabel,
  net,
  totalIn,
  totalOut,
} from '../domain/calc'
import { propertyTypeLabel } from '../domain/propertyTypes'
import { t } from '../i18n'
import { ScreenShell } from '../design-kit/ScreenShell'
import { HeroTotals } from '../components/HeroTotals'
import { useAppData } from '../storage/AppDataContext'
import { getOrCreateMonth } from '../storage/repository'
import { useEffect, useState } from 'react'

export function HomePage() {
  const { settings, months, linesByMonthId } = useAppData()
  const locale = settings.locale
  const ym = currentYearMonth()
  const [monthId, setMonthId] = useState<string | null>(null)

  useEffect(() => {
    void getOrCreateMonth(ym).then((m) => setMonthId(m.id))
  }, [ym])

  const lines = monthId ? (linesByMonthId.get(monthId) ?? []) : []
  const monthRecord = months.find((m) => m.yearMonth === ym)
  const isEmpty = lines.length === 0
  const currency = settings.currencyCode

  return (
    <ScreenShell>
      <p className="page-sub" style={{ marginTop: 0 }}>
        {t('home.greeting', locale, { name: settings.userName })}
      </p>
      <h1 className="page-title">{settings.propertyName}</h1>
      <p className="page-sub">{propertyTypeLabel(settings, locale)}</p>

      {isEmpty ? (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <h2 className="section-head" style={{ marginTop: 0 }}>
            {formatYearMonthLabel(ym, locale)}
          </h2>
          <p style={{ color: 'var(--color-muted)', margin: '0 0 var(--space-lg)' }}>
            {t('home.emptyMonth', locale)}
          </p>
          <Link to={`/month/${ym}`} className="btn btn--primary btn--block">
            {t('home.startMonth', locale)}
          </Link>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="section-head" style={{ margin: 0 }}>
                {formatYearMonthLabel(ym, locale)}
              </h2>
              {monthRecord ? (
                <span className={`badge badge--${monthRecord.status === 'done' ? 'done' : 'open'}`}>
                  {t(monthRecord.status === 'done' ? 'status.done' : 'status.open', locale)}
                </span>
              ) : null}
            </div>
            <HeroTotals lines={lines} currencyCode={currency} locale={locale} />
            <p style={{ textAlign: 'center', margin: 'var(--space-md) 0 0', color: 'var(--color-muted)' }}>
              {t('home.summaryHint', locale, {
                in: formatMoney(totalIn(lines), currency, locale),
                out: formatMoney(totalOut(lines), currency, locale),
                left: formatMoney(net(lines), currency, locale),
              })}
            </p>
          </div>
          <Link to={`/month/${ym}`} className="btn btn--primary btn--block">
            {t('home.openMonth', locale)}
          </Link>
        </>
      )}

      <Link
        to="/months"
        className="btn btn--ghost btn--block"
        style={{ marginTop: 'var(--space-md)' }}
      >
        {t('home.allMonths', locale)}
      </Link>
    </ScreenShell>
  )
}
