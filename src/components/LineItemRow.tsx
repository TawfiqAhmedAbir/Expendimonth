import { ChevronRight } from 'lucide-react'
import { formatMoney, formatOccurredOn } from '../domain/calc'
import { getCategoryLabel } from '../domain/categories'
import type { LineItem, UserCategory } from '../domain/types'
import { t } from '../i18n'
import { CategoryIcon } from './CategoryIcon'

type Props = {
  line: LineItem
  categories: UserCategory[]
  currencyCode: string
  locale: string
  /** Tapping the row opens the editor (which also offers Delete). */
  onEdit?: () => void
  readOnly?: boolean
  highlight?: boolean
}

export function LineItemRow({ line, categories, currencyCode, locale, onEdit, readOnly, highlight }: Props) {
  const cat = categories.find((c) => c.id === line.categoryId)
  const label = getCategoryLabel(line.categoryId, categories)
  const amount = `${line.type === 'out' ? '−' : '+'}${formatMoney(line.amountCents, currencyCode, locale)}`
  const canEdit = !readOnly && !!onEdit

  const body = (
    <>
      <div className="line__icon">
        <CategoryIcon name={cat?.icon} />
      </div>
      <div className="grow">
        <div className="line__title">{label}</div>
        <div className="line__note">{line.occurredOn ? formatOccurredOn(line.occurredOn, locale) : ''}{line.note ? `${line.occurredOn ? ' · ' : ''}${line.note}` : ''}</div>
      </div>
      <div className={`line__amount money money--${line.type}`}>{amount}</div>
      {canEdit ? <ChevronRight size={18} className="line__chev" aria-hidden /> : null}
    </>
  )

  return (
    <div className={`line${readOnly ? ' line--muted' : ''}${highlight ? ' line--highlight' : ''}`}>
      {canEdit ? (
        <button type="button" className="line__main" onClick={onEdit} aria-label={`${t('line.edit', locale)}: ${label}, ${amount}`}>
          {body}
        </button>
      ) : (
        <div className="line__main">{body}</div>
      )}
    </div>
  )
}
