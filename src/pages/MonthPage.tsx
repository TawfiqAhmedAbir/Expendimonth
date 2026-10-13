import { ArrowLeft, ListChecks, Lock, LockOpen, Minus, Plus, Printer } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { AmountPadSheet, type AmountPadResult } from '../components/AmountPadSheet'
import { CloseMonthFlow } from '../components/CloseMonthFlow'
import { HeroTotals } from '../components/HeroTotals'
import { LastMonthChecklist } from '../components/LastMonthChecklist'
import { LineItemRow } from '../components/LineItemRow'
import { useToast } from '../components/Toast'
import { InOutBars } from '../components/charts'
import { CategoryEditSheet } from './CategoriesPage'
import {
  formatMoney,
  formatYearMonthLabel,
  net,
  previousYearMonth,
  reconcileMismatch,
  totalIn,
  totalOut,
} from '../domain/calc'
import type { LineItem, LineType, UserCategory } from '../domain/types'
import { Badge, Button, Card, LinkButton, Sheet } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'
import { createCategory, touchCategory } from '../storage/categories'
import {
  addLine,
  addLines,
  deleteLine,
  getOrCreateMonth,
  restoreLine,
  setMonthReconcile,
  setMonthStatus,
  updateLine,
} from '../storage/repository'

export function MonthPage() {
  const { yearMonth = '' } = useParams()
  const property = useActiveProperty()
  const { settings, monthsByYearMonth, linesByMonthId, categories, refresh } = useAppData()
  const { showUndo, showToast } = useToast()
  const locale = settings.locale
  const currency = property.currencyCode

  const month = monthsByYearMonth.get(yearMonth)
  const lines = useMemo(() => (month ? (linesByMonthId.get(month.id) ?? []) : []), [month, linesByMonthId])

  const [pad, setPad] = useState<{ type: LineType; edit?: LineItem } | null>(null)
  const [checklist, setChecklist] = useState(false)
  const [closing, setClosing] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [editCat, setEditCat] = useState<UserCategory | null>(null)

  useEffect(() => {
    if (!month && yearMonth) void getOrCreateMonth(property.id, yearMonth).then(() => refresh())
  }, [month, yearMonth, property.id, refresh])

  const prevYm = previousYearMonth(yearMonth)
  const prevMonth = prevYm ? monthsByYearMonth.get(prevYm) : undefined
  const prevLines = prevMonth ? (linesByMonthId.get(prevMonth.id) ?? []) : []

  if (!month) return <ScreenShell><div className="skeleton" style={{ height: 240 }} /></ScreenShell>

  const readOnly = month.status === 'done'
  const isEmpty = lines.length === 0
  const mismatch = reconcileMismatch(month, lines)

  async function save(data: AmountPadResult) {
    let categoryId = data.categoryId ?? pad?.edit?.categoryId
    if (data.newCategoryLabel) categoryId = (await createCategory(property.id, data.newCategoryLabel)).id
    if (!categoryId) return
    await touchCategory(categoryId, data.amountCents)
    const payload = { type: data.type, amountCents: data.amountCents, categoryId, note: data.note }
    if (pad?.edit) await updateLine({ ...pad.edit, ...payload })
    else await addLine(month!.id, payload)
    if (month!.status === 'checked') await setMonthStatus(month!.id, 'open')
    await refresh()
    showToast({ message: t('line.saved', locale) })
  }

  async function remove(line: LineItem) {
    const removed = await deleteLine(line.id)
    if (month!.status === 'checked') await setMonthStatus(month!.id, 'open')
    await refresh()
    if (removed) showUndo(t('line.deleted', locale), t('common.undo', locale), async () => { await restoreLine(removed); await refresh() })
  }

  return (
    <ScreenShell>
      <LinkButton to="/" variant="subtle" style={{ marginBottom: 'var(--s-2)', paddingLeft: 0 }}>
        <ArrowLeft size={18} /> {property.name}
      </LinkButton>
      <div className="row row--between" style={{ marginBottom: 'var(--s-4)' }}>
        <div>
          <h1 className="title" style={{ margin: 0 }}>{formatYearMonthLabel(yearMonth, locale)}</h1>
          <p className="caption" style={{ margin: 0 }}>{t('month.sub', locale)}</p>
        </div>
        <Badge status={mismatch && !readOnly ? 'warn' : month.status}>
          {readOnly ? <Lock size={14} /> : null}
          {mismatch && !readOnly ? t('months.filterMismatch', locale) : t(`status.${month.status}`, locale)}
        </Badge>
      </div>

      {readOnly ? <div className="insight" style={{ marginBottom: 'var(--s-4)' }}>{t('month.lockedHint', locale)}</div> : null}

      {isEmpty ? (
        <Card variant="flat">
          <p className="muted" style={{ margin: 0 }}>{t('month.emptyPrompt', locale)}</p>
        </Card>
      ) : (
        <Card>
          <HeroTotals lines={lines} currencyCode={currency} locale={locale} />
          <div style={{ marginTop: 'var(--s-4)' }}>
            <InOutBars series={[{ yearMonth, inCents: totalIn(lines), outCents: totalOut(lines), netCents: net(lines) }]} currencyCode={currency} locale={locale} height={140} />
          </div>
        </Card>
      )}

      {!readOnly ? (
        <div className="row" style={{ margin: 'var(--s-4) 0' }}>
          <Button variant="in" className="grow" onClick={() => setPad({ type: 'in' })}>
            <Plus size={20} /> {t('month.addIn', locale)}
          </Button>
          <Button variant="out" className="grow" onClick={() => setPad({ type: 'out' })}>
            <Minus size={20} /> {t('month.addOut', locale)}
          </Button>
        </div>
      ) : null}

      {!readOnly && prevLines.length > 0 ? (
        <Button block onClick={() => setChecklist(true)} style={{ marginBottom: 'var(--s-4)' }}>
          <ListChecks size={18} /> {t('month.startFromLast', locale)}
        </Button>
      ) : null}

      {!isEmpty ? (
        <Card>
          <h2 className="section" style={{ marginTop: 0 }}>{t('month.lines', locale)}</h2>
          {lines.map((line) => (
            <LineItemRow key={line.id} line={line} categories={categories} currencyCode={currency} locale={locale} readOnly={readOnly} onEdit={() => setPad({ type: line.type, edit: line })} />
          ))}
          <div className="totals">
            <div className="totals__row"><span>{t('running.totalIn', locale)}</span><span className="money money--in">{formatMoney(totalIn(lines), currency, locale)}</span></div>
            <div className="totals__row"><span>{t('running.totalOut', locale)}</span><span className="money money--out">{formatMoney(totalOut(lines), currency, locale)}</span></div>
            <div className="totals__row" style={{ fontWeight: 800 }}><span>{t('running.net', locale)}</span><span className="money">{formatMoney(net(lines), currency, locale)}</span></div>
          </div>
        </Card>
      ) : null}

      {!readOnly && !isEmpty ? (
        <Button variant="primary" block style={{ marginTop: 'var(--s-5)' }} onClick={() => setClosing(true)}>
          <Lock size={18} /> {t('month.markDone', locale)}
        </Button>
      ) : null}

      <Button variant="subtle" block style={{ marginTop: 'var(--s-3)' }} onClick={() => setMoreOpen(true)}>
        {t('month.moreOptions', locale)}
      </Button>

      <AmountPadSheet
        open={Boolean(pad)}
        type={pad?.type ?? 'in'}
        currencyCode={currency}
        locale={locale}
        categories={categories}
        initial={pad?.edit ?? null}
        onClose={() => setPad(null)}
        onSave={(d) => void save(d)}
        onLongPressCategory={(c) => { setPad(null); setEditCat(c) }}
        onDelete={pad?.edit ? () => { const l = pad.edit!; setPad(null); void remove(l) } : undefined}
      />

      <CategoryEditSheet category={editCat} locale={locale} onClose={() => setEditCat(null)} onSaved={refresh} />

      {prevYm ? (
        <LastMonthChecklist
          open={checklist}
          previousYearMonth={prevYm}
          previousLines={prevLines}
          categories={categories}
          locale={locale}
          onClose={() => setChecklist(false)}
          onAdd={async (items) => {
            await addLines(month.id, items)
            for (const it of items) await touchCategory(it.categoryId, it.amountCents)
            await refresh()
          }}
        />
      ) : null}

      <CloseMonthFlow
        open={closing}
        month={month}
        lines={lines}
        currencyCode={currency}
        locale={locale}
        onClose={() => setClosing(false)}
        onSaveReconcile={async (i, o) => { await setMonthReconcile(month.id, i, o); await refresh() }}
        onConfirm={async () => { await setMonthStatus(month.id, 'done'); await refresh() }}
      />

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('month.moreOptions', locale)}>
        <div className="stack">
          {readOnly ? (
            <Button block onClick={async () => { await setMonthStatus(month.id, 'open'); await refresh(); setMoreOpen(false) }}>
              <LockOpen size={18} /> {t('month.reopen', locale)}
            </Button>
          ) : null}
          {!readOnly && !isEmpty && !mismatch && (month.reconcileInCents !== null || month.reconcileOutCents !== null) && month.status !== 'checked' ? (
            <Button block onClick={async () => { await setMonthStatus(month.id, 'checked'); await refresh(); setMoreOpen(false) }}>
              {t('status.checked', locale)}
            </Button>
          ) : null}
          <LinkButton to={`/report/month/${yearMonth}`} block>
            <Printer size={18} /> {t('more.printMonth', locale)}
          </LinkButton>
        </div>
      </Sheet>
    </ScreenShell>
  )
}
