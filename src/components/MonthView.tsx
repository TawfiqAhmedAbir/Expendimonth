import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  compareNetToPreviousMonth,
  formatMoney,
  formatYearMonthLabel,
  net,
  previousYearMonth,
  totalIn,
  totalOut,
} from '../domain/calc'
import type { LineItem, LineType, MonthRecord } from '../domain/types'
import { t } from '../i18n'
import { createCategory, touchCategory } from '../storage/categories'
import {
  addLine,
  copyLinesFromMonth,
  deleteLine,
  getAttachment,
  getLinesForMonth,
  getOrCreateMonth,
  restoreLine,
  saveAttachment,
  setMonthDone,
  setMonthReconcile,
  updateLine,
} from '../storage/repository'
import { useAppData } from '../storage/AppDataContext'
import { toastDeleted, useToast } from './Toast'
import { AddLineSheet } from './AddLineSheet'
import { HeroTotals } from './HeroTotals'
import { LineItemRow } from './LineItemRow'
import { MoneyBarChart } from './MoneyBarChart'
import { ReconcileBanner } from './ReconcileBanner'

type Props = {
  yearMonth: string
}

export function MonthView({ yearMonth }: Props) {
  const { settings, refresh, months, linesByMonthId, categories } = useAppData()
  const { showToast } = useToast()
  const locale = settings.locale
  const currency = settings.currencyCode

  const [month, setMonth] = useState<MonthRecord | null>(null)
  const [lines, setLines] = useState<LineItem[]>([])
  const [sheet, setSheet] = useState<{ type: LineType; edit?: LineItem } | null>(null)
  const [confirmDone, setConfirmDone] = useState(false)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [photoFullscreen, setPhotoFullscreen] = useState(false)

  const load = useCallback(async () => {
    const m = await getOrCreateMonth(yearMonth)
    const l = await getLinesForMonth(m.id)
    setMonth(m)
    setLines(l)
    const att = await getAttachment(m.id)
    if (photoUrl) URL.revokeObjectURL(photoUrl)
    setPhotoUrl(att ? URL.createObjectURL(att.blob) : null)
  }, [yearMonth])

  useEffect(() => {
    void load()
    return () => {
      if (photoUrl) URL.revokeObjectURL(photoUrl)
    }
  }, [load])

  const prevYm = previousYearMonth(yearMonth)
  const insight = useMemo(() => {
    if (!prevYm || !month || lines.length === 0) return null
    const prevMonth = months.find((m) => m.yearMonth === prevYm)
    if (!prevMonth) return null
    const prevLines = linesByMonthId.get(prevMonth.id) ?? []
    const curNet = net(lines)
    const prevNet = net(prevLines)
    return compareNetToPreviousMonth(curNet, prevNet)
  }, [prevYm, month, months, linesByMonthId, lines])

  if (!month) return null

  const readOnly = month.status === 'done'
  const isEmpty = lines.length === 0

  const chartThisMonth = [
    {
      label: formatYearMonthLabel(yearMonth, locale).split(' ')[0] ?? yearMonth,
      inCents: totalIn(lines),
      outCents: totalOut(lines),
    },
  ]

  async function handleSave(data: {
    type: LineType
    amountCents: number
    categoryId?: string
    newCategoryLabel?: string
    note: string
  }) {
    let categoryId = data.categoryId ?? sheet?.edit?.categoryId
    if (data.newCategoryLabel?.trim()) {
      const cat = await createCategory(data.newCategoryLabel.trim())
      categoryId = cat.id
    } else if (categoryId) {
      await touchCategory(categoryId)
    }
    if (!categoryId) return

    const payload = {
      type: data.type,
      amountCents: data.amountCents,
      categoryId,
      note: data.note,
    }
    if (sheet?.edit) {
      await updateLine({ ...sheet.edit, ...payload })
    } else {
      await addLine(month!.id, payload)
    }
    await refresh()
    await load()
  }

  async function handleDelete(line: LineItem) {
    const removed = await deleteLine(line.id)
    await refresh()
    await load()
    if (removed) {
      showToast(
        toastDeleted(async () => {
          await restoreLine(removed)
          await refresh()
          await load()
        }, locale),
      )
    }
  }

  async function handleCopyLast() {
    if (!prevYm) return
    const prev = await getOrCreateMonth(prevYm)
    const n = await copyLinesFromMonth(prev.id, month!.id)
    if (n > 0) {
      await refresh()
      await load()
    }
  }

  const statusKey =
    month.status === 'done' ? 'status.done' : month.status === 'open' ? 'status.open' : 'status.empty'
  const badgeCls =
    month.status === 'done' ? 'badge--done' : month.status === 'open' ? 'badge--open' : 'badge--empty'

  return (
    <>
      <Link to="/" className="btn btn--ghost" style={{ marginBottom: 'var(--space-md)' }}>
        ← {settings.propertyName}
      </Link>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">{formatYearMonthLabel(yearMonth, locale)}</h1>
          <p className="page-sub">{t('month.sub', locale)}</p>
        </div>
        <span className={`badge ${badgeCls}`}>{t(statusKey, locale)}</span>
      </div>

      {isEmpty ? (
        <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
          <p style={{ margin: 0, color: 'var(--color-muted)' }}>{t('month.emptyPrompt', locale)}</p>
        </div>
      ) : (
        <>
          <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
            <HeroTotals lines={lines} currencyCode={currency} locale={locale} />
          </div>
          {insight ? (
            <div className={`insight ${insight.better ? 'insight--positive' : 'insight--negative'}`}>
              {t('home.vsLast', locale, {
                amount: formatMoney(Math.abs(insight.deltaCents), currency, locale),
                direction: insight.better ? t('home.better', locale) : t('home.worse', locale),
              })}
            </div>
          ) : null}
          <div className="card">
            <MoneyBarChart data={chartThisMonth} currencyCode={currency} locale={locale} />
          </div>
        </>
      )}

      {!readOnly ? (
        <div className="btn-row" style={{ margin: 'var(--space-lg) 0' }}>
          <button type="button" className="btn btn--in" style={{ flex: 1 }} onClick={() => setSheet({ type: 'in' })}>
            {t('home.addIn', locale)}
          </button>
          <button type="button" className="btn btn--out" style={{ flex: 1 }} onClick={() => setSheet({ type: 'out' })}>
            {t('home.addOut', locale)}
          </button>
        </div>
      ) : null}

      {!isEmpty ? (
        <div className="card">
          {lines.map((line) => (
            <LineItemRow
              key={line.id}
              line={line}
              categories={categories}
              currencyCode={currency}
              locale={locale}
              readOnly={readOnly}
              onEdit={() => setSheet({ type: line.type, edit: line })}
              onDelete={() => void handleDelete(line)}
            />
          ))}
          <div className="list-footer-totals">
            <div>
              {t('running.totalIn', locale)}: {formatMoney(totalIn(lines), currency, locale)}
            </div>
            <div>
              {t('running.totalOut', locale)}: {formatMoney(totalOut(lines), currency, locale)}
            </div>
            <div>
              <strong>
                {t('running.net', locale)}: {formatMoney(net(lines), currency, locale)}
              </strong>
            </div>
          </div>
        </div>
      ) : null}

      {!readOnly && !isEmpty && prevYm ? (
        <button
          type="button"
          className="btn btn--ghost btn--block"
          style={{ marginTop: 'var(--space-md)' }}
          onClick={() => void handleCopyLast()}
        >
          {t('month.copyLast', locale)}
        </button>
      ) : null}

      {!isEmpty ? (
        <>
          <ReconcileBanner
            month={month}
            lines={lines}
            currencyCode={currency}
            locale={locale}
            onChange={async (inC, outC) => {
              await setMonthReconcile(month.id, inC, outC)
              await refresh()
              await load()
            }}
          />

          <div className="card card--flat" style={{ marginTop: 'var(--space-md)' }}>
            <h3 className="section-head" style={{ marginTop: 0 }}>
              {t('month.photo', locale)}
            </h3>
            {photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                className="photo-thumb"
                onClick={() => setPhotoFullscreen(true)}
              />
            ) : null}
            {!readOnly ? (
              <label className="btn btn--ghost btn--block" style={{ marginTop: 'var(--space-md)' }}>
                {t('month.attachPhoto', locale)}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    void saveAttachment(month.id, file).then(() => load())
                  }}
                />
              </label>
            ) : null}
          </div>
        </>
      ) : null}

      {!readOnly && !isEmpty ? (
        <button
          type="button"
          className="btn btn--primary btn--block"
          style={{ marginTop: 'var(--space-lg)' }}
          onClick={() => setConfirmDone(true)}
        >
          {t('month.markDone', locale)}
        </button>
      ) : null}

      {readOnly ? (
        <button
          type="button"
          className="btn btn--ghost btn--block"
          style={{ marginTop: 'var(--space-lg)' }}
          onClick={async () => {
            await setMonthDone(month.id, false)
            await refresh()
            await load()
          }}
        >
          {t('month.reopen', locale)}
        </button>
      ) : null}

      <AddLineSheet
        open={Boolean(sheet)}
        type={sheet?.type ?? 'in'}
        locale={locale}
        categories={categories}
        initial={sheet?.edit ?? null}
        onClose={() => setSheet(null)}
        onSave={(data) => void handleSave(data)}
      />

      {confirmDone ? (
        <div className="sheet-backdrop" onClick={() => setConfirmDone(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <h2 className="sheet__title">{t('confirm.doneTitle', locale)}</h2>
            <p>{t('confirm.doneBody', locale)}</p>
            <div className="btn-row">
              <button type="button" className="btn btn--ghost" style={{ flex: 1 }} onClick={() => setConfirmDone(false)}>
                {t('confirm.cancel', locale)}
              </button>
              <button
                type="button"
                className="btn btn--primary"
                style={{ flex: 1 }}
                onClick={async () => {
                  await setMonthDone(month.id, true)
                  await refresh()
                  await load()
                  setConfirmDone(false)
                }}
              >
                {t('confirm.yes', locale)}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {photoFullscreen && photoUrl ? (
        <div className="photo-fullscreen" onClick={() => setPhotoFullscreen(false)} role="presentation">
          <img src={photoUrl} alt="" />
        </div>
      ) : null}
    </>
  )
}
