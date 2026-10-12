import { useEffect, useState } from 'react'
import { centsToInput, parseMoneyToCents } from '../domain/calc'
import type { LineItem, LineType, UserCategory } from '../domain/types'
import { t } from '../i18n'

type Props = {
  open: boolean
  type: LineType
  locale: string
  categories: UserCategory[]
  initial?: LineItem | null
  onClose: () => void
  onSave: (data: {
    type: LineType
    amountCents: number
    categoryId?: string
    newCategoryLabel?: string
    note: string
  }) => void
}

export function AddLineSheet({ open, type, locale, categories, initial, onClose, onSave }: Props) {
  const [amount, setAmount] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [note, setNote] = useState('')

  useEffect(() => {
    if (!open) return
    if (initial) {
      setAmount(centsToInput(initial.amountCents))
      setCategoryId(initial.categoryId)
      setCreatingNew(false)
      setNewLabel('')
      setNote(initial.note)
    } else {
      setAmount('')
      setCategoryId(categories[0]?.id ?? null)
      setCreatingNew(categories.length === 0)
      setNewLabel('')
      setNote('')
    }
  }, [open, initial, categories])

  if (!open) return null

  const title = type === 'in' ? t('addLine.titleIn', locale) : t('addLine.titleOut', locale)
  const mustCreateNew = categories.length === 0 || creatingNew

  function save() {
    const cents = parseMoneyToCents(amount)
    if (cents === null) return
    if (mustCreateNew) {
      const label = newLabel.trim()
      if (!label) return
      onSave({ type, amountCents: cents, newCategoryLabel: label, note: note.trim() })
    } else {
      if (!categoryId) return
      onSave({ type, amountCents: cents, categoryId, note: note.trim() })
    }
    onClose()
  }

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
          <span>{t('addLine.whatIsThis', locale)}</span>
          {categories.length > 0 && !initial ? (
            <div className="btn-row" style={{ marginTop: '0.5rem', marginBottom: '0.5rem' }}>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chip${!creatingNew && categoryId === c.id ? ' chip--active' : ''}`}
                  onClick={() => {
                    setCreatingNew(false)
                    setCategoryId(c.id)
                  }}
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                className={`chip${creatingNew ? ' chip--active' : ''}`}
                onClick={() => {
                  setCreatingNew(true)
                  setCategoryId(null)
                }}
              >
                {t('addLine.newCategory', locale)}
              </button>
            </div>
          ) : null}
          {mustCreateNew ? (
            <input
              id="newCat"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t('addLine.categoryPlaceholder', locale)}
            />
          ) : null}
          {initial ? (
            <p style={{ color: 'var(--color-muted)', margin: 0 }}>
              {categories.find((c) => c.id === categoryId)?.label ?? t('addLine.category', locale)}
            </p>
          ) : null}
        </div>
        <div className="field">
          <label htmlFor="note">{t('addLine.note', locale)}</label>
          <input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button type="button" className="btn btn--primary btn--block" onClick={save}>
          {t('addLine.save', locale)}
        </button>
      </div>
    </div>
  )
}
