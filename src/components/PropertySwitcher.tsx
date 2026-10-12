import { Check, ChevronDown, Plus, Settings2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { propertyTypeLabel } from '../domain/propertyTypes'
import { Button, Sheet } from '../design-kit/Primitives'
import { t } from '../i18n'
import { useAppData } from '../storage/AppDataContext'

export function PropertySwitcher() {
  const { settings, properties, activeProperty, setActiveProperty } = useAppData()
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const locale = settings.locale

  if (!activeProperty) return <span />

  return (
    <>
      <button type="button" className="topbar__switch" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <span className="topbar__dot" style={{ background: activeProperty.color }} />
        <span className="topbar__name">{activeProperty.name}</span>
        <span className="topbar__type">{propertyTypeLabel(activeProperty, locale)}</span>
        <ChevronDown size={18} aria-hidden />
      </button>

      <Sheet open={open} onClose={() => setOpen(false)} title={t('switcher.title', locale)}>
        <div className="stack">
          {properties.map((p) => {
            const active = p.id === activeProperty.id
            return (
              <button
                key={p.id}
                type="button"
                className="btn btn--ghost btn--block"
                style={{ justifyContent: 'flex-start', borderColor: active ? 'var(--accent)' : undefined }}
                onClick={() => {
                  setActiveProperty(p.id)
                  setOpen(false)
                }}
              >
                <span className="topbar__dot" style={{ background: p.color }} />
                <span className="grow" style={{ textAlign: 'left' }}>
                  <span style={{ display: 'block', fontWeight: 700 }}>{p.name}</span>
                  <span className="caption">
                    {propertyTypeLabel(p, locale)} · {p.currencyCode}
                  </span>
                </span>
                {active ? <Check size={20} aria-hidden /> : null}
              </button>
            )
          })}
          <div className="stack" style={{ gap: 'var(--s-2)', marginTop: 'var(--s-2)' }}>
            <Button
              variant="primary"
              block
              onClick={() => {
                setOpen(false)
                navigate('/properties/new')
              }}
            >
              <Plus size={18} aria-hidden /> {t('switcher.add', locale)}
            </Button>
            <Button
              block
              onClick={() => {
                setOpen(false)
                navigate('/properties')
              }}
            >
              <Settings2 size={18} aria-hidden /> {t('switcher.manage', locale)}
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  )
}
