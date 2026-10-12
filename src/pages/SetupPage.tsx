import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddPropertyFlow } from '../components/AddPropertyFlow'
import { Button, Card, Field, Steps } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useAppData } from '../storage/AppDataContext'
import { createProperty } from '../storage/properties'

export function SetupPage() {
  const navigate = useNavigate()
  const { settings, updateSettings, refresh } = useAppData()
  const locale = settings.locale
  const [userName, setUserName] = useState(settings.userName)
  const [nameDone, setNameDone] = useState(Boolean(settings.userName.trim()))

  return (
    <ScreenShell hideNav>
      {!nameDone ? (
        <>
          <p className="eyebrow">{t('setup.progress', locale, { current: '1', total: '4' })}</p>
          <Steps count={4} current={0} />
          <h1 className="title">{t('setup.nameTitle', locale)}</h1>
          <p className="sub">{t('setup.nameSub', locale)}</p>
          <Card>
            <Field label={t('setup.userName', locale)} htmlFor="uname">
              <input id="uname" className="input" autoFocus value={userName} onChange={(e) => setUserName(e.target.value)} placeholder={t('setup.userNameHint', locale)} />
            </Field>
            <Button
              variant="primary"
              block
              disabled={!userName.trim()}
              onClick={() => {
                updateSettings({ userName: userName.trim() })
                setNameDone(true)
              }}
            >
              {t('common.continue', locale)}
            </Button>
          </Card>
        </>
      ) : (
        <AddPropertyFlow
          locale={locale}
          stepOffset={1}
          totalSteps={4}
          onBack={() => setNameDone(false)}
          onDone={async (draft) => {
            const p = await createProperty(draft)
            updateSettings({ activePropertyId: p.id })
            await refresh()
            navigate('/', { replace: true })
          }}
        />
      )}
    </ScreenShell>
  )
}
