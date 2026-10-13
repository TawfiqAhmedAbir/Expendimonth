import type { ButtonHTMLAttributes, CSSProperties, ReactNode, PointerEvent as ReactPointerEvent } from 'react'
import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { useOverlayLifecycle } from './overlayLifecycle'

type ButtonVariant = 'primary' | 'in' | 'out' | 'ghost' | 'subtle' | 'danger'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  block?: boolean
  size?: 'md' | 'sm' | 'icon'
}

export function Button({ variant = 'ghost', block, size = 'md', className = '', ...rest }: ButtonProps) {
  const cls = [
    'btn',
    `btn--${variant}`,
    block ? 'btn--block' : '',
    size === 'sm' ? 'btn--sm' : '',
    size === 'icon' ? 'btn--icon' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')
  return <button type="button" className={cls} {...rest} />
}

type LinkButtonProps = {
  to: string
  variant?: ButtonVariant
  block?: boolean
  children: ReactNode
  style?: CSSProperties
  className?: string
}

export function LinkButton({ to, variant = 'ghost', block, children, style, className = '' }: LinkButtonProps) {
  return (
    <Link to={to} className={`btn btn--${variant}${block ? ' btn--block' : ''} ${className}`} style={style}>
      {children}
    </Link>
  )
}

type CardProps = {
  children: ReactNode
  variant?: 'raised' | 'flat' | 'sunken'
  className?: string
  style?: CSSProperties
}

export function Card({ children, variant = 'raised', className = '', style }: CardProps) {
  const v = variant === 'flat' ? ' card--flat' : variant === 'sunken' ? ' card--sunken' : ''
  return (
    <div className={`card${v} ${className}`} style={style}>
      {children}
    </div>
  )
}

type ChipProps = {
  active?: boolean
  disabled?: boolean
  onClick?: () => void
  onLongPress?: () => void
  children: ReactNode
  meta?: ReactNode
  'aria-label'?: string
}

export function Chip({ active, disabled, onClick, onLongPress, children, meta, 'aria-label': ariaLabel }: ChipProps) {
  let timer: number | null = null
  const start = () => {
    if (!onLongPress) return
    timer = window.setTimeout(() => {
      timer = null
      onLongPress()
    }, 500)
  }
  const cancel = () => {
    if (timer) {
      window.clearTimeout(timer)
      timer = null
    }
  }
  return (
    <button
      type="button"
      className={`chip${active ? ' chip--active' : ''}`}
      aria-label={ariaLabel}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      onPointerDown={start}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault()
          onLongPress()
        }
      }}
    >
      <span>{children}</span>
      {meta ? <span className="chip__meta">{meta}</span> : null}
    </button>
  )
}

type SheetProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
}

export function Sheet({ open, onClose, title, children }: SheetProps) {
  const { mounted, exiting } = useOverlayLifecycle(open)
  const dragY = useRef(0)
  const sheetRef = useRef<HTMLDivElement>(null)

  if (!mounted) return null

  function onGrabPointerDown(e: ReactPointerEvent) {
    dragY.current = e.clientY
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onGrabPointerMove(e: ReactPointerEvent) {
    if (!sheetRef.current || !e.currentTarget.hasPointerCapture(e.pointerId)) return
    const dy = Math.max(0, e.clientY - dragY.current)
    sheetRef.current.style.transform = `translateY(${dy}px)`
  }

  function onGrabPointerUp(e: ReactPointerEvent) {
    if (!sheetRef.current) return
    const dy = e.clientY - dragY.current
    sheetRef.current.style.transform = ''
    if (dy > 80) onClose()
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
  }

  // Portal to <body>: ancestors with backdrop-filter/transform (e.g. .topbar) would
  // otherwise become the containing block for this fixed-position overlay.
  return createPortal(
    <div
      className={`sheet-backdrop${exiting ? ' sheet-backdrop--out' : ''}`}
      role="presentation"
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`sheet${exiting ? ' sheet--out' : ''}`}
        role="dialog"
        aria-modal
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet__grab"
          onPointerDown={onGrabPointerDown}
          onPointerMove={onGrabPointerMove}
          onPointerUp={onGrabPointerUp}
          onPointerCancel={onGrabPointerUp}
        />
        {title ? <h2 className="sheet__title">{title}</h2> : null}
        {children}
      </div>
    </div>,
    document.body,
  )
}

type TileProps = {
  to: string
  icon: ReactNode
  label: string
  hint?: string
}

export function Tile({ to, icon, label, hint }: TileProps) {
  return (
    <Link to={to} className="tile">
      <span className="tile__icon">{icon}</span>
      <span className="tile__label">{label}</span>
      {hint ? <span className="tile__hint">{hint}</span> : null}
    </Link>
  )
}

type StatRingProps = {
  ratio: number
  size?: number
  stroke?: number
  tone?: 'in' | 'out' | 'accent'
  children?: ReactNode
}

export function StatRing({ ratio, size = 180, stroke = 14, tone = 'accent', children }: StatRingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0))
  const dash = c * clamped
  const color = tone === 'in' ? 'var(--in)' : tone === 'out' ? 'var(--out)' : 'var(--accent)'
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-sunken)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: `stroke-dasharray var(--dur-slow) var(--ease-out)` }}
        />
      </svg>
      <div className="ring__center">{children}</div>
    </div>
  )
}

export function Skeleton({ height = '1rem', width = '100%', style }: { height?: string; width?: string; style?: CSSProperties }) {
  return <div className="skeleton" style={{ height, width, ...style }} aria-hidden />
}

export function Badge({ status, children }: { status: 'open' | 'checked' | 'done' | 'empty' | 'warn'; children: ReactNode }) {
  return <span className={`badge badge--${status}`}>{children}</span>
}

export function Steps({ count, current }: { count: number; current: number }) {
  return (
    <div className="steps" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`steps__dot${i <= current ? ' steps__dot--on' : ''}`} />
      ))}
    </div>
  )
}

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className="field">
      <label htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  )
}

type ProgressBarProps = {
  value: number
  max: number
  over?: boolean
  label?: string
}

export function ProgressBar({ value, max, over, label }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(value / max, 1.5) : 0
  const width = `${Math.min(pct * 100, 100)}%`
  return (
    <div className="progress" aria-label={label}>
      <div className="progress__track">
        <div className={`progress__fill${over ? ' progress__fill--over' : ''}`} style={{ width }} />
      </div>
    </div>
  )
}
