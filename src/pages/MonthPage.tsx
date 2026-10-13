import { ArrowLeft, ListChecks, Lock, LockOpen, Minus, Plus, Printer, Share2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { AmountPadSheet, type AmountPadResult } from '../components/AmountPadSheet'
import { CloseMonthFlow } from '../components/CloseMonthFlow'
import { HeroTotals } from '../components/HeroTotals'
import { LastMonthChecklist } from '../components/LastMonthChecklist'
import { LineItemRow } from '../components/LineItemRow'
import { MonthCalendarStrip } from '../components/MonthCalendarStrip'
import { StandingItemsRow, standingLinePayload } from '../components/StandingItemsRow'
import { useToast } from '../components/Toast'
import { InOutBars } from '../components/charts'
import { CategoryEditSheet } from './CategoriesPage'
import { getCategoryLabel } from '../domain/categories'
import { buildMonthShareText, sharePlainText } from '../domain/shareText'
import {
  cashBalanceThrough,
  categorySpend,
  clampDateToMonth,
  formatMoney,
  formatYearMonthLabel,
  net,
  previousYearMonth,
  reconcileMismatch,
  totalIn,
  totalOut,
} from '../domain/calc'
import type { LineItem, LineType, UserCategory } from '../domain/types'
import { Badge, Button, Card, Chip, LinkButton, ProgressBar, Sheet } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { useMonthLineActions } from '../hooks/useMonthLineActions'
import { t } from '../i18n'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'
import { touchCategory } from '../storage/categories'
import { addLines, getOrCreateMonth, setMonthReconcile, setMonthStatus } from '../storage/repository'

export function MonthPage() {
  const { yearMonth = '' } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const property = useActiveProperty()
  const { settings, monthsByYearMonth, linesByMonthId, categories, refresh } = useAppData()
  const { showToast } = useToast()
  const { saveLine, removeLine, addPrefilledLine } = useMonthLineActions(property.id, settings.locale)
  const locale = settings.locale
  const currency = property.currencyCode
  const linesRef = useRef<HTMLDivElement>(null)

  const month = monthsByYearMonth.get(yearMonth)
  const lines = useMemo(() => (month ? (linesByMonthId.get(month.id) ?? []) : []), [month, linesByMonthId])

  const filterCategory = searchParams.get('category')
  const filterDay = searchParams.get('day')

  const [pad, setPad] = useState<{ type: LineType; edit?: LineItem } | null>(null)
  const [checklist, setChecklist] = useState(false)
  const [closing, setClosing] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [editCat, setEditCat] = useState<UserCategory | null>(null)
  const [selectedDay, setSelectedDay] = useState<string | null>(filterDay)

  useEffect(() => {
    if (!month && yearMonth) void getOrCreateMonth(property.id, yearMonth).then(() => refresh())
  }, [month, yearMonth, property.id, refresh])

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
  const haveNow = cashBalanceThrough([...monthsByYearMonth.values()], linesByMonthId, property.openingBalanceCents, yearMonth)

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

  async function shareMonth() {
    const text = buildMonthShareText(property, yearMonth, month, lines, categories, locale)
    const ok = await sharePlainText(text, property.name)
    if (ok) showToast({ message: t('share.done', locale) })
    setMoreOpen(false)
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

      {readOnly ? (
        <div className="insight" style={{ marginBottom: 'var(--s-4)' }}>
          <p style={{ margin: '0 0 var(--s-3)' }}>{t('month.lockedHint', locale)}</p>
          <Button block onClick={() => { void setMonthStatus(month.id, 'open').then(() => refresh()) }}>
            <LockOpen size={18} /> {t('month.reopen', locale)}
          </Button>
        </div>
      ) : null}

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

      {!readOnly ? (
        <StandingItemsRow
          categories={categories}
          locale={locale}
          onAdd={(cat, amount) => void addPrefilledLine(month, standingLinePayload(cat, amount, yearMonth))}
        />
      ) : null}

      {!readOnly && prevLines.length > 0 ? (
        <Button block onClick={() => setChecklist(true)} style={{ marginBottom: 'var(--s-4)' }}>
          <ListChecks size={18} /> {t('month.startFromLast', locale)}
        </Button>
      ) : null}

      {!isEmpty ? (
        <Card variant="flat" style={{ marginBottom: 'var(--s-4)' }}>
          <MonthCalendarStrip
            yearMonth={yearMonth}
            lines={lines}
            currencyCode={currency}
            locale={locale}
            selectedDay={selectedDay}
            onSelectDay={setDayFilter}
          />
        </Card>
      ) : null}

      {budgetRows.length > 0 ? (
        <Card variant="flat" style={{ marginBottom: 'var(--s-4)' }}>
          <h2 className="section" style={{ marginTop: 0 }}>{t('budget.title', locale)}</h2>
          <div className="stack">
            {budgetRows.map(({ cat, spent, budget }) => (
              <div key={cat.id}>
                <div className="row row--between" style={{ marginBottom: 'var(--s-1)' }}>
                  <span>{cat.label}</span>
                  <span className="caption">
                    {formatMoney(spent, currency, locale)} / {formatMoney(budget, currency, locale)}
                  </span>
                </div>
                <ProgressBar value={spent} max={budget} over={spent > budget} label={cat.label} />
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      <Card variant="flat" style={{ marginBottom: 'var(--s-4)' }}>
        <div className="row row--between">
          <span>{t('money.haveNow', locale)}</span>
          <strong className="money">{formatMoney(haveNow, currency, locale)}</strong>
        </div>
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
          {visibleLines.map((line) => (
            <LineItemRow
              key={line.id}
              line={line}
              categories={categories}
              currencyCode={currency}
              locale={locale}
              readOnly={readOnly}
              highlight={filterCategory === line.categoryId}
              onEdit={() => setPad({ type: line.type, edit: line })}
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
