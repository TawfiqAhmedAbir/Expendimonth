import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney, formatMoneyCompact, formatMonthShort, type SeriesPoint } from '../domain/calc'
import { t } from '../i18n'
import { useAppData } from '../storage/AppDataContext'

type ThemeColors = { in: string; out: string; accent: string; grid: string; ink3: string }

/** Reads CSS variables so Recharts (which needs literal colours) follows the theme. */
export function useThemeColors(): ThemeColors {
  const { settings } = useAppData()
  const [colors, setColors] = useState<ThemeColors>({ in: '#2b6b4f', out: '#c2553f', accent: '#1f4f5e', grid: '#e6ddd2', ink3: '#8a7f74' })
  useEffect(() => {
    const cs = getComputedStyle(document.documentElement)
    const read = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb
    setColors({
      in: read('--in', '#2b6b4f'),
      out: read('--out', '#c2553f'),
      accent: read('--accent', '#1f4f5e'),
      grid: read('--border', '#e6ddd2'),
      ink3: read('--ink-3', '#8a7f74'),
    })
  }, [settings.theme])
  return colors
}

type Common = { currencyCode: string; locale: string; height?: number }

export function InOutBars({ series, currencyCode, locale, height = 200, onSelect }: Common & { series: SeriesPoint[]; onSelect?: (ym: string) => void }) {
  const c = useThemeColors()
  const data = series.map((p) => ({ ym: p.yearMonth, name: formatMonthShort(p.yearMonth, locale), in: p.inCents / 100, out: p.outCents / 100 }))
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 4, left: -8, bottom: 0 }} onClick={(e) => {
          const ym = (e as { activePayload?: { payload?: { ym?: string } }[] })?.activePayload?.[0]?.payload?.ym
          if (ym && onSelect) onSelect(ym)
        }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: c.ink3 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: c.ink3 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => formatMoneyCompact(Math.round(v * 100), currencyCode, locale)} />
          <Tooltip
            cursor={{ fill: c.grid, opacity: 0.4 }}
            formatter={(value, name) => [
              formatMoney(Math.round(Number(value) * 100), currencyCode, locale),
              String(name) === 'in' ? t('money.in', locale) : t('money.out', locale),
            ]}
          />
          <Bar dataKey="in" fill={c.in} radius={[6, 6, 0, 0]} maxBarSize={28} />
          <Bar dataKey="out" fill={c.out} radius={[6, 6, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export function NetLine({ series, currencyCode, locale, height = 180 }: Common & { series: SeriesPoint[] }) {
  const c = useThemeColors()
  const data = series.map((p) => ({ name: formatMonthShort(p.yearMonth, locale), net: p.netCents / 100 }))
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={c.grid} />
          <XAxis dataKey="name" tick={{ fontSize: 11, fill: c.ink3 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: c.ink3 }} axisLine={false} tickLine={false} width={44} tickFormatter={(v: number) => formatMoneyCompact(Math.round(v * 100), currencyCode, locale)} />
          <Tooltip formatter={(value) => [formatMoney(Math.round(Number(value) * 100), currencyCode, locale), t('money.left', locale)]} />
          <Line type="monotone" dataKey="net" stroke={c.accent} strokeWidth={3} dot={{ r: 3, fill: c.accent }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

const DONUT = ['#1f4f5e', '#2b6b4f', '#b7791f', '#7a4e8c', '#c2553f', '#3b6fb6', '#5f8f6a', '#9a6b3f']

export function Donut({ slices, currencyCode, locale, height = 200 }: Common & { slices: { label: string; cents: number }[] }) {
  const data = slices.map((s) => ({ name: s.label, value: s.cents / 100 }))
  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="85%" paddingAngle={2} stroke="none">
            {data.map((_, i) => (
              <Cell key={i} fill={DONUT[i % DONUT.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value, name) => [formatMoney(Math.round(Number(value) * 100), currencyCode, locale), String(name)]} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function Sparkline({ series, height = 28, width = 72 }: { series: SeriesPoint[]; height?: number; width?: number }) {
  const c = useThemeColors()
  const vals = series.map((p) => p.netCents)
  if (vals.length < 2) return null
  const min = Math.min(...vals, 0)
  const max = Math.max(...vals, 0)
  const span = max - min || 1
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * width},${height - ((v - min) / span) * height}`).join(' ')
  return (
    <svg width={width} height={height} aria-hidden>
      <polyline points={pts} fill="none" stroke={c.accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export { DONUT as DONUT_COLORS }
