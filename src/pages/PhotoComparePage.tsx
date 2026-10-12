import { ArrowLeft, Camera } from 'lucide-react'
import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useParams } from 'react-router-dom'
import { LineItemRow } from '../components/LineItemRow'
import { formatMoney, formatYearMonthLabel, parseMoneyToCents, totalIn, totalOut } from '../domain/calc'
import { Card, Field, LinkButton } from '../design-kit/Primitives'
import { ScreenShell } from '../design-kit/ScreenShell'
import { t } from '../i18n'
import { useActiveProperty, useAppData } from '../storage/AppDataContext'
import { getAttachment, saveAttachment, setMonthReconcile } from '../storage/repository'

type Transform = { scale: number; x: number; y: number }

function PhotoViewer({ src }: { src: string }) {
  const [tf, setTf] = useState<Transform>({ scale: 1, x: 0, y: 0 })
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const last = useRef<{ dist: number; mid: { x: number; y: number } } | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const img = useRef<HTMLImageElement>(null)

  useEffect(() => {
    // Fit image on load.
    const el = img.current
    const b = box.current
    if (!el || !b) return
    const fit = () => {
      const s = Math.min(b.clientWidth / el.naturalWidth, b.clientHeight / el.naturalHeight) || 1
      setTf({ scale: s, x: (b.clientWidth - el.naturalWidth * s) / 2, y: (b.clientHeight - el.naturalHeight * s) / 2 })
    }
    if (el.complete) fit()
    else el.onload = fit
  }, [src])

  const onDown = (e: PointerEvent) => {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    last.current = null
  }
  const onMove = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return
    const prev = pointers.current.get(e.pointerId)!
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const pts = [...pointers.current.values()]
    if (pts.length === 1) {
      setTf((s) => ({ ...s, x: s.x + (e.clientX - prev.x), y: s.y + (e.clientY - prev.y) }))
    } else if (pts.length >= 2) {
      const [a, b] = pts as [{ x: number; y: number }, { x: number; y: number }]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      if (last.current) {
        const k = dist / last.current.dist
        const rect = box.current!.getBoundingClientRect()
        const mx = mid.x - rect.left
        const my = mid.y - rect.top
        setTf((s) => {
          const scale = Math.min(6, Math.max(0.3, s.scale * k))
          const r = scale / s.scale
          return { scale, x: mx - (mx - s.x) * r + (mid.x - last.current!.mid.x), y: my - (my - s.y) * r + (mid.y - last.current!.mid.y) }
        })
      }
      last.current = { dist, mid }
    }
  }
  const onUp = (e: PointerEvent) => {
    pointers.current.delete(e.pointerId)
    last.current = null
  }
  const onWheel = (e: React.WheelEvent) => {
    const rect = box.current!.getBoundingClientRect()
    const mx = e.clientX - rect.left
    const my = e.clientY - rect.top
    const k = e.deltaY < 0 ? 1.1 : 0.9
    setTf((s) => {
      const scale = Math.min(6, Math.max(0.3, s.scale * k))
      const r = scale / s.scale
      return { scale, x: mx - (mx - s.x) * r, y: my - (my - s.y) * r }
    })
  }

  return (
    <div ref={box} className="photo-viewer" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
      <img ref={img} src={src} alt="" draggable={false} style={{ transform: `translate(${tf.x}px, ${tf.y}px) scale(${tf.scale})`, top: 0, left: 0 }} />
    </div>
  )
}

export function PhotoComparePage() {
  const { yearMonth = '' } = useParams()
  const property = useActiveProperty()
  const { settings, monthsByYearMonth, linesByMonthId, categories, refresh } = useAppData()
  const locale = settings.locale
  const currency = property.currencyCode
  const month = monthsByYearMonth.get(yearMonth)
  const lines = month ? (linesByMonthId.get(month.id) ?? []) : []
  const [url, setUrl] = useState<string | null>(null)
  const [paperIn, setPaperIn] = useState('')
  const [paperOut, setPaperOut] = useState('')

  useEffect(() => {
    if (!month) return
    setPaperIn(month.reconcileInCents !== null ? (month.reconcileInCents / 100).toFixed(2) : '')
    setPaperOut(month.reconcileOutCents !== null ? (month.reconcileOutCents / 100).toFixed(2) : '')
    let u: string | null = null
    void getAttachment(month.id).then((a) => {
      u = a ? URL.createObjectURL(a.blob) : null
      setUrl(u)
    })
    return () => { if (u) URL.revokeObjectURL(u) }
  }, [month])

  if (!month) return null

  const inC = totalIn(lines)
  const outC = totalOut(lines)
  const pIn = paperIn.trim() ? parseMoneyToCents(paperIn) : null
  const pOut = paperOut.trim() ? parseMoneyToCents(paperOut) : null

  async function commit() {
    await setMonthReconcile(month!.id, pIn, pOut)
    await refresh()
  }

  const diffRow = (label: string, app: number, paper: number | null, tone: 'in' | 'out') => {
    const off = paper !== null && paper !== app
    return (
      <div className={`insight ${paper === null ? '' : off ? 'insight--warn' : 'insight--positive'}`} style={{ marginBottom: 'var(--s-2)' }}>
        <div className="row row--between">
          <span>{label}</span>
          <span className="row" style={{ gap: 'var(--s-4)' }}>
            <span><span className="caption">{t('compare.appSays', locale)}</span> <strong className={`money money--${tone}`}>{formatMoney(app, currency, locale)}</strong></span>
            <span><span className="caption">{t('compare.paperSays', locale)}</span> <strong className="money">{paper === null ? '—' : formatMoney(paper, currency, locale)}</strong></span>
          </span>
        </div>
        {off ? <div className="caption" style={{ color: 'inherit', marginTop: 4 }}>{tone === 'in' ? t('reconcile.offIn', locale, { amount: formatMoney(Math.abs(paper! - app), currency, locale) }) : t('reconcile.offOut', locale, { amount: formatMoney(Math.abs(paper! - app), currency, locale) })}</div> : null}
      </div>
    )
  }

  return (
    <ScreenShell>
      <LinkButton to={`/month/${yearMonth}`} variant="subtle" style={{ marginBottom: 'var(--s-2)', paddingLeft: 0 }}>
        <ArrowLeft size={18} /> {formatYearMonthLabel(yearMonth, locale)}
      </LinkButton>
      <h1 className="title">{t('compare.title', locale)}</h1>

      {url ? <PhotoViewer src={url} /> : (
        <Card variant="flat">
          <p className="muted">{t('compare.noPhoto', locale)}</p>
          <label className="btn btn--primary btn--block">
            <Camera size={18} /> {t('month.attachPhoto', locale)}
            <input type="file" accept="image/*" capture="environment" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (f && month) { await saveAttachment(month.id, f); const a = await getAttachment(month.id); setUrl(a ? URL.createObjectURL(a.blob) : null) } }} />
          </label>
        </Card>
      )}

      <Card style={{ marginTop: 'var(--s-4)' }}>
        {diffRow(t('money.in', locale), inC, pIn, 'in')}
        {diffRow(t('money.out', locale), outC, pOut, 'out')}
        <div className="row" style={{ marginTop: 'var(--s-3)' }}>
          <Field label={t('close.paperIn', locale)} htmlFor="cpi">
            <input id="cpi" className="input" inputMode="decimal" value={paperIn} onChange={(e) => setPaperIn(e.target.value)} onBlur={() => void commit()} />
          </Field>
          <Field label={t('close.paperOut', locale)} htmlFor="cpo">
            <input id="cpo" className="input" inputMode="decimal" value={paperOut} onChange={(e) => setPaperOut(e.target.value)} onBlur={() => void commit()} />
          </Field>
        </div>
      </Card>

      {lines.length > 0 ? (
        <Card style={{ marginTop: 'var(--s-4)' }}>
          {lines.map((l) => <LineItemRow key={l.id} line={l} categories={categories} currencyCode={currency} locale={locale} readOnly />)}
        </Card>
      ) : null}
    </ScreenShell>
  )
}
