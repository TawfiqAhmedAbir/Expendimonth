import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney } from '../domain/calc'
import { t } from '../i18n'

type Point = {
  label: string
  inCents: number
  outCents: number
}

type Props = {
  data: Point[]
  currencyCode: string
  locale: string
  compact?: boolean
}

export function MoneyBarChart({ data, currencyCode, locale, compact }: Props) {
  const chartData = data.map((d) => ({
    name: d.label,
    in: d.inCents / 100,
    out: d.outCents / 100,
  }))

  return (
    <div className="chart-wrap" style={compact ? { height: '9rem' } : undefined}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8dfd3" />
          <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={compact ? 'preserveStartEnd' : 0} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip
            formatter={(value, name) => {
              const num = typeof value === 'number' ? value : Number(value)
              const label = String(name) === 'in' ? t('money.in', locale) : t('money.out', locale)
              return [formatMoney(Math.round(num * 100), currencyCode, locale), label]
            }}
          />
          <Bar dataKey="in" fill="#2d6a4f" radius={[4, 4, 0, 0]} />
          <Bar dataKey="out" fill="#c45c4a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
