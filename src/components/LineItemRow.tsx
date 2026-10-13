import { ArrowLeftRight, ChevronRight, Scale } from 'lucide-react'
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
  counterpartyName?: string
  onEdit?: () => void
  readOnly?: boolean
  highlight?: boolean
}

export function LineItemRow({ line, categories, currencyCode, locale, counterpartyName, onEdit, readOnly, highlight }: Props) {
  const cat = categories.find((c) => c.id === line.categoryId)
  const name = counterpartyName || t('switcher.title', locale)
  let label = getCategoryLabel(line.categoryId, categories)
  let amount = `${line.type === 'out' ? '−' : '+'}${formatMoney(Math.abs(line.amountCents), currencyCode, locale)}`
  let tone = line.type === 'out' ? 'out' : 'in'
  let icon = <CategoryIcon name={cat?.icon} />

  if (line.type === 'adjust') {
    label = t('cash.correction', locale)
    amount = formatMoney(line.amountCents, currencyCode, locale)
    tone = line.amountCents < 0 ? 'out' : 'in'
    icon = <Scale size={20} />
  } else if (line.type === 'transfer') {
    label = t(line.transferDirection === 'in' ? 'transfer.fromName' : 'transfer.toName', locale, { name })
    amount = `${line.transferDirection === 'out' ? '−' : '+'}${formatMoney(line.amountCents, currencyCode, locale)}`
    tone = line.transferDirection === 'out' ? 'out' : 'in'
    icon = <ArrowLeftRight size={20} />
  }

  const canEdit = !readOnly && !!onEdit
  const body = (
    <>
      <div className="line__icon">{icon}</div>
      <div className="grow">
        <div className="line__title">{label}</div>
        <div className="line__note">
          {line.occurredOn ? formatOccurredOn(line.occurredOn, locale) : ''}
          {line.note ? `${line.occurredOn ? ' · ' : ''}${line.note}` : ''}
        </div>
      </div>
      <div className={`line__amount money money--${tone}`}>{amount}</div>
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
