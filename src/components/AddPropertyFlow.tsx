import { useState, type FormEvent } from 'react'
import { parseMoneyToCents } from '../domain/calc'
import { CURRENCIES, PROPERTY_TYPE_OPTIONS } from '../domain/propertyTypes'
import type { Property, PropertyType } from '../domain/types'
import { Button, Card, Chip, Field, Steps } from '../design-kit/Primitives'
import { t } from '../i18n'
import { PROPERTY_COLORS } from '../storage/properties'

type Draft = Omit<Property, 'id' | 'createdAt'>

type Props = {
  locale: string
  stepOffset?: number
  totalSteps?: number
  onDone: (draft: Draft) => void
  onBack?: () => void
  /** Pre-select a currency (e.g. the one already used by another property). */
  defaultCurrency?: string
  /** Pre-select a colour not yet used by another property. */
  defaultColor?: string
}

export function AddPropertyFlow({ locale, stepOffset = 0, totalSteps = 3, onDone, onBack, defaultCurrency = '', defaultColor }: Props) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [type, setType] = useState<PropertyType>('house')
  const [typeCustom, setTypeCustom] = useState('')
  const [currencyCode, setCurrencyCode] = useState(defaultCurrency)
  const [opening, setOpening] = useState('')
  const [color, setColor] = useState(defaultColor ?? PROPERTY_COLORS[0]!)

  const titles = [t('setup.propertyTitle', locale), t('setup.typeTitle', locale), t('setup.moneyTitle', locale)]
  const subs = [t('setup.propertySub', locale), t('setup.typePrompt', locale), '']

  function finish(e: FormEvent) {
    e.preventDefault()
    if (!currencyCode) return
    onDone({
      name: name.trim(),
      type,
      typeCustom: type === 'other' ? typeCustom.trim() : '',
      currencyCode,
      openingBalanceCents: opening.trim() ? parseMoneyToCents(opening) ?? 0 : 0,
      color,
    })
  }

  const back = () => (step === 0 ? onBack?.() : setStep(step - 1))

  return (
    <>
      <p className="eyebrow">{t('setup.progress', locale, { current: String(step + 1 + stepOffset), total: String(totalSteps) })}</p>
      <Steps count={totalSteps} current={step + stepOffset} />
      <h1 className="title">{titles[step]}</h1>
      {subs[step] ? <p className="sub">{subs[step]}</p> : null}

      {step === 0 ? (
        <Card>
          <Field label={t('setup.propertyName', locale)} htmlFor="pname">
            <input id="pname" className="input" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={t('setup.propertyNameHint', locale)} />
          </Field>
          <div className="row">
            {onBack ? <Button className="grow" onClick={back}>{t('common.back', locale)}</Button> : null}
            <Button variant="primary" className="grow" disabled={!name.trim()} onClick={() => setStep(1)}>
              {t('common.continue', locale)}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 1 ? (
        <Card>
          <div className="stack" style={{ marginBottom: 'var(--s-4)' }}>
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip${type === opt.id ? ' chip--active' : ''}`}
                style={{ width: '100%', justifyContent: 'center', minHeight: 'var(--touch)' }}
                onClick={() => setType(opt.id)}
              >
                {t(opt.labelKey, locale)}
              </button>
            ))}
          </div>
          {type === 'other' ? (
            <Field label={t('setup.typeCustom', locale)} htmlFor="tcustom">
              <input id="tcustom" className="input" value={typeCustom} onChange={(e) => setTypeCustom(e.target.value)} placeholder={t('setup.typeCustomHint', locale)} />
            </Field>
          ) : null}
          <div className="row">
            <Button className="grow" onClick={back}>{t('common.back', locale)}</Button>
            <Button variant="primary" className="grow" disabled={type === 'other' && !typeCustom.trim()} onClick={() => setStep(2)}>
              {t('common.continue', locale)}
            </Button>
          </div>
        </Card>
      ) : null}

      {step === 2 ? (
        <form onSubmit={finish}>
          <Card>
            <Field label={t('setup.currency', locale)} htmlFor="cur">
              <select id="cur" className="input" value={currencyCode} onChange={(e) => setCurrencyCode(e.target.value)} required>
                <option value="">—</option>
                {CURRENCIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('setup.openingBalance', locale)} htmlFor="opening">
              <input id="opening" className="input" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
            </Field>
            <div className="field">
              <span className="field__label">{t('setup.color', locale)}</span>
              <div className="chips">
                {PROPERTY_COLORS.map((c, i) => (
                  <Chip key={c} active={color === c} onClick={() => setColor(c)} aria-label={`${t('setup.color', locale)} ${i + 1}`}>
                    <span className="topbar__dot" style={{ background: c, display: 'inline-block' }} />
                  </Chip>
                ))}
              </div>
            </div>
            <div className="row">
              <Button className="grow" onClick={back}>{t('common.back', locale)}</Button>
              <button type="submit" className="btn btn--primary grow">
                {t('setup.finish', locale)}
              </button>
            </div>
          </Card>
        </form>
      ) : null}
    </>
  )
}
