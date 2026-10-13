import { ArrowRight, BarChart3, CalendarDays, Layers, Minus, Plus, Wallet } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { AmountPadSheet, type AmountPadResult } from '../components/AmountPadSheet'
import { HeroTotals } from '../components/HeroTotals'
import { ReminderBanner } from '../components/ReminderBanner'
import { getCategoryLabel } from '../domain/categories'
import {
  averageMonthlyOutCents,
  biggestCategoryChange,
  cashBalanceThrough,
  closedMonthStreak,
  compareNetToPreviousMonth,
  currentYearMonth,
  formatMoney,
  formatYearMonthLabel,
  monthlySeries,
  net,
  previousYearMonth,
  runwayMonths,
  totalIn,
  totalOut,
  yearMonthsBack,
  type CategoryChange,
} from '../domain/calc'
import { Badge, Button, Card, LinkButton, ProgressBar, StatRing, Tile } from '../design-kit/Primitives'
import { useCountUp } from '../design-kit/motion'
import { ScreenShell } from '../design-kit/ScreenShell'
import { useMonthLineActions } from '../hooks/useMonthLineActions'
import { t } from '../i18n'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'
import { evaluateReminders, fireSystemNotification } from '../storage/reminders'
import { getOrCreateMonth } from '../storage/repository'

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
  const { saveLine } = useMonthLineActions(property.id, settings.locale)
  const locale = settings.locale
  const currency = property.currencyCode
  const ym = currentYearMonth()
  const month = monthsByYearMonth.get(ym)
  const [pad, setPad] = useState<'in' | 'out' | null>(null)
  const [reminderDismissed, setReminderDismissed] = useState(false)

  useEffect(() => {
    if (!month) void getOrCreateMonth(property.id, ym).then(() => refresh())
  }, [month, property.id, ym, refresh])

  const lines = month ? (linesByMonthId.get(month.id) ?? []) : []
  const inC = totalIn(lines)
  const outC = totalOut(lines)
  const netC = net(lines)
  const netAnimated = useCountUp(netC)
  const ratio = inC > 0 ? outC / inC : 0
  const isEmpty = lines.length === 0

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

  const status = month?.status ?? 'empty'
  const haveNow = cashBalanceThrough([...monthsByYearMonth.values()], linesByMonthId, property.openingBalanceCents, ym)

  const categoryMove = useMemo(() => {
    const prevYm = previousYearMonth(ym)
    const prev = prevYm ? monthsByYearMonth.get(prevYm) : undefined
    if (!prev) return null
    return biggestCategoryChange(lines, linesByMonthId.get(prev.id) ?? [])
  }, [ym, monthsByYearMonth, linesByMonthId, lines])

  const series = useMemo(() => monthlySeries(yearMonthsBack(ym, 12), monthsByYearMonth, linesByMonthId), [ym, monthsByYearMonth, linesByMonthId])
  const avgOut = averageMonthlyOutCents(series)
  const runway = runwayMonths(haveNow, avgOut)
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

      <Card>
        <div style={{ display: 'grid', placeItems: 'center', padding: 'var(--s-2) 0 var(--s-4)' }}>
          <StatRing ratio={isEmpty ? 0 : ratio} tone={ratio > 1 ? 'out' : 'accent'} size={200}>
            <span className="caption">{t('money.leftThisMonth', locale)}</span>
            <span className={`money money--hero ${netC < 0 ? 'money--out' : ''}`} style={{ fontSize: '2rem' }}>
              {formatMoney(netAnimated, currency, locale)}
            </span>
            {!isEmpty && inC > 0 ? (
              <span className="caption">{t('money.spentOfIn', locale, { pct: String(Math.round(ratio * 100)) })}</span>
            ) : null}
          </StatRing>
        </div>
        <HeroTotals lines={lines} currencyCode={currency} locale={locale} showNet={false} />
        <div className="totals" style={{ marginTop: 'var(--s-3)' }}>
          <div className="totals__row" style={{ fontWeight: 800 }}>
            <span>{t('money.haveNow', locale)}</span>
            <span className="money">{formatMoney(haveNow, currency, locale)}</span>
          </div>
        </div>
        {runway !== null ? (
          <div style={{ marginTop: 'var(--s-4)' }}>
            <p className="sub" style={{ margin: '0 0 var(--s-2)' }}>
              {t('runway.body', locale, { n: String(runway) })}
            </p>
            <ProgressBar value={Math.min(runway, 12)} max={12} label={t('runway.body', locale, { n: String(runway) })} />
          </div>
        ) : null}
        {insight ? (
          <div className={`insight ${insight.better ? 'insight--positive' : 'insight--negative'}`} style={{ marginTop: 'var(--s-4)' }}>
            {t('home.vsLast', locale, {
              amount: formatMoney(Math.abs(insight.deltaCents), currency, locale),
              direction: insight.better ? t('home.better', locale) : t('home.worse', locale),
            })}
          </div>
        ) : null}
        {categoryMove ? (
          <div className={`insight ${categoryTone(categoryMove)}`} style={{ marginTop: 'var(--s-3)' }}>
            {t(categoryMove.deltaCents > 0 ? 'home.categoryUp' : 'home.categoryDown', locale, {
              category: getCategoryLabel(categoryMove.categoryId, categories),
              amount: formatMoney(Math.abs(categoryMove.deltaCents), currency, locale),
            })}
          </div>
        ) : null}
        <p className="caption" style={{ margin: 'var(--s-4) 0 0', textAlign: 'center' }}>
          {last
            ? t('home.lastActivity', locale, {
                amount: formatMoney(last.amountCents, currency, locale),
                category: getCategoryLabel(last.categoryId, categories),
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

      <div className="tiles" style={{ marginTop: 'var(--s-5)' }}>
        <Tile to={`/month/${ym}`} icon={<Wallet size={24} />} label={t('home.tileMonth', locale)} hint={t('home.tileMonthHint', locale)} />
        <Tile to="/months" icon={<CalendarDays size={24} />} label={t('home.tileHistory', locale)} hint={t('home.tileHistoryHint', locale)} />
        <Tile to="/insights" icon={<BarChart3 size={24} />} label={t('home.tileInsights', locale)} hint={t('home.tileInsightsHint', locale)} />
        {properties.length > 1 ? (
          <Tile to="/portfolio" icon={<Layers size={24} />} label={t('portfolio.tile', locale)} hint={t('portfolio.tileHint', locale)} />
        ) : null}
      </div>

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
