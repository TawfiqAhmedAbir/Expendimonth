import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { formatMoney, formatYearMonthLabel, net, parseMoneyToCents, totalIn, totalOut } from '../domain/calc'
import type { LineItem, MonthRecord } from '../domain/types'
import { Button, Field, Sheet, Steps } from '../design-kit/Primitives'
import { haptic } from '../design-kit/motion'
import { t } from '../i18n'

type Props = {
  open: boolean
  month: MonthRecord
  lines: LineItem[]
  currencyCode: string
  locale: string
  onClose: () => void
  onSaveReconcile: (inCents: number | null, outCents: number | null) => Promise<void>
  onConfirm: () => Promise<void>
}

export function CloseMonthFlow({ open, month, lines, currencyCode, locale, onClose, onSaveReconcile, onConfirm }: Props) {
  const [step, setStep] = useState(0)
  const [paperIn, setPaperIn] = useState('')
  const [paperOut, setPaperOut] = useState('')
  const [celebrate, setCelebrate] = useState(false)

  // Reset only when the sheet opens; `month` is replaced on every refresh and must not reset the step.
  useEffect(() => {
    if (!open) return
    setStep(0)
    setPaperIn(month.reconcileInCents !== null ? (month.reconcileInCents / 100).toFixed(2) : '')
    setPaperOut(month.reconcileOutCents !== null ? (month.reconcileOutCents / 100).toFixed(2) : '')
    setCelebrate(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const inC = totalIn(lines)
  const outC = totalOut(lines)
  const pIn = paperIn.trim() ? parseMoneyToCents(paperIn) : null
  const pOut = paperOut.trim() ? parseMoneyToCents(paperOut) : null
  const mismatchIn = pIn !== null && pIn !== inC
  const mismatchOut = pOut !== null && pOut !== outC

  async function nextFromPaper() {
    await onSaveReconcile(pIn, pOut)
    setStep(2)
  }

  return (
    <Sheet open={open} onClose={onClose} title={t('close.title', locale, { month: formatYearMonthLabel(month.yearMonth, locale) })}>
      <Steps count={3} current={step} />
      <p className="eyebrow">{[t('close.step1', locale), t('close.step2', locale), t('close.step3', locale)][step]}</p>

      {step === 0 ? (
        <>
          <p className="sub">{t('close.reviewBody', locale)}</p>
          <div className="totals" style={{ borderTop: 'none', paddingTop: 0 }}>
            <div className="totals__row"><span>{t('running.totalIn', locale)}</span><strong className="money money--in">{formatMoney(inC, currencyCode, locale)}</strong></div>
            <div className="totals__row"><span>{t('running.totalOut', locale)}</span><strong className="money money--out">{formatMoney(outC, currencyCode, locale)}</strong></div>
            <div className="totals__row" style={{ fontSize: '1.25rem' }}><span>{t('running.net', locale)}</span><strong className="money">{formatMoney(net(lines), currencyCode, locale)}</strong></div>
          </div>
          <Button variant="primary" block style={{ marginTop: 'var(--s-5)' }} onClick={() => setStep(1)}>
            {t('common.continue', locale)}
          </Button>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <Field label={t('close.paperIn', locale)} htmlFor="pin">
            <input id="pin" className="input" inputMode="decimal" value={paperIn} onChange={(e) => setPaperIn(e.target.value)} placeholder={formatMoney(inC, currencyCode, locale)} />
          </Field>
          <Field label={t('close.paperOut', locale)} htmlFor="pout">
            <input id="pout" className="input" inputMode="decimal" value={paperOut} onChange={(e) => setPaperOut(e.target.value)} placeholder={formatMoney(outC, currencyCode, locale)} />
          </Field>
          {mismatchIn ? <div className="insight insight--warn" style={{ marginBottom: 'var(--s-3)' }}>{t('reconcile.offIn', locale, { amount: formatMoney(Math.abs((pIn ?? 0) - inC), currencyCode, locale) })}</div> : null}
          {mismatchOut ? <div className="insight insight--warn" style={{ marginBottom: 'var(--s-3)' }}>{t('reconcile.offOut', locale, { amount: formatMoney(Math.abs((pOut ?? 0) - outC), currencyCode, locale) })}</div> : null}
          {(pIn !== null || pOut !== null) && !mismatchIn && !mismatchOut ? <div className="insight insight--positive" style={{ marginBottom: 'var(--s-3)' }}>{t('reconcile.match', locale)}</div> : null}
          <div className="row">
            <Button className="grow" onClick={() => setStep(0)}>{t('common.back', locale)}</Button>
            <Button className="grow" variant="primary" onClick={() => void nextFromPaper()}>
              {pIn === null && pOut === null ? t('close.paperSkip', locale) : t('common.continue', locale)}
            </Button>
          </div>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <p className="sub">{t('close.confirmBody', locale)}</p>
          <div className="row">
            <Button className="grow" onClick={() => setStep(1)}>{t('common.back', locale)}</Button>
            <Button
              className={`grow${celebrate ? ' close-celebrate' : ''}`}
              variant="primary"
              style={celebrate ? ({ animation: 'close-pop 0.6s ease' } as CSSProperties) : undefined}
              onClick={async () => {
                haptic([10, 40, 10])
                setCelebrate(true)
                await onConfirm()
                window.setTimeout(() => onClose(), 400)
              }}
            >
              <Lock size={18} /> {t('close.confirm', locale)}
            </Button>
          </div>
        </>
      ) : null}
    </Sheet>
  )
}
