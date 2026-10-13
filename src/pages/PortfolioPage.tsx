import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Sparkline } from '../components/charts'
import { formatMoney, monthlySeries, net, yearMonthsBack } from '../domain/calc'
import type { LineItem, MonthRecord } from '../domain/types'
import { Card, LinkButton } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useAppData } from '../storage/AppDataContext'
import { getWorkingYearMonthFromSettings } from '../storage/workingMonth'
import { getLinesGrouped, listMonths } from '../storage/repository'

type PropertyRow = {
  propertyId: string
  name: string
  color: string
  currencyCode: string
  netCents: number
  series: ReturnType<typeof monthlySeries>
}

export function PortfolioPage() {
  const { settings, properties, setActiveProperty } = useAppData()
  const locale = settings.locale
  const navigate = useNavigate()
  const [rows, setRows] = useState<PropertyRow[]>([])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const built: PropertyRow[] = []
      for (const p of properties) {
        const ym = getWorkingYearMonthFromSettings(settings, p.id)
        const last6 = yearMonthsBack(ym, 6)
        const months: MonthRecord[] = await listMonths(p.id)
        const linesByMonthId: Map<string, LineItem[]> = await getLinesGrouped(p.id)
        const byYm = new Map<string, MonthRecord>()
        for (const m of months) byYm.set(m.yearMonth, m)
        const series = monthlySeries(last6, byYm, linesByMonthId)
        const m = byYm.get(ym)
        const lines = m ? (linesByMonthId.get(m.id) ?? []) : []
        built.push({
          propertyId: p.id,
          name: p.name,
          color: p.color,
          currencyCode: p.currencyCode,
          netCents: net(lines),
          series,
        })
      }
      if (!cancelled) setRows(built)
    })()
    return () => {
      cancelled = true
    }
  }, [properties, settings])

  return (
    <ScreenShell>
      <LinkButton to="/" variant="subtle" style={{ marginBottom: 'var(--s-3)', paddingLeft: 0 }}>
        <ArrowLeft size={18} /> {t('nav.home', locale)}
      </LinkButton>
      <h1 className="title">{t('portfolio.title', locale)}</h1>
      <p className="sub">{t('portfolio.sub', locale)}</p>

      <div className="stack">
        {rows.map((r) => (
          <Card key={r.propertyId}>
            <button
              type="button"
              className="line"
              style={{ width: '100%', border: 'none', background: 'transparent', textAlign: 'left', cursor: 'pointer', padding: 0 }}
              onClick={() => {
                setActiveProperty(r.propertyId)
                navigate('/')
              }}
            >
              <span className="topbar__dot" style={{ background: r.color, flex: 'none' }} />
              <span className="grow">
                <span className="line__title" style={{ display: 'block' }}>
                  {r.name}
                </span>
                <span className="line__note">{t('portfolio.thisMonth', locale)}</span>
              </span>
              <Sparkline series={r.series} />
              <span className={`money ${r.netCents < 0 ? 'money--out' : ''}`}>{formatMoney(r.netCents, r.currencyCode, locale)}</span>
            </button>
          </Card>
        ))}
      </div>
    </ScreenShell>
  )
}
