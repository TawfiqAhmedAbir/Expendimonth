import { currentYearMonth } from '../domain/calc'
import { t } from '../i18n'
import { ScreenShell } from '../design-kit/ScreenShell'
import { MonthView } from '../components/MonthView'
import { useAppData } from '../storage/AppDataContext'

export function HomePage() {
  const { settings } = useAppData()
  const ym = currentYearMonth()

  return (
    <ScreenShell>
      <p className="page-sub" style={{ marginTop: 0 }}>
        {t('home.thisMonth', settings.locale)}
      </p>
      <MonthView yearMonth={ym} preview />
    </ScreenShell>
  )
}
