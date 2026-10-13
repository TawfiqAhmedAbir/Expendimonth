import { ArrowLeft, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { CategoryIcon } from '../components/CategoryIcon'
import { useToast } from '../components/Toast'
import { CATEGORY_ICONS } from '../domain/categories'
import type { UserCategory } from '../domain/types'
import { Button, Card, Chip, Field, LinkButton, Sheet } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useAppData } from '../storage/AppDataContext'
import { centsToInput, parseMoneyToCents } from '../domain/calc'
import { deleteCategory, restoreCategory, updateCategory } from '../storage/categories'

export function CategoriesPage() {
  const { settings, categories, refresh } = useAppData()
  const { showUndo } = useToast()
  const locale = settings.locale
  const [editing, setEditing] = useState<UserCategory | null>(null)

  async function remove(cat: UserCategory) {
    const removed = await deleteCategory(cat.id)
    await refresh()
    if (removed) {
      showUndo(t('category.deleted', locale), t('common.undo', locale), async () => {
        await restoreCategory(removed)
        await refresh()
      })
    }
  }

  return (
    <ScreenShell>
      <LinkButton to="/more" variant="subtle" style={{ marginBottom: 'var(--s-3)', paddingLeft: 0 }}>
        <ArrowLeft size={18} /> {t('nav.more', locale)}
      </LinkButton>
      <h1 className="title">{t('category.title', locale)}</h1>
      <p className="sub">{t('category.sub', locale)}</p>

      {categories.length === 0 ? (
        <Card variant="flat">
          <p className="muted" style={{ margin: 0 }}>{t('category.empty', locale)}</p>
        </Card>
      ) : (
        <Card>
          {categories.map((cat) => (
            <div key={cat.id} className="line">
              <div className="line__icon">
                <CategoryIcon name={cat.icon} />
              </div>
              <div className="grow">
                <div className="line__title">{cat.label}</div>
                <div className="line__note">{t('category.uses', locale, { n: String(cat.useCount) })}</div>
              </div>
              <Button size="sm" onClick={() => setEditing(cat)}>{t('common.edit', locale)}</Button>
              <Button size="icon" variant="subtle" aria-label={t('common.delete', locale)} onClick={() => void remove(cat)}>
                <Trash2 size={18} />
              </Button>
            </div>
          ))}
        </Card>
      )}

      <CategoryEditSheet category={editing} locale={locale} onClose={() => setEditing(null)} onSaved={refresh} />
    </ScreenShell>
  )
}

export function CategoryEditSheet({ category, locale, onClose, onSaved }: { category: UserCategory | null; locale: string; onClose: () => void; onSaved: () => Promise<void> | void }) {
  const [label, setLabel] = useState(category?.label ?? '')
  const [icon, setIcon] = useState<string | null>(category?.icon ?? null)
  const [standing, setStanding] = useState(false)
  const [standingAmount, setStandingAmount] = useState('')
  const [budgetAmount, setBudgetAmount] = useState('')
  useEffect(() => {
    if (category) {
      setLabel(category.label)
      setIcon(category.icon)
      setStanding(Boolean(category.standing))
      const sa = category.standingAmountCents ?? category.lastAmountCents
      setStandingAmount(sa !== null && sa !== undefined ? centsToInput(sa) : '')
      setBudgetAmount(category.budgetCents ? centsToInput(category.budgetCents) : '')
    }
  }, [category])
  return (
    <Sheet open={Boolean(category)} onClose={onClose} title={t('category.rename', locale)}>
      <Field label={t('category.name', locale)} htmlFor="clabel">
        <input id="clabel" className="input" value={label} onChange={(e) => setLabel(e.target.value)} autoFocus />
      </Field>
      <div className="field">
        <span className="field__label">{t('category.icon', locale)}</span>
        <div className="chips">
          <Chip active={icon === null} onClick={() => setIcon(null)}>{t('common.none', locale)}</Chip>
          {CATEGORY_ICONS.map((name) => (
            <Chip key={name} active={icon === name} onClick={() => setIcon(name)}>
              <CategoryIcon name={name} size={18} />
            </Chip>
          ))}
        </div>
      </div>
      <div className="field">
        <span className="field__label">{t('standing.toggle', locale)}</span>
        <div className="chips">
          <Chip active={!standing} onClick={() => setStanding(false)}>{t('common.none', locale)}</Chip>
          <Chip active={standing} onClick={() => setStanding(true)}>{t('standing.everyMonth', locale)}</Chip>
        </div>
      </div>
      {standing ? (
        <Field label={t('standing.amount', locale)} htmlFor="stand-amt">
          <input id="stand-amt" className="input" inputMode="decimal" value={standingAmount} onChange={(e) => setStandingAmount(e.target.value)} />
        </Field>
      ) : null}
      <Field label={t('budget.limit', locale)} htmlFor="budget-amt">
        <input id="budget-amt" className="input" inputMode="decimal" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} placeholder={t('budget.optional', locale)} />
      </Field>
      <Button
        variant="primary"
        block
        disabled={!label.trim()}
        onClick={async () => {
          if (!category) return
          const standingAmountCents = standing && standingAmount.trim() ? parseMoneyToCents(standingAmount) : standing ? category.lastAmountCents : null
          const budgetCents = budgetAmount.trim() ? parseMoneyToCents(budgetAmount) : null
          await updateCategory(category.id, {
            label: label.trim(),
            icon,
            standing,
            standingAmountCents: standing ? standingAmountCents : null,
            budgetCents,
          })
          await onSaved()
          onClose()
        }}
      >
        {t('common.save', locale)}
      </Button>
    </Sheet>
  )
}
