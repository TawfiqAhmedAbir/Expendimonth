import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { parseMoneyToCents } from '../domain/calc'
import type { Settings } from '../domain/types'
import { t } from '../i18n'
import { ScreenShell } from '../design-kit/ScreenShell'
import { useAppData } from '../storage/AppDataContext'

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (EUR)' },
  { code: 'MAD', label: 'Moroccan dirham (MAD)' },
  { code: 'USD', label: 'US dollar (USD)' },
  { code: 'GBP', label: 'British pound (GBP)' },
]

export function SetupPage() {
  const navigate = useNavigate()
  const { updateSettings } = useAppData()
  const [houseName, setHouseName] = useState('')
  const [currencyCode, setCurrencyCode] = useState('')
  const [opening, setOpening] = useState('')

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!houseName.trim() || !currencyCode) return
    const openingBalanceCents = opening.trim() ? parseMoneyToCents(opening) ?? 0 : 0
    const settings: Settings = {
      houseName: houseName.trim(),
      currencyCode,
      openingBalanceCents,
      locale: 'en',
    }
    updateSettings(settings)
    navigate('/', { replace: true })
  }

  return (
    <ScreenShell hideNav>
      <h1 className="page-title">{t('setup.title')}</h1>
      <p className="page-sub">{t('setup.sub')}</p>
      <form className="card" onSubmit={submit}>
        <div className="field">
          <label htmlFor="house">{t('setup.houseName')}</label>
          <input id="house" value={houseName} onChange={(e) => setHouseName(e.target.value)} required />
        </div>
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
        <button type="submit" className="btn btn--primary btn--block">
          {t('setup.continue')}
        </button>
      </form>
    </ScreenShell>
  )
}
