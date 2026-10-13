import { useEffect, useState } from 'react'
import { centsToInput, parseMoneyToCents, type MonthStartItem } from '../domain/calc'
import { getCategoryLabel } from '../domain/categories'
import type { UserCategory } from '../domain/types'
import { Button, Chip, Sheet } from '../design-kit/Primitives'
import { t } from '../i18n'

type Row = { item: MonthStartItem; on: boolean; amount: string }

type Props = {
  open: boolean
  locale: string
  categories: UserCategory[]
  items: MonthStartItem[]
  onClose: () => void
  onConfirm: (items: MonthStartItem[]) => void
}

export function MonthStartSheet({ open, locale, categories, items, onClose, onConfirm }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const signature = items.map((item) => item.key).join('|')

  useEffect(() => {
    if (!open) return
    setRows(items.map((item) => ({ item, on: true, amount: centsToInput(item.amountCents) })))
    // signature is the item list; amounts stay local while the sheet is open
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, signature])

  if (!open) return null

  const selected = rows.flatMap((row) => {
    if (!row.on) return []
    const cents = parseMoneyToCents(row.amount)
    if (cents === null || cents <= 0) return []
    return [{ ...row.item, amountCents: cents }]
  })

  return (
    <Sheet open={open} onClose={onClose} title={t('start.title', locale)}>
      <p className="sub">{t('start.sub', locale)}</p>
      <div className="stack">
        {rows.map((row, index) => (
          <div key={row.item.key} className="stack" style={{ gap: 'var(--s-2)' }}>
            <Chip
              active={row.on}
              onClick={() => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, on: !r.on } : r)))}
            >
              {getCategoryLabel(row.item.categoryId, categories)} · {t(row.item.type === 'in' ? 'money.in' : 'money.out', locale)}
            </Chip>
            {row.on ? (
              <input
                className="input"
                inputMode="decimal"
                aria-label={getCategoryLabel(row.item.categoryId, categories)}
                value={row.amount}
                onChange={(e) => setRows((prev) => prev.map((r, i) => (i === index ? { ...r, amount: e.target.value } : r)))}
              />
            ) : null}
          </div>
        ))}
      </div>
      <div className="row" style={{ marginTop: 'var(--s-4)' }}>
        <Button className="grow" onClick={onClose}>{t('start.dismiss', locale)}</Button>
        <Button
          className="grow"
          variant="primary"
          disabled={selected.length === 0}
          onClick={() => onConfirm(selected)}
        >
          {t('start.add', locale, { n: String(selected.length) })}
        </Button>
      </div>
    </Sheet>
  )
}
