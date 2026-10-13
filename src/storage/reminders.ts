import { currentYearMonth, previousYearMonth } from '../domain/calc'
import type { LineItem, MonthRecord, Settings } from '../domain/types'
import { t } from '../i18n'

const DAY_MS = 86_400_000
const FIRE_COOLDOWN = 24 * 60 * 60 * 1000

export type ReminderMessage = { id: string; text: string }

type Ctx = {
  settings: Settings
  locale: string
  months: MonthRecord[]
  linesByMonthId: Map<string, LineItem[]>
}

function hasLineInLastDays(lines: LineItem[], days: number): boolean {
  const cutoff = Date.now() - days * DAY_MS
  return lines.some((l) => l.createdAt >= cutoff)
}

export function evaluateReminders(ctx: Ctx): ReminderMessage | null {
  if (!ctx.settings.remindersEnabled) return null
  const last = ctx.settings.reminderLastFiredAt
  if (last && Date.now() - last < FIRE_COOLDOWN) return null

  const ym = currentYearMonth()
  const now = new Date()
  const day = now.getDate()
  const month = ctx.months.find((m) => m.yearMonth === ym)
  const lines = month ? (ctx.linesByMonthId.get(month.id) ?? []) : []

  if (day >= 25 && month && month.status !== 'done' && !hasLineInLastDays(lines, 7)) {
    return { id: 'quiet-week', text: t('reminder.quietWeek', ctx.locale) }
  }

  const prevYm = previousYearMonth(ym)
  if (day >= 7 && prevYm) {
    const prev = ctx.months.find((m) => m.yearMonth === prevYm)
    if (prev && prev.status !== 'done') {
      return { id: 'open-prev', text: t('reminder.openPrev', ctx.locale) }
    }
  }

  return null
}

export function fireSystemNotification(text: string): void {
  if (typeof Notification === 'undefined') return
  if (Notification.permission !== 'granted') return
  try {
    new Notification('Expendimonth', { body: text })
  } catch {
    /* ignore */
  }
}
