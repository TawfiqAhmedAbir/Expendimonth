import { ArrowRight, Layers, Minus, Plus } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AmountKeypadSheet } from '../components/AmountKeypad'
import { AmountPadSheet, type AmountPadResult } from '../components/AmountPadSheet'
import { MoneyFlowBar } from '../components/MoneyFlowBar'
import { MonthStartSheet } from '../components/MonthStartSheet'
import { ReminderBanner } from '../components/ReminderBanner'
import { standingLinePayload } from '../components/StandingItemsRow'
import { useToast } from '../components/Toast'
import { getCategoryLabel } from '../domain/categories'
import {
  averageMonthlyBurnCents,
  biggestCategoryChange,
  cashBalanceThrough,
  closedMonthStreak,
  compareNetToPreviousMonth,
  currentYearMonth,
  defaultOccurredOn,
  formatMoney,
  formatYearMonthLabel,
  monthlySeries,
  mostOverdueStanding,
  net,
  previousYearMonth,
  runwayMonths,
  standingAmountCents,
  totalIn,
  totalOut,
  visibleStatus,
  yearMonthsBack,
  type CategoryChange,
} from '../domain/calc'
import { Badge, Button, Card, LinkButton, ProgressBar } from '../design-kit/Primitives'
import { useCountUp } from '../design-kit/motion'
import { ScreenShell } from '../design-kit/ScreenShell'
import { useMonthLineActions } from '../hooks/useMonthLineActions'
import { useMonthStart } from '../hooks/useMonthStart'
import { t } from '../i18n'
import { touchCategory } from '../storage/categories'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'
import { evaluateReminders, fireSystemNotification } from '../storage/reminders'
import { addLine, addLines, getOrCreateMonth } from '../storage/repository'

function categoryTone(change: CategoryChange): string {
  const up = change.deltaCents > 0
  const better = change.type === 'in' ? up : !up
  return better ? 'insight--positive' : 'insight--negative'
}

function relativeDay(ts: number, locale: string): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days <= 0) return t('time.today', locale)
  if (days === 1) return t('time.yesterday', locale)
  return t('time.daysAgo', locale, { n: String(days) })
}

export function HomePage() {
  const property = useActiveProperty()
  const { settings, properties, months, monthsByYearMonth, linesByMonthId, categories, refresh, updateSettings } = useAppData()
  const { saveLine, addPrefilledLine } = useMonthLineActions(property.id, settings.locale)
  const { showToast } = useToast()
  const locale = settings.locale
  const currency = property.currencyCode
  const ym = currentYearMonth()
  const month = monthsByYearMonth.get(ym)
  const [pad, setPad] = useState<'in' | 'out' | null>(null)
  const [counting, setCounting] = useState(false)
  const [reminderDismissed, setReminderDismissed] = useState(false)
  const start = useMonthStart(property.id, ym)

  useEffect(() => {
    if (!month) void getOrCreateMonth(property.id, ym).then(() => refresh())
  }, [month, property.id, ym, refresh])

  const lines = month ? (linesByMonthId.get(month.id) ?? []) : []
  const inC = totalIn(lines)
  const outC = totalOut(lines)
  const netC = net(lines)
  const netAnimated = useCountUp(netC)
  const isEmpty = lines.length === 0

  const prevYm = previousYearMonth(ym)
  const prevLines = useMemo(() => {
    if (!prevYm) return []
    const prev = monthsByYearMonth.get(prevYm)
    return prev ? (linesByMonthId.get(prev.id) ?? []) : []
  }, [prevYm, monthsByYearMonth, linesByMonthId])
  const prevIn = totalIn(prevLines)
  const prevOut = totalOut(prevLines)
  const flowScale = Math.max(inC, prevIn, 1)

  const insight = useMemo(() => {
    const prevYm = previousYearMonth(ym)
    const prev = prevYm ? monthsByYearMonth.get(prevYm) : undefined
    if (!prev || isEmpty) return null
    const prevLines = linesByMonthId.get(prev.id) ?? []
    if (prevLines.length === 0) return null
    return compareNetToPreviousMonth(netC, net(prevLines))
  }, [ym, monthsByYearMonth, linesByMonthId, netC, isEmpty])

  const last = useMemo(() => {
    let latest: (typeof lines)[number] | null = null
    for (const l of lines) if (!latest || l.createdAt > latest.createdAt) latest = l
    return latest
  }, [lines])

  const status = visibleStatus(month?.status ?? 'empty')
  const haveNow = cashBalanceThrough([...monthsByYearMonth.values()], linesByMonthId, property.openingBalanceCents, ym, property.openingAsOf ?? null)
  const due = useMemo(() => mostOverdueStanding(categories, lines), [categories, lines])

  const categoryMove = useMemo(() => {
    const prevYm = previousYearMonth(ym)
    const prev = prevYm ? monthsByYearMonth.get(prevYm) : undefined
    if (!prev) return null
    return biggestCategoryChange(lines, linesByMonthId.get(prev.id) ?? [])
  }, [ym, monthsByYearMonth, linesByMonthId, lines])

  const series = useMemo(() => monthlySeries(yearMonthsBack(ym, 12), monthsByYearMonth, linesByMonthId), [ym, monthsByYearMonth, linesByMonthId])
  const burn = averageMonthlyBurnCents(series)
  const runway = runwayMonths(haveNow, burn)
  const streak = closedMonthStreak(months, property.id, ym)

  const reminder = useMemo(() => {
    if (reminderDismissed) return null
    return evaluateReminders({ settings, locale, months, linesByMonthId })
  }, [reminderDismissed, settings, locale, months, linesByMonthId])

  useEffect(() => {
    if (!reminder || !settings.remindersEnabled) return
    fireSystemNotification(reminder.text)
    updateSettings({ reminderLastFiredAt: Date.now() })
  }, [reminder, settings.remindersEnabled, updateSettings])

  function tryOpenPad(type: 'in' | 'out') {
    if (month?.status === 'done') {
      return
    }
    setPad(type)
  }

  async function saveCount(counted: number) {
    const m = month ?? (await getOrCreateMonth(property.id, ym))
    const delta = counted - haveNow
    setCounting(false)
    if (delta === 0) {
      showToast({ message: t('cash.same', locale) })
      return
    }
    await addLine(m.id, {
      type: 'adjust',
      amountCents: delta,
      categoryId: '',
      note: '',
      occurredOn: defaultOccurredOn(ym),
    })
    await refresh()
    showToast({ message: t('line.saved', locale) })
  }

  async function addDue() {
    if (!due) return
    const amount = standingAmountCents(due)
    if (amount === null || month?.status === 'done') return
    const m = month ?? (await getOrCreateMonth(property.id, ym))
    await addPrefilledLine(m, standingLinePayload(due, amount, ym))
  }

  async function confirmStart(picked: typeof start.items) {
    const m = month ?? (await getOrCreateMonth(property.id, ym))
    await addLines(m.id, picked.map((item) => ({
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

  async function onSave(data: AmountPadResult) {
    const m = month ?? (await getOrCreateMonth(property.id, ym))
    if (!month) await refresh()
    await saveLine(data, { yearMonth: ym, month: m })
    setPad(null)
  }

  return (
    <ScreenShell showSwitcher>
      <p className="eyebrow">{t('home.greeting', locale, { name: settings.userName })}</p>
      <div className="row row--between" style={{ marginBottom: 'var(--s-4)' }}>
        <h1 className="title" style={{ margin: 0 }}>{formatYearMonthLabel(ym, locale)}</h1>
        <div className="row" style={{ gap: 'var(--s-2)' }}>
          {streak >= 2 ? <Badge status="done">{t('streak.badge', locale, { n: String(streak) })}</Badge> : null}
          <Badge status={status}>{t(`status.${status}`, locale)}</Badge>
        </div>
      </div>

      {reminder ? (
        <ReminderBanner text={reminder.text} onDismiss={() => setReminderDismissed(true)} />
      ) : null}

      {due && month?.status !== 'done' ? (
        <div className="insight insight--warn row row--between" style={{ marginBottom: 'var(--s-4)' }}>
          <span>{t(due.standingType === 'in' ? 'expected.missingIn' : 'expected.missingOut', locale, { category: due.label })}</span>
          <Button size="sm" variant="primary" onClick={() => void addDue()}>
            {t('expected.add', locale, { amount: formatMoney(standingAmountCents(due) ?? 0, currency, locale) })}
          </Button>
        </div>
      ) : null}

      <Card>
        {!isEmpty ? (
          <MoneyFlowBar
            inCents={inC}
            outCents={outC}
            scaleInCents={flowScale}
            label={t('home.thisMonth', locale)}
            locale={locale}
            currencyCode={currency}
          />
        ) : (
          <p className="muted" style={{ margin: 0, textAlign: 'center' }}>{t('home.noActivity', locale)}</p>
        )}
        {!isEmpty ? (
          <p className={`money money--hero${netC < 0 ? ' money--out' : ''}`} style={{ textAlign: 'center', margin: 'var(--s-4) 0 0' }}>
            {formatMoney(netAnimated, currency, locale)}
          </p>
        ) : null}
        {!isEmpty && prevIn > 0 ? (
          <div style={{ marginTop: 'var(--s-5)' }}>
            <MoneyFlowBar
              inCents={prevIn}
              outCents={prevOut}
              scaleInCents={flowScale}
              label={t('home.compareLast', locale)}
              locale={locale}
              currencyCode={currency}
              compact
            />
          </div>
        ) : null}
        <div className="totals" style={{ marginTop: 'var(--s-4)' }}>
          <div className="totals__row" style={{ fontWeight: 800 }}>
            <span>{t('money.haveNow', locale)}</span>
            <span className="money">{formatMoney(haveNow, currency, locale)}</span>
          </div>
          {month?.status !== 'done' ? (
            <Button size="sm" onClick={() => setCounting(true)} style={{ marginTop: 'var(--s-3)' }}>{t('cash.correct', locale)}</Button>
          ) : null}
        </div>
        {runway !== null ? (
          <div style={{ marginTop: 'var(--s-4)' }}>
            <p className="sub" style={{ margin: '0 0 var(--s-2)' }}>
              {t('runway.body', locale, { n: String(runway) })}
            </p>
            <ProgressBar value={Math.min(runway, 12)} max={12} label={t('runway.body', locale, { n: String(runway) })} />
          </div>
        ) : null}
        {insight || categoryMove ? (
          <details className="disclosure" style={{ marginTop: 'var(--s-4)' }}>
            <summary className="disclosure__summary">{t('home.insightsSummary', locale)}</summary>
            <div className="disclosure__body">
              {insight ? (
                <div className={`insight ${insight.better ? 'insight--positive' : 'insight--negative'}`}>
                  {t('home.vsLast', locale, {
                    amount: formatMoney(Math.abs(insight.deltaCents), currency, locale),
                    direction: insight.better ? t('home.better', locale) : t('home.worse', locale),
                  })}
                </div>
              ) : null}
              {categoryMove ? (
                <div className={`insight ${categoryTone(categoryMove)}`}>
                  {t(categoryMove.deltaCents > 0 ? 'home.categoryUp' : 'home.categoryDown', locale, {
                    category: getCategoryLabel(categoryMove.categoryId, categories),
                    amount: formatMoney(Math.abs(categoryMove.deltaCents), currency, locale),
                  })}
                </div>
              ) : null}
            </div>
          </details>
        ) : null}
        <p className="caption" style={{ margin: 'var(--s-4) 0 0', textAlign: 'center' }}>
          {last
            ? t('home.lastActivity', locale, {
                amount: formatMoney(Math.abs(last.amountCents), currency, locale),
                category: last.type === 'adjust'
                  ? t('cash.correction', locale)
                  : last.type === 'transfer'
                    ? t(last.transferDirection === 'in' ? 'transfer.fromName' : 'transfer.toName', locale, {
                        name: properties.find((p) => p.id === last.counterpartyPropertyId)?.name ?? '',
                      })
                    : getCategoryLabel(last.categoryId, categories),
                when: relativeDay(last.createdAt, locale),
              })
            : t('home.noActivity', locale)}
        </p>
      </Card>

      <div className="row" style={{ marginTop: 'var(--s-4)' }}>
        <Button variant="in" className="grow" onClick={() => tryOpenPad('in')} disabled={month?.status === 'done'}>
          <Plus size={20} /> {t('month.addIn', locale)}
        </Button>
        <Button variant="out" className="grow" onClick={() => tryOpenPad('out')} disabled={month?.status === 'done'}>
          <Minus size={20} /> {t('month.addOut', locale)}
        </Button>
      </div>
      {month?.status === 'done' ? (
        <p className="caption" style={{ textAlign: 'center', marginTop: 'var(--s-2)' }}>
          {t('home.monthClosed', locale)}{' '}
          <LinkButton to={`/month/${ym}`} variant="ghost" style={{ display: 'inline', padding: 0 }}>
            {t('month.reopen', locale)}
          </LinkButton>
        </p>
      ) : null}

      {isEmpty && !settings.coachDismissed ? (
        <Card variant="flat" style={{ marginTop: 'var(--s-4)' }}>
          <h2 className="section" style={{ marginTop: 0 }}>{t('home.coachTitle', locale)}</h2>
          <p className="sub">{t('home.coachBody', locale)}</p>
          <div className="row">
            <LinkButton to={`/month/${ym}`} variant="primary" className="grow">
              {t('home.coachCta', locale)} <ArrowRight size={18} />
            </LinkButton>
            <Button variant="subtle" onClick={() => updateSettings({ coachDismissed: true })}>
              {t('home.coachDismiss', locale)}
            </Button>
          </div>
        </Card>
      ) : (
        <LinkButton to={`/month/${ym}`} variant="primary" block style={{ marginTop: 'var(--s-4)' }}>
          {t('home.openMonth', locale)} <ArrowRight size={18} />
        </LinkButton>
      )}

      {properties.length > 1 ? (
        <LinkButton to="/portfolio" variant="ghost" block style={{ marginTop: 'var(--s-4)' }}>
          <Layers size={18} /> {t('home.portfolioLink', locale)}
        </LinkButton>
      ) : null}

      <AmountKeypadSheet
        open={counting}
        title={t('cash.countTitle', locale)}
        locale={locale}
        currencyCode={currency}
        onClose={() => setCounting(false)}
        onSave={(cents) => void saveCount(cents)}
      />

      <MonthStartSheet
        open={start.open}
        locale={locale}
        categories={categories}
        items={start.items}
        onClose={() => start.markSeen()}
        onConfirm={(picked) => void confirmStart(picked)}
      />

      <AmountPadSheet
        open={pad !== null}
        type={pad ?? 'in'}
        currencyCode={currency}
        locale={locale}
        categories={categories}
        yearMonth={ym}
        isMonthClosed={(m) => monthsByYearMonth.get(m)?.status === 'done'}
        onClose={() => setPad(null)}
        onSave={(d) => void onSave(d)}
      />
    </ScreenShell>
  )
}
