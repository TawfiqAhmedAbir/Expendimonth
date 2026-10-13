import { ArrowRight, BarChart3, CalendarDays, Wallet } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { HeroTotals } from '../components/HeroTotals'
import { getCategoryLabel } from '../domain/categories'
import {
  biggestCategoryChange,
  cashBalanceThrough,
  compareNetToPreviousMonth,
  currentYearMonth,
  formatMoney,
  formatYearMonthLabel,
  net,
  previousYearMonth,
  totalIn,
  totalOut,
  type CategoryChange,
} from '../domain/calc'
import { Badge, Button, Card, LinkButton, StatRing, Tile } from '../design-kit/Primitives'
import { useCountUp } from '../design-kit/motion'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'
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
  const { settings, monthsByYearMonth, linesByMonthId, categories, refresh, updateSettings } = useAppData()
  const locale = settings.locale
  const currency = property.currencyCode
  const ym = currentYearMonth()
  const month = monthsByYearMonth.get(ym)

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

  return (
    <ScreenShell showSwitcher>
      <p className="eyebrow">{t('home.greeting', locale, { name: settings.userName })}</p>
      <div className="row row--between" style={{ marginBottom: 'var(--s-4)' }}>
        <h1 className="title" style={{ margin: 0 }}>{formatYearMonthLabel(ym, locale)}</h1>
        <Badge status={status}>{t(`status.${status}`, locale)}</Badge>
      </div>

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
      </div>
    </ScreenShell>
  )
}
