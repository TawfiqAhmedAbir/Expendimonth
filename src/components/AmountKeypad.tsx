import { Delete } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { evaluateAmountExpression, formatMoney } from '../domain/calc'
import { Button, Sheet } from '../design-kit/Primitives'
import { haptic } from '../design-kit/motion'
import { t } from '../i18n'

const KEYS = ['7', '8', '9', '4', '5', '6', '1', '2', '3'] as const

type KeypadProps = {
  open: boolean
  title: string
  locale: string
  currencyCode: string
  onClose: () => void
  onSave: (cents: number) => void
  saveLabel?: string
  disabled?: boolean
  children?: ReactNode
}

export function AmountKeypadSheet({ open, title, locale, currencyCode, onClose, onSave, saveLabel, disabled, children }: KeypadProps) {
  const [expr, setExpr] = useState('')

  useEffect(() => {
    if (open) setExpr('')
  }, [open])

  if (!open) return null

  const cents = evaluateAmountExpression(expr)
  const canSave = cents !== null && cents > 0 && !disabled

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

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      {children}
      <div className="pad__display">
        <div className="pad__expr">{expr.includes('+') ? expr.replaceAll('+', ' + ') : t('pad.chainHint', locale)}</div>
        <div className="pad__value money">{cents === null ? formatMoney(0, currencyCode, locale) : formatMoney(cents, currencyCode, locale)}</div>
      </div>
      <div className="pad__grid">
        {KEYS.map((k) => (
          <button key={k} type="button" className="pad__key" onClick={() => press(k)}>
            {k}
          </button>
        ))}
        <button type="button" className="pad__key pad__key--op" onClick={() => setExpr((prev) => (!prev || prev.endsWith('+') ? prev : prev + '+'))} aria-label="plus">
          +
        </button>
        <button type="button" className="pad__key" onClick={() => press('0')}>
          0
        </button>
        <button type="button" className="pad__key" onClick={() => press('.')}>
          .
        </button>
        <button type="button" className="pad__key pad__key--wide" onClick={() => setExpr((prev) => prev.slice(0, -1))} aria-label="backspace">
          <Delete size={22} />
        </button>
      </div>
      <Button
        variant="primary"
        block
        disabled={!canSave}
        onClick={() => {
          if (!canSave || cents === null) return
          haptic(12)
          onSave(cents)
        }}
      >
        {saveLabel ?? t('common.save', locale)}
      </Button>
    </Sheet>
  )
}
