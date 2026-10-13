import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatMonthShort, nextYearMonth, previousYearMonth } from '../domain/calc'
import { Button } from '../design-kit/Primitives'
import { t } from '../i18n'

type Props = {
  yearMonth: string
  locale: string
  onChange: (yearMonth: string) => void
  compact?: boolean
}

export function MonthStepper({ yearMonth, locale, onChange, compact }: Props) {
  const prev = previousYearMonth(yearMonth)
  const next = nextYearMonth(yearMonth)
  const prevDisabled = !prev
  const nextDisabled = !next

  return (
    <div className={`month-stepper${compact ? ' month-stepper--compact' : ''}`}>
      <Button
        size="icon"
        variant="ghost"
        aria-label={t('month.prev', locale)}
        disabled={prevDisabled}
        onClick={() => prev && !prevDisabled && onChange(prev)}
      >
        <ChevronLeft size={22} />
      </Button>
      <span className="month-stepper__label">{formatMonthShort(yearMonth, locale)}</span>
      <Button
        size="icon"
        variant="ghost"
        aria-label={t('month.next', locale)}
        disabled={nextDisabled}
        onClick={() => next && onChange(next)}
      >
        <ChevronRight size={22} />
      </Button>
    </div>
  )
}
