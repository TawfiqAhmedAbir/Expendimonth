import { Check } from 'lucide-react'
import { useEffect, useState } from 'react'
import { centsToInput, formatYearMonthLabel, parseMoneyToCents } from '../domain/calc'
import { getCategoryLabel } from '../domain/categories'
import type { LineItem, UserCategory } from '../domain/types'
import { Button, Sheet } from '../design-kit/Primitives'
import { t } from '../i18n'

type Row = { line: LineItem; on: boolean; amount: string }

type Props = {
  open: boolean
  previousYearMonth: string
  previousLines: LineItem[]
  categories: UserCategory[]
  locale: string
  onClose: () => void
  onAdd: (items: Omit<LineItem, 'id' | 'monthId' | 'createdAt'>[]) => void
}

export function LastMonthChecklist({ open, previousYearMonth, previousLines, categories, locale, onClose, onAdd }: Props) {
  const [rows, setRows] = useState<Row[]>([])

  // Reset rows only when opening; previousLines may be re-created on refresh.
  useEffect(() => {
    if (open) setRows(previousLines.map((line) => ({ line, on: true, amount: centsToInput(line.amountCents) })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const selected = rows.filter((r) => r.on && parseMoneyToCents(r.amount) !== null)

  return (
    <Sheet open={open} onClose={onClose} title={t('checklist.title', locale)}>
      <p className="sub">
        {formatYearMonthLabel(previousYearMonth, locale)} · {t('checklist.sub', locale)}
      </p>
      {rows.length === 0 ? (
        <p className="muted">{t('checklist.empty', locale)}</p>
      ) : (
        rows.map((r, i) => (
          <div key={r.line.id} className="check">
            <button
              type="button"
              className={`check__box${r.on ? ' check__box--on' : ''}`}
              aria-pressed={r.on}
              onClick={() => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, on: !x.on } : x)))}
            >
              {r.on ? <Check size={16} /> : null}
            </button>
            <div className="grow">
              <div className="line__title">{getCategoryLabel(r.line.categoryId, categories)}</div>
              <div className={`caption money--${r.line.type}`}>{r.line.type === 'in' ? t('money.in', locale) : t('money.out', locale)}</div>
            </div>
            <input
              className="input check__amount"
              inputMode="decimal"
              value={r.amount}
              disabled={!r.on}
              onChange={(e) => setRows((prev) => prev.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
            />
          </div>
        ))
      )}
      <Button
        variant="primary"
        block
        disabled={selected.length === 0}
        style={{ marginTop: 'var(--s-4)' }}
        onClick={() => {
          onAdd(
            selected.map((r) => ({
              type: r.line.type,
              amountCents: parseMoneyToCents(r.amount) ?? 0,
              categoryId: r.line.categoryId,
              note: r.line.note,
              occurredOn: r.line.occurredOn,
            })),
          )
          onClose()
        }}
      >
        {t('checklist.add', locale, { n: String(selected.length) })}
      </Button>
    </Sheet>
  )
}
