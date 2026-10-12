import { useState } from 'react'
import { Link } from 'react-router-dom'
import { t } from '../i18n'
import { ScreenShell } from '../design-kit/ScreenShell'
import { useAppData } from '../storage/AppDataContext'
import { updateCategoryLabel } from '../storage/categories'

export function CategoriesPage() {
  const { settings, categories, refresh } = useAppData()
  const locale = settings.locale
  const [edits, setEdits] = useState<Record<string, string>>({})

  return (
    <ScreenShell>
      <Link to="/more" className="btn btn--ghost" style={{ marginBottom: 'var(--space-md)' }}>
        ← {t('nav.more', locale)}
      </Link>
      <h1 className="page-title">{t('categories.title', locale)}</h1>
      <p className="page-sub">{t('categories.sub', locale)}</p>

      {categories.length === 0 ? (
        <div className="card">
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>{t('categories.empty', locale)}</p>
        </div>
      ) : (
        <div className="card">
          {categories.map((cat) => (
            <div key={cat.id} className="field" style={{ marginBottom: 'var(--space-md)' }}>
              <label htmlFor={`cat-${cat.id}`}>{t('categories.name', locale)}</label>
              <input
                id={`cat-${cat.id}`}
                value={edits[cat.id] ?? cat.label}
                onChange={(e) => setEdits((prev) => ({ ...prev, [cat.id]: e.target.value }))}
                onBlur={() => {
                  const next = (edits[cat.id] ?? cat.label).trim()
                  if (next && next !== cat.label) {
                    void updateCategoryLabel(cat.id, next).then(() => refresh())
                  }
                }}
              />
            </div>
          ))}
        </div>
      )}
    </ScreenShell>
  )
}
