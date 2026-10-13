import { formatMoney } from '../domain/calc'
import { t } from '../i18n'

type Props = {
  inCents: number
  outCents: number
  /** Width of the bar represents this much money in (defaults to inCents). */
  scaleInCents?: number
  label?: string
  locale: string
  currencyCode: string
  /** Shown under the bar on the right. */
  hint?: string
  compact?: boolean
}

export function MoneyFlowBar({ inCents, outCents, scaleInCents, label, locale, currencyCode, hint, compact }: Props) {
  const netCents = inCents - outCents
  const scale = Math.max(scaleInCents ?? inCents, inCents, 1)
  const outPct = inCents > 0 ? Math.min(100, (outCents / inCents) * 100) : outCents > 0 ? 100 : 0
  const leftPct = inCents > 0 ? Math.max(0, 100 - outPct) : 0
  const barPct = Math.min(100, (inCents / scale) * 100)

  return (
    <div className={`flow${compact ? ' flow--compact' : ''}`}>
      {label || hint ? (
        <div className="row row--between flow__head">
          {label ? <span className="caption">{label}</span> : <span />}
          {hint ? <span className="caption">{hint}</span> : null}
        </div>
      ) : null}
      <div className="flow__scale" aria-hidden>
        <div className="flow__track" style={{ width: `${barPct}%` }}>
          <div className="flow__out" style={{ width: `${outPct}%` }} />
          <div className="flow__left" style={{ width: `${leftPct}%` }} />
        </div>
      </div>
      <div className="row row--between flow__legend">
        <span className="caption">
          <span className="flow__swatch flow__swatch--in" aria-hidden /> {t('money.in', locale)}{' '}
          <span className="money money--in">{formatMoney(inCents, currencyCode, locale)}</span>
        </span>
        <span className="caption">
          <span className="flow__swatch flow__swatch--out" aria-hidden /> {t('money.out', locale)}{' '}
          <span className="money money--out">{formatMoney(outCents, currencyCode, locale)}</span>
        </span>
      </div>
      {!compact ? (
        <p className={`flow__net money${netCents < 0 ? ' money--out' : ''}`}>
          {t('money.left', locale)}: {formatMoney(netCents, currencyCode, locale)}
        </p>
      ) : null}
    </div>
  )
}
