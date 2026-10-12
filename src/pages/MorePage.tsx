import { Link } from 'react-router-dom'
import { formatMoney } from '../domain/calc'
import { propertyTypeLabel } from '../domain/propertyTypes'
import { t } from '../i18n'
import { ScreenShell } from '../design-kit/ScreenShell'
import { useAppData } from '../storage/AppDataContext'

export function MorePage() {
  const { settings, exportBackup } = useAppData()
  const locale = settings.locale

  return (
    <ScreenShell>
      <h1 className="page-title">{t('more.title', locale)}</h1>
      <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
        <p style={{ margin: '0 0 0.25rem', fontWeight: 600 }}>{settings.userName}</p>
        <p style={{ margin: '0 0 0.5rem', fontWeight: 600 }}>{settings.propertyName}</p>
        <p style={{ margin: 0, color: 'var(--color-muted)' }}>
          {propertyTypeLabel(settings, locale)} · {settings.currencyCode}
          {settings.openingBalanceCents
            ? ` · ${formatMoney(settings.openingBalanceCents, settings.currencyCode, locale)} starting balance`
            : ''}
        </p>
      </div>
      <Link to="/categories" className="btn btn--ghost btn--block" style={{ marginBottom: 'var(--space-md)' }}>
        {t('more.categories', locale)}
      </Link>
      <button type="button" className="btn btn--primary btn--block" onClick={() => void exportBackup()}>
        {t('more.export', locale)}
      </button>
      <p className="page-sub" style={{ marginTop: 'var(--space-xl)' }}>
        {t('more.about', locale)}
      </p>
    </ScreenShell>
  )
}
