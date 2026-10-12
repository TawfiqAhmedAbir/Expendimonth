import { useEffect, useState } from 'react'
import { DEFAULT_CATEGORIES } from '../domain/categories'
import { centsToInput, parseMoneyToCents } from '../domain/calc'
import type { LineItem, LineType } from '../domain/types'
import { t } from '../i18n'

type Props = {
  open: boolean
  type: LineType
  locale: string
  initial?: LineItem | null
  onClose: () => void
  onSave: (data: {
    type: LineType
    amountCents: number
    categoryId: string
    note: string
  }) => void
}

export function AddLineSheet({ open, type, locale, initial, onClose, onSave }: Props) {
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState('other')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (initial) {
      setAmount(centsToInput(initial.amountCents))
      setCategoryId(initial.categoryId)
      setNote(initial.note)
    } else {
      setAmount('')
      setCategoryId(type === 'in' ? 'rent' : 'electricity')
      setNote('')
    }
  }, [open, initial, type])

  if (!open) return null

  const title = type === 'in' ? t('addLine.titleIn', locale) : t('addLine.titleOut', locale)

  const chips = DEFAULT_CATEGORIES.filter(
    (c) => c.defaultType === 'both' || c.defaultType === type,
  )

  return (
    <div className="sheet-backdrop" role="presentation" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <h2 className="sheet__title">{title}</h2>
        <div className="field">
          <label htmlFor="amount">{t('addLine.amount', locale)}</label>
          <input
            id="amount"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="field">
          <span>{t('addLine.category', locale)}</span>
          <div className="btn-row" style={{ marginTop: '0.5rem' }}>
            {chips.map((c) => (
              <button
                key={c.id}
                type="button"
                className={`chip${categoryId === c.id ? ' chip--active' : ''}`}
                onClick={() => setCategoryId(c.id)}
              >
                {t(c.labelKey, locale)}
              </button>
            ))}
          </div>
        </div>
        <div className="field">
          <label htmlFor="note">{t('addLine.note', locale)}</label>
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button
          type="button"
          className="btn btn--primary btn--block"
          onClick={() => {
            const cents = parseMoneyToCents(amount)
            if (cents === null) return
            onSave({ type, amountCents: cents, categoryId, note: note.trim() })
            onClose()
          }}
        >
          {t('addLine.save', locale)}
        </button>
      </div>
    </div>
  )
}
