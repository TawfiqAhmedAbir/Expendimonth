import { ArrowLeft, ListChecks, Lock, LockOpen, Minus, Plus, Printer, Share2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AmountKeypadSheet } from '../components/AmountKeypad'
import { AmountPadSheet, type AmountPadResult } from '../components/AmountPadSheet'
import { CloseMonthFlow } from '../components/CloseMonthFlow'
import { MoneyFlowBar } from '../components/MoneyFlowBar'
import { LastMonthChecklist } from '../components/LastMonthChecklist'
import { LineItemRow } from '../components/LineItemRow'
import { MonthStepper } from '../components/MonthStepper'
import { MonthCalendarStrip } from '../components/MonthCalendarStrip'
import { MonthStartSheet } from '../components/MonthStartSheet'
import { StandingItemsRow, standingLinePayload } from '../components/StandingItemsRow'
import { TransferSheet } from '../components/TransferSheet'
import { useToast } from '../components/Toast'
import { CategoryEditSheet } from './CategoriesPage'
import { getCategoryLabel } from '../domain/categories'
import { buildMonthShareText, sharePlainText } from '../domain/shareText'
import {
  cashBalanceThrough,
  categorySpend,
  clampDateToMonth,
  defaultOccurredOn,
  formatMoney,
  formatYearMonthLabel,
  isFlowLine,
  net,
  previousYearMonth,
  reconcileMismatch,
  totalIn,
  totalOut,
  visibleStatus,
} from '../domain/calc'
import type { LineItem, UserCategory } from '../domain/types'
import { Badge, Button, Card, Chip, LinkButton, ProgressBar, Sheet } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { useMonthLineActions } from '../hooks/useMonthLineActions'
import { useMonthStart } from '../hooks/useMonthStart'
import { useWorkingYearMonth } from '../hooks/useWorkingYearMonth'
import { t } from '../i18n'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'
import { touchCategory } from '../storage/categories'
import { addLine, addLines, addTransfer, getOrCreateMonth, setMonthReconcile, setMonthStatus } from '../storage/repository'

export function MonthPage() {
  const { yearMonth = '' } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const property = useActiveProperty()
  const [, setWorkingYm] = useWorkingYearMonth(property.id)
  const { settings, properties, monthsByYearMonth, linesByMonthId, categories, refresh } = useAppData()
  const { showToast } = useToast()
  const { saveLine, removeLine, addPrefilledLine } = useMonthLineActions(property.id, settings.locale)
  const locale = settings.locale
  const currency = property.currencyCode
  const linesRef = useRef<HTMLDivElement>(null)

  const month = monthsByYearMonth.get(yearMonth)
  const lines = useMemo(() => (month ? (linesByMonthId.get(month.id) ?? []) : []), [month, linesByMonthId])

  const filterCategory = searchParams.get('category')
  const filterDay = searchParams.get('day')

  const [pad, setPad] = useState<{ type: 'in' | 'out'; edit?: LineItem } | null>(null)
  const [checklist, setChecklist] = useState(false)
  const [closing, setClosing] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [counting, setCounting] = useState(false)
  const [moving, setMoving] = useState(false)
  const [removing, setRemoving] = useState<LineItem | null>(null)
  const [editCat, setEditCat] = useState<UserCategory | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(filterDay)
  const start = useMonthStart(property.id, yearMonth)

  useEffect(() => {
    if (!month && yearMonth) void getOrCreateMonth(property.id, yearMonth).then(() => refresh())
  }, [month, yearMonth, property.id, refresh])

  useEffect(() => {
    if (yearMonth) setWorkingYm(yearMonth)
  }, [yearMonth, setWorkingYm])

  useEffect(() => {
    setSelectedDay(filterDay)
  }, [filterDay])

  useEffect(() => {
    if (filterCategory && linesRef.current) linesRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [filterCategory, month?.id])

  const prevYm = previousYearMonth(yearMonth)
  const prevMonth = prevYm ? monthsByYearMonth.get(prevYm) : undefined
  const prevLines = prevMonth ? (linesByMonthId.get(prevMonth.id) ?? []) : []

  const visibleLines = useMemo(() => {
    let list = lines
    if (filterCategory) list = list.filter((l) => l.categoryId === filterCategory)
    if (selectedDay) list = list.filter((l) => l.occurredOn === selectedDay)
    return list
  }, [lines, filterCategory, selectedDay])

  const budgetRows = useMemo(() => {
    return categories
      .filter((c) => c.budgetCents && c.budgetCents > 0)
      .map((c) => {
        const spent = categorySpend(lines, c.id, 'out')
        return { cat: c, spent, budget: c.budgetCents! }
      })
      .filter((r) => r.spent > 0 || r.budget > 0)
  }, [categories, lines])

  if (!month) return <ScreenShell><div className="skeleton" style={{ height: 240 }} /></ScreenShell>

  const readOnly = month.status === 'done'
  const isEmpty = lines.length === 0
  const mismatch = reconcileMismatch(month, lines)
  const haveNow = cashBalanceThrough([...monthsByYearMonth.values()], linesByMonthId, property.openingBalanceCents, yearMonth, property.openingAsOf ?? null)
  const flowLines = lines.filter(isFlowLine)
  const shownStatus = visibleStatus(month.status)

  function clearFilters() {
    setSearchParams({})
    setSelectedDay(null)
  }

  function setDayFilter(day: string | null) {
    setSelectedDay(day)
    const next = new URLSearchParams(searchParams)
    if (day) next.set('day', day)
    else next.delete('day')
    setSearchParams(next)
  }

  async function save(data: AmountPadResult) {
    await saveLine(data, { yearMonth, month: month!, editLine: pad?.edit })
    setPad(null)
  }

  async function saveCount(counted: number) {
    const delta = counted - haveNow
    setCounting(false)
    if (delta === 0) {
      showToast({ message: t('cash.same', locale) })
      return
    }
    await addLine(month!.id, {
      type: 'adjust',
      amountCents: delta,
      categoryId: '',
      note: '',
      occurredOn: defaultOccurredOn(yearMonth),
    })
    await refresh()
    showToast({ message: t('line.saved', locale) })
  }

  async function confirmStart(picked: typeof start.items) {
    await addLines(month!.id, picked.map((item) => ({
      type: item.type,
      amountCents: item.amountCents,
      categoryId: item.categoryId,
      note: item.note,
      occurredOn: item.occurredOn,
    })))
    for (const item of picked) await touchCategory(item.categoryId, item.amountCents)
    start.markSeen()
    await refresh()
  }

  async function moveMoney(toPropertyId: string, amountCents: number) {
    const result = await addTransfer({
      fromPropertyId: property.id,
      toPropertyId,
      yearMonth,
      amountCents,
      note: '',
    })
    setMoving(false)
    if (!result.ok) {
      showToast({ message: t(result.reason === 'currency' ? 'transfer.currency' : 'transfer.closed', locale) })
      return
    }
    await refresh()
    showToast({ message: t('transfer.saved', locale) })
  }

  async function shareMonth() {
    const names = new Map(properties.map((p) => [p.id, p.name]))
    const text = buildMonthShareText(property, yearMonth, month, lines, categories, locale, names)
    const ok = await sharePlainText(text, property.name)
    if (ok) showToast({ message: t('share.done', locale) })
    setMoreOpen(false)
  }

  return (
    <ScreenShell>
      <LinkButton to="/" variant="subtle" style={{ marginBottom: 'var(--s-2)', paddingLeft: 0 }}>
        <ArrowLeft size={18} /> {property.name}
      </LinkButton>
      <div className="row row--between" style={{ marginBottom: 'var(--s-2)' }}>
        <div>
          <h1 className="title" style={{ margin: 0 }}>{formatYearMonthLabel(yearMonth, locale)}</h1>
          <p className="caption" style={{ margin: 0 }}>{t('month.sub', locale)}</p>
        </div>
        <Badge status={mismatch && !readOnly ? 'warn' : shownStatus}>
          {readOnly ? <Lock size={14} /> : null}
          {mismatch && !readOnly ? t('months.filterMismatch', locale) : t(`status.${shownStatus}`, locale)}
        </Badge>
      </div>
      <MonthStepper
        yearMonth={yearMonth}
        locale={locale}
        minYearMonth={property.openingAsOf}
        onChange={(ym) => {
          navigate(`/month/${ym}`, { replace: true })
          void getOrCreateMonth(property.id, ym).then(() => refresh())
        }}
      />

      <div style={{ marginBottom: 'var(--s-4)' }} />

      {readOnly ? (
        <div className="insight" style={{ marginBottom: 'var(--s-4)' }}>
          <p style={{ margin: '0 0 var(--s-3)' }}>{t('month.lockedHint', locale)}</p>
          <Button block onClick={() => { void setMonthStatus(month.id, 'open').then(() => refresh()) }}>
            <LockOpen size={18} /> {t('month.reopen', locale)}
          </Button>
        </div>
      ) : null}

      {lines.length === 0 ? (
        <Card variant="flat">
          <p className="muted" style={{ margin: 0 }}>{t('month.emptyPrompt', locale)}</p>
        </Card>
      ) : flowLines.length > 0 ? (
        <Card className="month-hero">
          <MoneyFlowBar
            inCents={totalIn(lines)}
            outCents={totalOut(lines)}
            locale={locale}
            currencyCode={currency}
            label={formatYearMonthLabel(yearMonth, locale)}
          />
        </Card>
      ) : null}

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

      {!readOnly ? (
        <StandingItemsRow
          categories={categories}
          locale={locale}
          onAdd={(cat, amount) => void addPrefilledLine(month, standingLinePayload(cat, amount, yearMonth))}
        />
      ) : null}

      <Card variant="flat" style={{ marginBottom: 'var(--s-4)' }}>
        <div className="row row--between">
          <span>{t('money.haveNow', locale)}</span>
          <strong className="money">{formatMoney(haveNow, currency, locale)}</strong>
        </div>
        {!readOnly ? (
          <Button size="sm" onClick={() => setCounting(true)} style={{ marginTop: 'var(--s-3)' }}>{t('cash.correct', locale)}</Button>
        ) : null}
      </Card>

      {!isEmpty ? (
        <Card>
          <div ref={linesRef} />
          <div className="row row--between" style={{ marginBottom: 'var(--s-3)' }}>
            <h2 className="section" style={{ margin: 0 }}>{t('month.lines', locale)}</h2>
            {filterCategory || selectedDay ? (
              <Chip active onClick={clearFilters}>{t('filter.clear', locale)}</Chip>
            ) : null}
          </div>
          {filterCategory ? (
            <p className="caption" style={{ marginTop: 0 }}>
              {t('filter.category', locale, { name: getCategoryLabel(filterCategory, categories) })}
            </p>
          ) : null}
          {visibleLines.map((line, i) => (
            <LineItemRow
              key={line.id}
              enterIndex={i}
              line={line}
              categories={categories}
              currencyCode={currency}
              locale={locale}
              counterpartyName={properties.find((p) => p.id === line.counterpartyPropertyId)?.name}
              readOnly={readOnly}
              highlight={filterCategory === line.categoryId}
              onEdit={() => {
                if (line.type === 'adjust' || line.type === 'transfer') {
                  setRemoving(line)
                  return
                }
                setPad({ type: line.type, edit: line })
              }}
            />
          ))}
          {visibleLines.length === 0 ? <p className="muted">{t('filter.noLines', locale)}</p> : null}
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
        yearMonth={yearMonth}
        isMonthClosed={(ym) => monthsByYearMonth.get(ym)?.status === 'done'}
        initial={pad?.edit ?? null}
        onClose={() => setPad(null)}
        onSave={(d) => void save(d)}
        onLongPressCategory={(c) => { setPad(null); setEditCat(c) }}
        onDelete={pad?.edit ? () => { const l = pad.edit!; setPad(null); void removeLine(l, month) } : undefined}
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
            await addLines(month.id, items.map((it) => ({ ...it, occurredOn: clampDateToMonth(it.occurredOn, yearMonth) })))
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

      <AmountKeypadSheet
        open={counting}
        title={t('cash.countTitle', locale)}
        locale={locale}
        currencyCode={currency}
        onClose={() => setCounting(false)}
        onSave={(cents) => void saveCount(cents)}
      />

      <TransferSheet
        open={moving}
        locale={locale}
        currencyCode={currency}
        properties={properties}
        currentId={property.id}
        onClose={() => setMoving(false)}
        onMove={(toId, cents) => void moveMoney(toId, cents)}
      />

      <MonthStartSheet
        open={start.open}
        locale={locale}
        categories={categories}
        items={start.items}
        onClose={() => start.markSeen()}
        onConfirm={(picked) => void confirmStart(picked)}
      />

      <Sheet open={Boolean(removing)} onClose={() => setRemoving(null)} title={t('line.removeTitle', locale)}>
        {removing?.type === 'transfer' ? <p className="sub">{t('line.removePair', locale)}</p> : null}
        <Button
          variant="danger"
          block
          onClick={() => {
            const line = removing
            setRemoving(null)
            if (line) void removeLine(line, month)
          }}
        >
          {t('common.delete', locale)}
        </Button>
      </Sheet>

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title={t('month.moreOptions', locale)}>
        <div className="stack">
          {lines.length > 0 ? (
            <MonthCalendarStrip
              yearMonth={yearMonth}
              lines={lines}
              currencyCode={currency}
              locale={locale}
              selectedDay={selectedDay}
              onSelectDay={(day) => { setDayFilter(day); setMoreOpen(false) }}
            />
          ) : null}
          {budgetRows.length > 0 ? (
            <div>
              <h2 className="section" style={{ marginTop: 0 }}>{t('budget.title', locale)}</h2>
              <div className="stack">
                {budgetRows.map(({ cat, spent, budget }) => (
                  <div key={cat.id}>
                    <div className="row row--between" style={{ marginBottom: 'var(--s-1)' }}>
                      <span>{cat.label}</span>
                      <span className="caption">{formatMoney(spent, currency, locale)} / {formatMoney(budget, currency, locale)}</span>
                    </div>
                    <ProgressBar value={spent} max={budget} over={spent > budget} label={cat.label} />
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          {!readOnly && prevLines.length > 0 ? (
            <Button block onClick={() => { setMoreOpen(false); setChecklist(true) }}>
              <ListChecks size={18} /> {t('month.startFromLast', locale)}
            </Button>
          ) : null}
          {!readOnly && properties.length > 1 ? (
            <Button block onClick={() => { setMoreOpen(false); setMoving(true) }}>
              {t('transfer.action', locale)}
            </Button>
          ) : null}
          {readOnly ? (
            <Button block onClick={async () => { await setMonthStatus(month.id, 'open'); await refresh(); setMoreOpen(false) }}>
              <LockOpen size={18} /> {t('month.reopen', locale)}
            </Button>
          ) : null}
          <Button block onClick={() => void shareMonth()}>
            <Share2 size={18} /> {t('share.action', locale)}
          </Button>
          <LinkButton to={`/report/month/${yearMonth}`} block>
            <Printer size={18} /> {t('more.printMonth', locale)}
          </LinkButton>
        </div>
      </Sheet>
    </ScreenShell>
  )
}
