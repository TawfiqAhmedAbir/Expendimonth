import { formatMoney } from '../domain/calc'
import { getCategoryLabel } from '../domain/categories'
import type { LineItem, UserCategory } from '../domain/types'
import { t } from '../i18n'

type Props = {
  line: LineItem
  categories: UserCategory[]
  currencyCode: string
  locale: string
  onEdit: () => void
  onDelete: () => void
  readOnly?: boolean
}

export function LineItemRow({ line, categories, currencyCode, locale, onEdit, onDelete, readOnly }: Props) {
  return (
    <div className="line-row">
      <div className="line-row__meta">
        <div className="line-row__cat">{getCategoryLabel(line.categoryId, categories)}</div>
        {line.note ? <div className="line-row__note">{line.note}</div> : null}
      </div>
      <div
        className={`line-row__amount line-row__amount--${line.type === 'in' ? 'in' : 'out'}`}
      >
        {line.type === 'out' ? '−' : '+'}
        {formatMoney(line.amountCents, currencyCode, locale)}
      </div>
      {!readOnly ? (
        <div className="btn-row" style={{ flexDirection: 'column' }}>
          <button type="button" className="btn btn--ghost" style={{ minHeight: '2.5rem', padding: '0 0.75rem' }} onClick={onEdit}>
            {t('line.edit', locale)}
          </button>
          <button type="button" className="btn btn--ghost" style={{ minHeight: '2.5rem', padding: '0 0.75rem' }} onClick={onDelete}>
            {t('line.delete', locale)}
          </button>
        </div>
      ) : null}
    </div>
  )
}
