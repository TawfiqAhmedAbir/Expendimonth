import { Delete, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { haptic } from '../design-kit/motion'

type Props = {
  title: string
  error?: string | null
  length?: number
  onComplete: (pin: string) => void
}

export function PinPad({ title, error, length = 4, onComplete }: Props) {
  const [pin, setPin] = useState('')

  useEffect(() => {
    if (pin.length === length) {
      const p = pin
      setPin('')
      onComplete(p)
    }
  }, [pin, length, onComplete])

  useEffect(() => {
    if (error) haptic([20, 40, 20])
  }, [error])

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ display: 'grid', placeItems: 'center', marginBottom: 'var(--s-3)' }}>
        <span className="line__icon" style={{ width: 56, height: 56, borderRadius: '50%' }}><Lock size={24} /></span>
      </div>
      <h1 className="title">{title}</h1>
      <div className="pin-dots" aria-live="polite">
        {Array.from({ length }, (_, i) => <span key={i} className={`pin-dot${i < pin.length ? ' pin-dot--on' : ''}`} />)}
      </div>
      {error ? <p className="money--out" style={{ margin: '0 0 var(--s-3)' }}>{error}</p> : null}
      <div className="pad__grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', maxWidth: 300, margin: '0 auto' }}>
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((k) => (
          <button key={k} type="button" className="pad__key" onClick={() => { haptic(6); setPin((p) => (p.length < length ? p + k : p)) }}>{k}</button>
        ))}
        <span />
        <button type="button" className="pad__key" onClick={() => { haptic(6); setPin((p) => (p.length < length ? p + '0' : p)) }}>0</button>
        <button type="button" className="pad__key" aria-label="backspace" onClick={() => setPin((p) => p.slice(0, -1))}><Delete size={22} /></button>
      </div>
    </div>
  )
}
