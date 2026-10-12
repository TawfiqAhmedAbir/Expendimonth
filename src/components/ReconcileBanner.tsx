import { formatMoney, totalIn, totalOut } from '../domain/calc'
import type { LineItem, MonthRecord } from '../domain/types'
import { t } from '../i18n'

type Props = {
  month: MonthRecord
  lines: LineItem[]
  currencyCode: string
  locale: string
  onChange: (inCents: number | null, outCents: number | null) => void
}

export function ReconcileBanner({ month, lines, currencyCode, locale, onChange }: Props) {
  const inApp = totalIn(lines)
  const outApp = totalOut(lines)
  const { reconcileInCents, reconcileOutCents } = month

  let banner: { kind: 'ok' | 'warn'; text: string } | null = null

  if (reconcileInCents !== null && reconcileInCents !== inApp) {
    banner = {
      kind: 'warn',
      text: t('reconcile.offIn', locale, {
        amount: formatMoney(Math.abs(reconcileInCents - inApp), currencyCode, locale),
      }),
    }
  } else if (reconcileOutCents !== null && reconcileOutCents !== outApp) {
    banner = {
      kind: 'warn',
      text: t('reconcile.offOut', locale, {
        amount: formatMoney(Math.abs(reconcileOutCents - outApp), currencyCode, locale),
      }),
    }
  } else if (reconcileInCents !== null || reconcileOutCents !== null) {
    banner = { kind: 'ok', text: t('reconcile.match', locale) }
  }

  return (
    <div className="card card--flat">
      <h3 className="section-head" style={{ marginTop: 0 }}>
        {t('month.checkPaper', locale)}
      </h3>
      <div className="field">
        <label htmlFor="exp-in">{t('month.expectedIn', locale)}</label>
        <input
          id="exp-in"
          inputMode="decimal"
          placeholder="—"
          defaultValue={
            reconcileInCents !== null ? (reconcileInCents / 100).toFixed(2) : ''
          }
          onBlur={(e) => {
            const raw = e.target.value.trim()
            if (!raw) {
              onChange(null, reconcileOutCents)
              return
            }
            const v = Number.parseFloat(raw.replace(',', '.'))
            if (!Number.isFinite(v)) return
            onChange(Math.round(v * 100), reconcileOutCents)
          }}
        />
      </div>
      <div className="field">
        <label htmlFor="exp-out">{t('month.expectedOut', locale)}</label>
        <input
          id="exp-out"
          inputMode="decimal"
          placeholder="—"
          defaultValue={
            reconcileOutCents !== null ? (reconcileOutCents / 100).toFixed(2) : ''
          }
          onBlur={(e) => {
            const raw = e.target.value.trim()
            if (!raw) {
              onChange(reconcileInCents, null)
              return
            }
            const v = Number.parseFloat(raw.replace(',', '.'))
            if (!Number.isFinite(v)) return
            onChange(reconcileInCents, Math.round(v * 100))
          }}
        />
      </div>
      {banner ? (
        <div className={`banner banner--${banner.kind === 'ok' ? 'ok' : 'warn'}`}>{banner.text}</div>
      ) : null}
    </div>
  )
}
