import { Delete, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { centsToInput, clampDateToMonth, defaultOccurredOn, evaluateAmountExpression, formatMoney, monthDateBounds } from '../domain/calc'
import type { LineItem, LineType, UserCategory } from '../domain/types'
import { Button, Chip, Sheet } from '../design-kit/Primitives'
import { haptic } from '../design-kit/motion'
import { t } from '../i18n'
import { CategoryIcon } from './CategoryIcon'

export type AmountPadResult = {
  type: LineType
  amountCents: number
  categoryId?: string
  newCategoryLabel?: string
  note: string
  occurredOn: string
  moveToYearMonth?: string
}

type Props = {
  open: boolean
  type: LineType
  currencyCode: string
  locale: string
  categories: UserCategory[]
  yearMonth: string
  isMonthClosed?: (yearMonth: string) => boolean
  initial?: LineItem | null
  onClose: () => void
  onSave: (data: AmountPadResult) => void
  onLongPressCategory?: (cat: UserCategory) => void
  /** Shown only when editing an existing line. */
  onDelete?: () => void
}

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '0', '.'] as const

export function AmountPadSheet({ open, type, currencyCode, locale, categories, yearMonth, isMonthClosed, initial, onClose, onSave, onLongPressCategory, onDelete }: Props) {
  const [expr, setExpr] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [creatingNew, setCreatingNew] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [note, setNote] = useState('')
  const [occurredOn, setOccurredOn] = useState('')
  const [moveTo, setMoveTo] = useState(yearMonth)

  useEffect(() => {
    if (!open) return
    const day = initial?.occurredOn ? clampDateToMonth(initial.occurredOn, yearMonth) : defaultOccurredOn(yearMonth)
    setOccurredOn(day)
    setMoveTo(yearMonth)
    if (initial) {
      setExpr(centsToInput(initial.amountCents))
      setCategoryId(initial.categoryId)
      setCreatingNew(false)
      setNewLabel('')
      setNote(initial.note)
    } else {
      setExpr('')
      setCategoryId(null)
      setCreatingNew(categories.length === 0)
      setNewLabel('')
      setNote('')
    }
  }, [open, initial, categories.length, yearMonth])

  if (!open) return null

  const cents = evaluateAmountExpression(expr)
  const hasChain = expr.includes('+')
  const title = initial ? t('pad.editTitle', locale) : type === 'in' ? t('pad.titleIn', locale) : t('pad.titleOut', locale)
  const needsNew = creatingNew || categories.length === 0
  const activeYm = initial ? moveTo || yearMonth : yearMonth
  const bounds = monthDateBounds(activeYm)
  const targetClosed = Boolean(initial && activeYm !== yearMonth && isMonthClosed?.(activeYm))
  const canSave = cents !== null && cents > 0 && !targetClosed && (needsNew ? newLabel.trim().length > 0 : Boolean(categoryId))

  function press(k: string) {
    haptic(6)
    setExpr((prev) => {
      const parts = prev.split('+')
      const cur = parts[parts.length - 1] ?? ''
      if (k === '.' && cur.includes('.')) return prev
      if (k === '.' && cur === '') return prev + '0.'
      if (cur.includes('.') && cur.split('.')[1]!.length >= 2) return prev
      if (cur.replace('.', '').length >= 9) return prev
      return prev + k
    })
  }

  function plus() {
    haptic(6)
    setExpr((prev) => {
      if (!prev || prev.endsWith('+')) return prev
      return prev + '+'
    })
  }

  function back() {
    haptic(6)
    setExpr((prev) => prev.slice(0, -1))
  }

  function pickCategory(c: UserCategory) {
    setCreatingNew(false)
    setCategoryId(c.id)
    if (!expr && c.lastAmountCents) setExpr(centsToInput(c.lastAmountCents))
  }

  function save() {
    if (!canSave || cents === null) return
    haptic(12)
    const day = clampDateToMonth(occurredOn || bounds.min, activeYm)
    const base = { type, amountCents: cents, note: note.trim(), occurredOn: day, moveToYearMonth: initial && activeYm !== yearMonth ? activeYm : undefined }
    onSave(needsNew ? { ...base, newCategoryLabel: newLabel.trim() } : { ...base, categoryId: categoryId! })
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <div className="pad__display">
        <div className="pad__expr">{hasChain ? expr.replaceAll('+', ' + ') : t('pad.chainHint', locale)}</div>
        <div className={`pad__value money money--${type}`}>
          {cents === null ? formatMoney(0, currencyCode, locale) : formatMoney(cents, currencyCode, locale)}
        </div>
      </div>

      <div className="pad__grid">
        {KEYS.slice(0, 9).map((k) => (
          <button key={k} type="button" className="pad__key" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button type="button" className="pad__key pad__key--op" onClick={plus} aria-label="plus">
          +
        </button>
        <button type="button" className="pad__key" onClick={() => press('0')}>
          0
        </button>
        <button type="button" className="pad__key" onClick={() => press('.')}>
          .
        </button>
        <button type="button" className="pad__key pad__key--wide" onClick={back} aria-label="backspace">
          <Delete size={22} />
        </button>
      </div>

      <div className="field">
        <span className="field__label">{t('pad.whatIsThis', locale)}</span>
        {!initial ? (
          <div className="chips" style={{ marginBottom: 'var(--s-2)' }}>
            {categories.map((c) => (
              <Chip
                key={c.id}
                active={!creatingNew && categoryId === c.id}
                onClick={() => pickCategory(c)}
                onLongPress={onLongPressCategory ? () => onLongPressCategory(c) : undefined}
                meta={c.lastAmountCents ? t('pad.last', locale, { amount: formatMoney(c.lastAmountCents, currencyCode, locale) }) : undefined}
              >
                <span className="row" style={{ gap: 6 }}>
                  <CategoryIcon name={c.icon} size={16} />
                  {c.label}
                </span>
              </Chip>
            ))}
            {categories.length > 0 ? (
              <Chip
                active={creatingNew}
                onClick={() => {
                  setCreatingNew(true)
                  setCategoryId(null)
                }}
              >
                {t('pad.newName', locale)}
              </Chip>
            ) : null}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            {categories.find((c) => c.id === categoryId)?.label ?? ''}
          </p>
        )}
        {needsNew && !initial ? (
          <input
            className="input"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder={t('pad.namePlaceholder', locale)}
            autoFocus={categories.length === 0}
          />
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="line-day">{t('pad.day', locale)}</label>
        <input
          id="line-day"
          className="input"
          type="date"
          min={bounds.min}
          max={bounds.max}
          value={occurredOn}
          onChange={(e) => setOccurredOn(e.target.value)}
        />
      </div>

      {initial ? (
        <div className="field">
          <label htmlFor="line-move">{t('line.move', locale)}</label>
          <input
            id="line-move"
            className="input"
            type="month"
            value={moveTo}
            onChange={(e) => {
              const ym = e.target.value
              if (!/^\d{4}-\d{2}$/.test(ym)) return
              setMoveTo(ym)
              setOccurredOn((d) => clampDateToMonth(d || `${ym}-01`, ym))
            }}
          />
          {targetClosed ? <p className="caption" style={{ color: 'var(--out)', margin: 'var(--s-2) 0 0' }}>{t('line.moveClosed', locale)}</p> : null}
        </div>
      ) : null}

      <div className="field">
        <label htmlFor="note">{t('pad.note', locale)}</label>
        <input id="note" className="input" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>

      <Button variant={type === 'in' ? 'in' : 'out'} block disabled={!canSave} onClick={save}>
        {t('pad.save', locale)}
      </Button>
      {initial && onDelete ? (
        <Button variant="ghost" block onClick={onDelete} style={{ marginTop: 'var(--s-2)', color: 'var(--out)' }}>
          <Trash2 size={18} /> {t('line.delete', locale)}
        </Button>
      ) : null}
    </Sheet>
  )
}
