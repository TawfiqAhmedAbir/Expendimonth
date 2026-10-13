import { useEffect, useState } from 'react'
import type { Property } from '../domain/types'
import { Chip } from '../design-kit/Primitives'
import { t } from '../i18n'
import { AmountKeypadSheet } from './AmountKeypad'

type Props = {
  open: boolean
  locale: string
  currencyCode: string
  properties: Property[]
  currentId: string
  onClose: () => void
  onMove: (toPropertyId: string, amountCents: number) => void
}

export function TransferSheet({ open, locale, currencyCode, properties, currentId, onClose, onMove }: Props) {
  const others = properties.filter((p) => p.id !== currentId)
  const otherKey = others.map((p) => p.id).join('|')
  const [toId, setToId] = useState(others[0]?.id ?? '')

  useEffect(() => {
    if (!open) return
    setToId((current) => (current && others.some((p) => p.id === current) ? current : others[0]?.id ?? ''))
    // otherKey is the property list; the array itself is a new reference each render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, otherKey])

  const target = others.find((p) => p.id === toId)
  const mismatch = Boolean(target && target.currencyCode !== currencyCode)

  return (
    <AmountKeypadSheet
      open={open && others.length > 0}
      title={t('transfer.title', locale)}
      locale={locale}
      currencyCode={currencyCode}
      disabled={mismatch || !target}
      saveLabel={t('transfer.action', locale)}
      onClose={onClose}
      onSave={(cents) => {
        if (!target || mismatch) return
        onMove(target.id, cents)
      }}
    >
      <div className="chips" style={{ marginBottom: 'var(--s-3)' }}>
        {others.map((p) => (
          <Chip key={p.id} active={p.id === toId} onClick={() => setToId(p.id)}>
            {p.name}
          </Chip>
        ))}
      </div>
      {mismatch ? <p className="caption" style={{ marginTop: 0 }}>{t('transfer.currency', locale)}</p> : null}
    </AmountKeypadSheet>
  )
}
