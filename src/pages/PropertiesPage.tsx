import { ArrowLeft, Check, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AddPropertyFlow } from '../components/AddPropertyFlow'
import { useToast } from '../components/Toast'
import { CURRENCIES, propertyTypeLabel } from '../domain/propertyTypes'
import type { Property } from '../domain/types'
import { Button, Card, Chip, Field, LinkButton, Sheet } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useAppData } from '../storage/AppDataContext'
import { PROPERTY_COLORS, createProperty, deleteProperty, restoreProperty, updateProperty } from '../storage/properties'

export function NewPropertyPage() {
  const navigate = useNavigate()
  const { settings, properties, activeProperty, updateSettings, refresh } = useAppData()
  const usedColors = new Set(properties.map((p) => p.color))
  const freeColor = PROPERTY_COLORS.find((c) => !usedColors.has(c))
  return (
    <ScreenShell hideNav>
      <LinkButton to="/properties" variant="subtle" className="no-print" style={{ marginBottom: 'var(--s-3)', paddingLeft: 0 }}>
        <ArrowLeft size={18} /> {t('common.back', settings.locale)}
      </LinkButton>
      <AddPropertyFlow
        locale={settings.locale}
        defaultCurrency={activeProperty?.currencyCode}
        defaultColor={freeColor}
        onDone={async (draft) => {
          const p = await createProperty(draft)
          updateSettings({ activePropertyId: p.id })
          await refresh()
          navigate('/', { replace: true })
        }}
      />
    </ScreenShell>
  )
}

export function PropertiesPage() {
  const { settings, properties, refresh, setActiveProperty } = useAppData()
  const { showUndo } = useToast()
  const locale = settings.locale
  const [editing, setEditing] = useState<Property | null>(null)
  const [confirm, setConfirm] = useState<Property | null>(null)

  async function remove(p: Property) {
    const snap = await deleteProperty(p.id)
    setConfirm(null)
    await refresh()
    if (snap) {
      showUndo(t('properties.deleted', locale), t('common.undo', locale), async () => {
        await restoreProperty(snap)
        await refresh()
      })
    }
  }

  return (
    <ScreenShell>
      <LinkButton to="/more" variant="subtle" style={{ marginBottom: 'var(--s-3)', paddingLeft: 0 }}>
        <ArrowLeft size={18} /> {t('nav.more', locale)}
      </LinkButton>
      <h1 className="title">{t('properties.title', locale)}</h1>
      <p className="sub">{t('properties.sub', locale)}</p>

      <div className="stack">
        {properties.map((p) => (
          <Card key={p.id}>
            <div className="row row--between">
              <div className="row grow">
                <span className="topbar__dot" style={{ background: p.color, width: 14, height: 14 }} />
                <div className="grow">
                  <div style={{ fontWeight: 800 }}>{p.name}</div>
                  <div className="caption">
                    {propertyTypeLabel(p, locale)} · {p.currencyCode}
                  </div>
                </div>
              </div>
              {settings.activePropertyId === p.id ? <Check size={20} aria-label="active" /> : null}
            </div>
            <div className="row" style={{ marginTop: 'var(--s-3)' }}>
              <Button size="sm" onClick={() => setEditing(p)}>
                {t('common.edit', locale)}
              </Button>
              {settings.activePropertyId !== p.id ? (
                <Button size="sm" onClick={() => setActiveProperty(p.id)}>
                  Use
                </Button>
              ) : null}
              <span className="grow" />
              <Button size="sm" variant="danger" disabled={properties.length <= 1} onClick={() => setConfirm(p)}>
                <Trash2 size={16} /> {t('common.delete', locale)}
              </Button>
            </div>
          </Card>
        ))}
        <LinkButton to="/properties/new" variant="primary" block>
          <Plus size={18} /> {t('properties.new', locale)}
        </LinkButton>
      </div>

      <Sheet open={Boolean(editing)} onClose={() => setEditing(null)} title={t('common.edit', locale)}>
        {editing ? <EditPropertyForm property={editing} locale={locale} onSaved={async () => { setEditing(null); await refresh() }} /> : null}
      </Sheet>

      <Sheet open={Boolean(confirm)} onClose={() => setConfirm(null)} title={confirm ? t('properties.confirmDelete', locale, { name: confirm.name }) : ''}>
        <p className="sub">{t('properties.confirmDeleteBody', locale)}</p>
        <div className="row">
          <Button className="grow" onClick={() => setConfirm(null)}>{t('common.cancel', locale)}</Button>
          <Button className="grow" variant="danger" onClick={() => confirm && void remove(confirm)}>
            {t('common.delete', locale)}
          </Button>
        </div>
      </Sheet>
    </ScreenShell>
  )
}

function EditPropertyForm({ property, locale, onSaved }: { property: Property; locale: string; onSaved: () => void }) {
  const [name, setName] = useState(property.name)
  const [currency, setCurrency] = useState(property.currencyCode)
  const [color, setColor] = useState(property.color)
  return (
    <>
      <Field label={t('setup.propertyName', locale)} htmlFor="ename">
        <input id="ename" className="input" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label={t('setup.currency', locale)} htmlFor="ecur">
        <select id="ecur" className="input" value={currency} onChange={(e) => setCurrency(e.target.value)}>
          {CURRENCIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="field">
        <span className="field__label">{t('setup.color', locale)}</span>
        <div className="chips">
          {PROPERTY_COLORS.map((c) => (
            <Chip key={c} active={color === c} onClick={() => setColor(c)}>
              <span className="topbar__dot" style={{ background: c, display: 'inline-block' }} />
            </Chip>
          ))}
        </div>
      </div>
      <Button
        variant="primary"
        block
        disabled={!name.trim()}
        onClick={async () => {
          await updateProperty(property.id, { name: name.trim(), currencyCode: currency, color })
          onSaved()
        }}
      >
        {t('common.save', locale)}
      </Button>
    </>
  )
}
