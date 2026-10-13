import { dayActivityMap, daysInMonth, formatMoneyCompact } from '../domain/calc'
import type { LineItem } from '../domain/types'
import { t } from '../i18n'

type Props = {
  yearMonth: string
  lines: LineItem[]
  currencyCode: string
  locale: string
  selectedDay: string | null
  onSelectDay: (day: string | null) => void
}

export function MonthCalendarStrip({ yearMonth, lines, currencyCode, locale, selectedDay, onSelectDay }: Props) {
  const count = daysInMonth(yearMonth)
  const activity = dayActivityMap(lines)
  const startDow = new Date(yearMonth + '-01').getDay()
  const blanks = startDow

  const weekdays = [0, 1, 2, 3, 4, 5, 6].map((d) =>
    new Date(2024, 0, 7 + d).toLocaleDateString(locale, { weekday: 'narrow' }),
  )

  return (
    <div className="cal-strip" aria-label={t('calendar.title', locale)}>
      <div className="cal-strip__weekdays">
        {weekdays.map((w) => (
          <span key={w} className="cal-strip__wd">
            {w}
          </span>
        ))}
      </div>
      <div className="cal-strip__grid">
        {Array.from({ length: blanks }, (_, i) => (
          <span key={`b-${i}`} className="cal-strip__cell cal-strip__cell--blank" />
        ))}
        {Array.from({ length: count }, (_, i) => {
          const dayNum = i + 1
          const iso = `${yearMonth}-${String(dayNum).padStart(2, '0')}`
          const act = activity.get(iso)
          const active = selectedDay === iso
          const netHint = act ? act.inCents - act.outCents : 0
          return (
            <button
              key={iso}
              type="button"
              className={`cal-strip__cell${active ? ' cal-strip__cell--on' : ''}${act ? ' cal-strip__cell--has' : ''}`}
              aria-pressed={active}
              aria-label={t('calendar.day', locale, { day: String(dayNum) })}
              onClick={() => onSelectDay(active ? null : iso)}
            >
              <span className="cal-strip__num">{dayNum}</span>
              {act ? (
                <span className={`cal-strip__dot${netHint < 0 ? ' cal-strip__dot--out' : ''}`} title={formatMoneyCompact(Math.abs(netHint), currencyCode, locale)} />
              ) : null}
            </button>
          )
        })}
      </div>
      <p className="caption cal-strip__hint">{t('calendar.hint', locale)}</p>
    </div>
  )
}
