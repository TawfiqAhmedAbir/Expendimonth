import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseMoneyToCents } from '../domain/calc'
import { PROPERTY_TYPE_OPTIONS } from '../domain/propertyTypes'
import type { PropertyType, Settings } from '../domain/types'
import { t } from '../i18n'
import { ScreenShell } from '../design-kit/ScreenShell'
import { useAppData } from '../storage/AppDataContext'

const CURRENCIES = [
  { code: 'BDT', label: 'Bangladeshi taka (BDT)' },
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'MAD', label: 'Moroccan dirham (MAD)' },
  { code: 'USD', label: 'US dollar (USD)' },
  { code: 'GBP', label: 'British pound (GBP)' },
]

const STEPS = 4

export function SetupPage() {
  const navigate = useNavigate()
  const { updateSettings } = useAppData()
  const [step, setStep] = useState(0)
  const [userName, setUserName] = useState('')
  const [propertyName, setPropertyName] = useState('')
  const [propertyType, setPropertyType] = useState<PropertyType>('house')
  const [propertyTypeCustom, setPropertyTypeCustom] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [opening, setOpening] = useState('')

  function next() {
    setStep((s) => Math.min(s + 1, STEPS - 1))
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0))
  }

  function submitMoney(e: FormEvent) {
    e.preventDefault()
    if (!currencyCode) return
    const openingBalanceCents = opening.trim() ? parseMoneyToCents(opening) ?? 0 : 0
    const settings: Settings = {
      userName: userName.trim(),
      propertyName: propertyName.trim(),
      propertyType,
      propertyTypeCustom: propertyType === 'other' ? propertyTypeCustom.trim() : '',
      currencyCode,
      openingBalanceCents,
      locale: 'en',
    }
    updateSettings(settings)
    navigate('/', { replace: true })
  }

  const stepTitle = [
    t('setup.stepName'),
    t('setup.stepProperty'),
    t('setup.stepType'),
    t('setup.stepMoney'),
  ][step]

  return (
    <ScreenShell hideNav>
      <p className="page-sub" style={{ marginTop: 0 }}>
        {t('setup.progress', 'en', { current: String(step + 1), total: String(STEPS) })}
      </p>
      <h1 className="page-title">{stepTitle}</h1>
      <p className="page-sub">{t('setup.sub')}</p>

      {step === 0 ? (
        <div className="card">
          <div className="field">
            <label htmlFor="userName">{t('setup.userName')}</label>
            <input
              id="userName"
              autoFocus
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder={t('setup.userNameHint')}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={!userName.trim()}
            onClick={next}
          >
            {t('setup.continue')}
          </button>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="card">
          <div className="field">
            <label htmlFor="property">{t('setup.propertyName')}</label>
            <input
              id="property"
              autoFocus
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              placeholder={t('setup.propertyNameHint')}
            />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={back}>
              {t('setup.back')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ flex: 1 }}
              disabled={!propertyName.trim()}
              onClick={next}
            >
              {t('setup.continue')}
            </button>
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="card">
          <p style={{ marginTop: 0, fontWeight: 600 }}>{t('setup.typePrompt')}</p>
          <div className="btn-row" style={{ flexDirection: 'column' }}>
            {PROPERTY_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                className={`chip${propertyType === opt.id ? ' chip--active' : ''}`}
                style={{ width: '100%', justifyContent: 'center' }}
                onClick={() => setPropertyType(opt.id)}
              >
                {t(opt.labelKey)}
              </button>
            ))}
          </div>
          {propertyType === 'other' ? (
            <div className="field" style={{ marginBottom: 0, marginTop: 'var(--space-md)' }}>
              <label htmlFor="typeCustom">{t('setup.typeCustom')}</label>
              <input
                id="typeCustom"
                value={propertyTypeCustom}
                onChange={(e) => setPropertyTypeCustom(e.target.value)}
                placeholder={t('setup.typeCustomHint')}
              />
            </div>
          ) : null}
          <div className="btn-row" style={{ marginTop: 'var(--space-lg)' }}>
            <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={back}>
              {t('setup.back')}
            </button>
            <button
              type="button"
              className="btn btn--primary"
              style={{ flex: 1 }}
              disabled={propertyType === 'other' && !propertyTypeCustom.trim()}
              onClick={next}
            >
              {t('setup.continue')}
            </button>
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <form className="card" onSubmit={submitMoney}>
          <div className="field">
            <label htmlFor="currency">{t('setup.currency')}</label>
            <select
              id="currency"
              value={currencyCode}
              onChange={(e) => setCurrencyCode(e.target.value)}
              required
            >
              <option value="">—</option>
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="opening">{t('setup.openingBalance')}</label>
            <input id="opening" inputMode="decimal" value={opening} onChange={(e) => setOpening(e.target.value)} />
          </div>
          <div className="btn-row">
            <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={back}>
              {t('setup.back')}
            </button>
            <button type="submit" className="btn btn--primary" style={{ flex: 1 }}>
              {t('setup.finish')}
            </button>
          </div>
        </form>
      ) : null}
    </ScreenShell>
  )
}
