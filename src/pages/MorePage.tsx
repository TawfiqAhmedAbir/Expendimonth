import { Bell, Building2, ChevronRight, Download, KeyRound, Layers, Moon, Printer, ShieldCheck, Sun, Tags, Upload } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { PinPad } from '../components/PinPad'
import { useToast } from '../components/Toast'
import { currentYearMonth } from '../domain/calc'
import type { BackupPayload } from '../domain/types'
import { Button, Card, Sheet } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { hashPin, makeSalt, markUnlocked } from '../security/pin'
import { useAppData } from '../storage/AppDataContext'
import { parseBackup } from '../storage/repository'

const NINETY_DAYS = 90 * 86_400_000

export function BackupNudge() {
  const { settings, exportBackup, months, linesByMonthId } = useAppData()
  const locale = settings.locale
  const allLines = months.flatMap((m) => linesByMonthId.get(m.id) ?? [])
  if (allLines.length === 0) return null
  // Never exported: nudge once the oldest entry is 90 days old. Exported before: nudge 90 days after that.
  const anchor = settings.lastExportAt ?? Math.min(...allLines.map((l) => l.createdAt))
  if (Date.now() - anchor < NINETY_DAYS) return null
  return (
    <div className="insight insight--warn row row--between" style={{ marginBottom: 'var(--s-4)' }}>
      <span>{t('nudge.backup', locale)}</span>
      <Button size="sm" variant="primary" onClick={() => void exportBackup()}>{t('nudge.backupCta', locale)}</Button>
    </div>
  )
}

function RowLink({ to, icon, label, hint }: { to: string; icon: React.ReactNode; label: string; hint?: string }) {
  return (
    <Link to={to} className="line" style={{ textDecoration: 'none' }}>
      <span className="line__icon">{icon}</span>
      <span className="grow">
        <span className="line__title" style={{ display: 'block' }}>{label}</span>
        {hint ? <span className="line__note">{hint}</span> : null}
      </span>
      <ChevronRight size={20} className="muted" />
    </Link>
  )
}

export function MorePage() {
  const { settings, updateSettings, exportBackup, restoreBackup, properties, categories } = useAppData()
  const { showToast } = useToast()
  const locale = settings.locale
  const [pinStep, setPinStep] = useState<'idle' | 'set' | 'confirm'>('idle')
  const [firstPin, setFirstPin] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null)
  const hasPin = Boolean(settings.pinHash)

  async function onPin(p: string) {
    if (pinStep === 'set') {
      setFirstPin(p)
      setPinError(null)
      setPinStep('confirm')
      return
    }
    if (p !== firstPin) {
      setPinError(t('pin.mismatch', locale))
      setPinStep('set')
      return
    }
    const salt = makeSalt()
    const hash = await hashPin(p, salt)
    updateSettings({ pinHash: hash, pinSalt: salt })
    markUnlocked()
    setPinStep('idle')
    showToast({ message: t('pin.saved', locale) })
  }

  const lastBackup = settings.lastExportAt ? new Date(settings.lastExportAt).toLocaleDateString(locale) : null

  return (
    <ScreenShell>
      <h1 className="title">{t('more.title', locale)}</h1>
      <p className="eyebrow">{t('home.greeting', locale, { name: settings.userName })}</p>

      <BackupNudge />

      <Card>
        <RowLink to="/properties" icon={<Building2 size={20} />} label={t('more.properties', locale)} hint={`${properties.length}`} />
        {properties.length > 1 ? <RowLink to="/portfolio" icon={<Layers size={20} />} label={t('portfolio.title', locale)} /> : null}
        <RowLink to="/categories" icon={<Tags size={20} />} label={t('more.categories', locale)} hint={`${categories.length}`} />
      </Card>

      <h2 className="section">{t('reminder.settingsTitle', locale)}</h2>
      <Card>
        <div className="line">
          <span className="line__icon"><Bell size={20} /></span>
          <span className="grow">
            <span className="line__title" style={{ display: 'block' }}>{t('reminder.enable', locale)}</span>
            <span className="line__note">{t('reminder.note', locale)}</span>
          </span>
          <Button
            size="sm"
            variant={settings.remindersEnabled ? 'primary' : 'ghost'}
            onClick={async () => {
              const next = !settings.remindersEnabled
              if (next && typeof Notification !== 'undefined' && Notification.permission === 'default') {
                await Notification.requestPermission()
              }
              updateSettings({ remindersEnabled: next })
            }}
          >
            {settings.remindersEnabled ? 'On' : 'Off'}
          </Button>
        </div>
      </Card>

      <h2 className="section">{t('more.appearance', locale)}</h2>
      <Card>
        <div className="line">
          <span className="line__icon">{settings.theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}</span>
          <span className="grow line__title">{t('more.dark', locale)}</span>
          <Button size="sm" variant={settings.theme === 'dark' ? 'primary' : 'ghost'} onClick={() => updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })} aria-pressed={settings.theme === 'dark'}>
            {settings.theme === 'dark' ? 'On' : 'Off'}
          </Button>
        </div>
      </Card>

      <h2 className="section">{t('more.security', locale)}</h2>
      <Card>
        <div className="line">
          <span className="line__icon"><KeyRound size={20} /></span>
          <span className="grow">
            <span className="line__title" style={{ display: 'block' }}>{hasPin ? t('more.pinOn', locale) : t('more.pinOff', locale)}</span>
          </span>
          <Button size="sm" onClick={() => { setPinError(null); setPinStep('set') }}>{hasPin ? t('more.pinChange', locale) : t('more.pinSet', locale)}</Button>
          {hasPin ? (
            <Button size="sm" variant="danger" onClick={() => { updateSettings({ pinHash: null, pinSalt: null }); showToast({ message: t('pin.removed', locale) }) }}>
              {t('more.pinRemove', locale)}
            </Button>
          ) : null}
        </div>
      </Card>

      <h2 className="section">{t('more.data', locale)}</h2>
      <Card>
        <div className="line">
          <span className="line__icon"><Download size={20} /></span>
          <span className="grow">
            <span className="line__title" style={{ display: 'block' }}>{t('more.export', locale)}</span>
            <span className="line__note">{lastBackup ? t('more.lastBackup', locale, { when: lastBackup }) : t('more.neverBackedUp', locale)}</span>
          </span>
          <Button size="sm" variant="primary" onClick={() => void exportBackup()}>{t('common.save', locale)}</Button>
        </div>
        <div className="line">
          <span className="line__icon"><Upload size={20} /></span>
          <span className="grow line__title">{t('more.restore', locale)}</span>
          <label className="btn btn--ghost btn--sm">
            {t('more.restorePick', locale)}
            <input
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0]
                e.target.value = ''
                if (!file) return
                void file.text().then((text) => {
                  try {
                    const parsed = parseBackup(JSON.parse(text))
                    if (!parsed) showToast({ message: t('more.restoreBad', locale) })
                    else setPendingBackup(parsed)
                  } catch {
                    showToast({ message: t('more.restoreBad', locale) })
                  }
                })
              }}
            />
          </label>
        </div>
        <RowLink to={`/report/month/${currentYearMonth()}`} icon={<Printer size={20} />} label={t('more.printMonth', locale)} />
        <div className="line">
          <span className="line__icon"><ShieldCheck size={20} /></span>
          <span className="grow caption">{t('more.localOnly', locale)}</span>
        </div>
      </Card>

      <p className="caption" style={{ marginTop: 'var(--s-6)' }}>{t('more.about', locale)}</p>

      <Sheet open={Boolean(pendingBackup)} onClose={() => setPendingBackup(null)} title={t('more.restore', locale)}>
        <p className="sub">{t('more.restoreConfirm', locale)}</p>
        <div className="row">
          <Button className="grow" onClick={() => setPendingBackup(null)}>{t('common.cancel', locale)}</Button>
          <Button
            className="grow"
            variant="danger"
            onClick={() => {
              const payload = pendingBackup
              if (!payload) return
              void restoreBackup(payload).then(() => {
                setPendingBackup(null)
                showToast({ message: t('more.restoreOk', locale) })
              })
            }}
          >
            {t('more.restoreAction', locale)}
          </Button>
        </div>
      </Sheet>

      <Sheet open={pinStep !== 'idle'} onClose={() => setPinStep('idle')}>
        <PinPad title={pinStep === 'set' ? t('pin.set', locale) : t('pin.confirm', locale)} error={pinError} onComplete={(p) => void onPin(p)} />
      </Sheet>
    </ScreenShell>
  )
}
