import { useCallback, useState } from 'react'
import { PinPad } from '../components/PinPad'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { markUnlocked, verifyPin } from '../security/pin'
import { useAppData } from '../storage/AppDataContext'

export function LockPage({ onUnlock }: { onUnlock: () => void }) {
  const { settings } = useAppData()
  const [error, setError] = useState<string | null>(null)
  const locale = settings.locale

  const check = useCallback(
    async (pin: string) => {
      if (!settings.pinHash || !settings.pinSalt) return onUnlock()
      const ok = await verifyPin(pin, settings.pinSalt, settings.pinHash)
      if (ok) {
        markUnlocked()
        setError(null)
        onUnlock()
      } else setError(t('pin.wrong', locale))
    },
    [settings.pinHash, settings.pinSalt, locale, onUnlock],
  )

  return (
    <ScreenShell hideNav>
      <div style={{ paddingTop: '10dvh' }}>
        <PinPad title={t('pin.enter', locale)} error={error} onComplete={(p) => void check(p)} />
      </div>
    </ScreenShell>
  )
}
