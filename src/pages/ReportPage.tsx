import { ArrowLeft, Printer, Share2 } from 'lucide-react'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { getCategoryLabel } from '../domain/categories'
import { formatMoney, formatOccurredOn, formatYearMonthLabel, monthlySeries, net, totalIn, totalOut, yearMonthsBack, yearSummary } from '../domain/calc'
import { propertyTypeLabel } from '../domain/propertyTypes'
import { Button, LinkButton } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { buildMonthShareText, sharePlainText } from '../domain/shareText'
import { useToast } from '../components/Toast'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'

export function ReportPage() {
  const { scope = 'month', id = '' } = useParams()
  const property = useActiveProperty()
  const { settings, monthsByYearMonth, linesByMonthId, categories } = useAppData()
  const { showToast } = useToast()
  const locale = settings.locale
  const currency = property.currencyCode

  const month = scope === 'month' ? monthsByYearMonth.get(id) : undefined
  const lines = month ? (linesByMonthId.get(month.id) ?? []) : []

  const series = useMemo(() => (scope === 'year' ? monthlySeries(yearMonthsBack(`${id}-12`, 12), monthsByYearMonth, linesByMonthId) : []), [scope, id, monthsByYearMonth, linesByMonthId])
  const ys = useMemo(() => (scope === 'year' ? yearSummary(id, series) : null), [scope, id, series])

  const period = scope === 'month' ? formatYearMonthLabel(id, locale) : id
  const back = scope === 'month' ? `/month/${id}` : `/year/${id}`

  return (
    <ScreenShell hideNav>
      <div className="row row--between no-print" style={{ marginBottom: 'var(--s-4)' }}>
        <LinkButton to={back} variant="subtle" style={{ paddingLeft: 0 }}><ArrowLeft size={18} /> {t('common.back', locale)}</LinkButton>
        <div className="row" style={{ gap: 'var(--s-2)' }}>
          {scope === 'month' && month ? (
            <Button
              variant="ghost"
              onClick={() => {
                const text = buildMonthShareText(property, id, month, lines, categories, locale)
                void sharePlainText(text, property.name).then((ok) => { if (ok) showToast({ message: t('share.done', locale) }) })
              }}
            >
              <Share2 size={18} /> {t('share.action', locale)}
            </Button>
          ) : null}
          <Button variant="primary" onClick={() => window.print()}><Printer size={18} /> {t('report.print', locale)}</Button>
        </div>
      </div>

      <h1 className="title">{t('report.title', locale, { property: property.name, period })}</h1>
      <p className="caption">{propertyTypeLabel(property, locale)} · {t('report.generated', locale, { date: new Date().toLocaleDateString(locale) })}</p>

      {scope === 'month' && month ? (
        <>
          <div className="card" style={{ marginTop: 'var(--s-4)' }}>
            <div className="totals" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0, fontSize: '1.125rem' }}>
              <div className="totals__row"><span>{t('money.in', locale)}</span><strong className="money money--in">{formatMoney(totalIn(lines), currency, locale)}</strong></div>
              <div className="totals__row"><span>{t('money.out', locale)}</span><strong className="money money--out">{formatMoney(totalOut(lines), currency, locale)}</strong></div>
              <div className="totals__row" style={{ fontSize: '1.375rem' }}><span>{t('money.left', locale)}</span><strong className="money">{formatMoney(net(lines), currency, locale)}</strong></div>
            </div>
            {month.reconcileInCents !== null || month.reconcileOutCents !== null ? (
              <p className="caption" style={{ marginTop: 'var(--s-3)' }}>
                {t('compare.paperSays', locale)}: {t('money.in', locale)} {month.reconcileInCents !== null ? formatMoney(month.reconcileInCents, currency, locale) : '—'} · {t('money.out', locale)} {month.reconcileOutCents !== null ? formatMoney(month.reconcileOutCents, currency, locale) : '—'}
              </p>
            ) : null}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'var(--s-4)', fontSize: '1rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-3)' }}>
                <th style={{ padding: '6px 0' }}>{t('pad.day', locale)}</th>
                <th>{t('pad.whatIsThis', locale)}</th>
                <th>{t('pad.note', locale)}</th>
                <th style={{ textAlign: 'right' }}>{t('pad.save', locale) === 'Save' ? 'Amount' : ''}</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((l) => (
                <tr key={l.id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 0' }}>{l.occurredOn ? formatOccurredOn(l.occurredOn, locale) : ''}</td>
                  <td>{getCategoryLabel(l.categoryId, categories)}</td>
                  <td className="caption">{l.note}</td>
                  <td className={`money money--${l.type}`} style={{ textAlign: 'right' }}>{l.type === 'out' ? '−' : '+'}{formatMoney(l.amountCents, currency, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {scope === 'year' && ys ? (
        <>
          <div className="card" style={{ marginTop: 'var(--s-4)' }}>
            <div className="totals" style={{ marginTop: 0, borderTop: 'none', paddingTop: 0, fontSize: '1.125rem' }}>
              <div className="totals__row"><span>{t('money.in', locale)}</span><strong className="money money--in">{formatMoney(ys.inCents, currency, locale)}</strong></div>
              <div className="totals__row"><span>{t('money.out', locale)}</span><strong className="money money--out">{formatMoney(ys.outCents, currency, locale)}</strong></div>
              <div className="totals__row" style={{ fontSize: '1.375rem' }}><span>{t('money.left', locale)}</span><strong className="money">{formatMoney(ys.netCents, currency, locale)}</strong></div>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 'var(--s-4)', fontSize: '1rem' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: 'var(--ink-3)' }}>
                <th style={{ padding: '6px 0' }}>{t('nav.months', locale)}</th>
                <th style={{ textAlign: 'right' }}>{t('money.in', locale)}</th>
                <th style={{ textAlign: 'right' }}>{t('money.out', locale)}</th>
                <th style={{ textAlign: 'right' }}>{t('money.left', locale)}</th>
              </tr>
            </thead>
            <tbody>
              {series.map((p) => (
                <tr key={p.yearMonth} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 0' }}>{formatYearMonthLabel(p.yearMonth, locale)}</td>
                  <td className="money money--in" style={{ textAlign: 'right' }}>{formatMoney(p.inCents, currency, locale)}</td>
                  <td className="money money--out" style={{ textAlign: 'right' }}>{formatMoney(p.outCents, currency, locale)}</td>
                  <td className="money" style={{ textAlign: 'right' }}>{formatMoney(p.netCents, currency, locale)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </ScreenShell>
  )
}
