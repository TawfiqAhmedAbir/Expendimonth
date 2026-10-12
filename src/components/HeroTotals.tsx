import { formatMoney, net, totalIn, totalOut } from '../domain/calc'
import type { LineItem } from '../domain/types'
import { t } from '../i18n'

type Props = {
  lines: LineItem[]
  currencyCode: string
  locale: string
}

export function HeroTotals({ lines, currencyCode, locale }: Props) {
  const inCents = totalIn(lines)
  const outCents = totalOut(lines)
  const netCents = net(lines)

  return (
    <div className="hero-grid">
      <div className="hero-stat hero-stat--in">
        <span className="hero-stat__label">{t('money.in', locale)}</span>
        <span className="hero-stat__value">{formatMoney(inCents, currencyCode, locale)}</span>
      </div>
      <div className="hero-stat hero-stat--out">
        <span className="hero-stat__label">{t('money.out', locale)}</span>
        <span className="hero-stat__value">{formatMoney(outCents, currencyCode, locale)}</span>
      </div>
      <div className="hero-stat hero-stat--net">
        <span className="hero-stat__label">{t('money.left', locale)}</span>
        <span className="hero-stat__value">{formatMoney(netCents, currencyCode, locale)}</span>
      </div>
    </div>
  )
}
