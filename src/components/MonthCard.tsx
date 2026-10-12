import { Link } from 'react-router-dom'
import { formatMoney, formatYearMonthLabel, net, totalIn, totalOut } from '../domain/calc'
import type { LineItem, MonthRecord } from '../domain/types'
import { t } from '../i18n'

type Props = {
  month: MonthRecord
  lines: LineItem[]
  currencyCode: string
  locale: string
}

function statusBadge(status: MonthRecord['status'], locale: string) {
  const key =
    status === 'done' ? 'status.done' : status === 'open' ? 'status.open' : 'status.empty'
  const cls =
    status === 'done' ? 'badge--done' : status === 'open' ? 'badge--open' : 'badge--empty'
  return <span className={`badge ${cls}`}>{t(key, locale)}</span>
}

export function MonthCard({ month, lines, currencyCode, locale }: Props) {
  const inC = totalIn(lines)
  const outC = totalOut(lines)
  const netC = net(lines)
  const total = inC + outC || 1
  const inPct = (inC / total) * 100
  const outPct = (outC / total) * 100

  return (
    <Link to={`/month/${month.yearMonth}`} className="card month-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>{formatYearMonthLabel(month.yearMonth, locale)}</strong>
        {statusBadge(month.status, locale)}
      </div>
      <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <span style={{ color: 'var(--color-in)' }}>{formatMoney(inC, currencyCode, locale)}</span>
        <span style={{ color: 'var(--color-out)' }}>{formatMoney(outC, currencyCode, locale)}</span>
        <strong>{formatMoney(netC, currencyCode, locale)}</strong>
      </div>
      <div className="month-card__bar" aria-hidden>
        <div className="month-card__bar-in" style={{ width: `${inPct}%` }} />
        <div className="month-card__bar-out" style={{ width: `${outPct}%` }} />
      </div>
    </Link>
  )
}
