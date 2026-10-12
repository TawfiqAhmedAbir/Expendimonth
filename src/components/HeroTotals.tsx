import { formatMoney, net, totalIn, totalOut } from '../domain/calc'
import type { LineItem } from '../domain/types'
import { useCountUp } from '../design-kit/motion'
import { t } from '../i18n'

type Props = {
  lines: LineItem[]
  currencyCode: string
  locale: string
  /** Show the big "what's left" number above in/out. Default true. */
  showNet?: boolean
}

function Stat({ label, cents, tone, currency, locale }: { label: string; cents: number; tone: 'in' | 'out'; currency: string; locale: string }) {
  const v = useCountUp(cents)
  return (
    <div className="grow" style={{ minWidth: 0 }}>
      <div className="caption" style={{ marginBottom: 2 }}>{label}</div>
      <div className={`money money--${tone}`} style={{ fontSize: '1.25rem', fontWeight: 800, lineHeight: 1.2, overflowWrap: 'anywhere' }}>
        {formatMoney(v, currency, locale)}
      </div>
    </div>
  )
}

export function HeroTotals({ lines, currencyCode, locale, showNet = true }: Props) {
  const netValue = useCountUp(net(lines))
  return (
    <div className="stack" style={{ gap: 'var(--s-3)' }}>
      {showNet ? (
        <div>
          <div className="caption">{t('money.left', locale)}</div>
          <div className="money money--hero" style={{ overflowWrap: 'anywhere' }}>{formatMoney(netValue, currencyCode, locale)}</div>
        </div>
      ) : null}
      <div className="row" style={{ alignItems: 'stretch' }}>
        <Stat label={t('money.in', locale)} cents={totalIn(lines)} tone="in" currency={currencyCode} locale={locale} />
        <div style={{ width: 1, background: 'var(--border)', flex: 'none' }} />
        <Stat label={t('money.out', locale)} cents={totalOut(lines)} tone="out" currency={currencyCode} locale={locale} />
      </div>
    </div>
  )
}
