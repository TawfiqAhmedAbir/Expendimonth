import { CategoryIcon } from './CategoryIcon'
import { defaultOccurredOn, standingDirection } from '../domain/calc'
import type { UserCategory } from '../domain/types'
import { Chip } from '../design-kit/Primitives'
import { t } from '../i18n'

type Props = {
  categories: UserCategory[]
  locale: string
  onAdd: (cat: UserCategory, amountCents: number) => void
}

export function StandingItemsRow({ categories, locale, onAdd }: Props) {
  const standing = categories.filter((c) => c.standing)
  if (standing.length === 0) return null

  return (
    <div className="field" style={{ marginBottom: 'var(--s-4)' }}>
      <span className="field__label">{t('standing.title', locale)}</span>
      <div className="chips">
        {standing.map((cat) => {
          const amount = cat.standingAmountCents ?? cat.lastAmountCents
          return (
            <Chip
              key={cat.id}
              onClick={() => {
                if (amount === null || amount <= 0) return
                onAdd(cat, amount)
              }}
              disabled={amount === null || amount <= 0}
            >
              <CategoryIcon name={cat.icon} size={18} /> {cat.label}
            </Chip>
          )
        })}
      </div>
      <p className="caption">{t('standing.hint', locale)}</p>
    </div>
  )
}

export function standingLinePayload(cat: UserCategory, amountCents: number, yearMonth: string) {
  return {
    type: standingDirection(cat),
    amountCents,
    categoryId: cat.id,
    note: '',
    occurredOn: defaultOccurredOn(yearMonth),
  }
}
