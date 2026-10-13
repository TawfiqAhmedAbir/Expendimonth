import { formatMoney } from '../domain/calc'
import { getCategoryLabel } from '../domain/categories'
import type { UserCategory } from '../domain/types'

type Slice = { categoryId: string; cents: number; share: number }

type Props = {
  slices: Slice[]
  categories: UserCategory[]
  currencyCode: string
  locale: string
  tone: 'in' | 'out'
  onSelect?: (categoryId: string) => void
}

export function CategoryBreakdownBars({ slices, categories, currencyCode, locale, tone, onSelect }: Props) {
  const max = slices[0]?.cents ?? 1
  return (
    <div className="cat-bars">
      {slices.map((b) => {
        const pct = max > 0 ? (b.cents / max) * 100 : 0
        const label = getCategoryLabel(b.categoryId, categories)
        const body = (
          <>
            <div className="row row--between cat-bars__head">
              <span>{label}</span>
              <span className="money">
                {formatMoney(b.cents, currencyCode, locale)}{' '}
                <span className="caption">{Math.round(b.share * 100)}%</span>
              </span>
            </div>
            <div className="cat-bars__track">
              <div className={`cat-bars__fill cat-bars__fill--${tone}`} style={{ width: `${pct}%` }} />
            </div>
          </>
        )
        if (onSelect) {
          return (
            <button key={b.categoryId} type="button" className="cat-bars__row" onClick={() => onSelect(b.categoryId)}>
              {body}
            </button>
          )
        }
        return (
          <div key={b.categoryId} className="cat-bars__row">
            {body}
          </div>
        )
      })}
    </div>
  )
}
