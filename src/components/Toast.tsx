import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'
import { useOverlayLifecycle } from '../design-kit/overlayLifecycle'
import { haptic } from '../design-kit/motion'

type ToastState = {
  message: string
  actionLabel?: string
  onAction?: () => void
}

type ToastContextValue = {
  showToast: (toast: ToastState) => void
  /** Convenience: "X removed" with an Undo action. */
  showUndo: (message: string, undoLabel: string, onUndo: () => void) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const [visible, setVisible] = useState(false)
  const timer = useRef<number | null>(null)
  const { mounted, exiting } = useOverlayLifecycle(visible)

  const dismiss = useCallback(() => {
    if (timer.current) window.clearTimeout(timer.current)
    setVisible(false)
    timer.current = window.setTimeout(() => setToast(null), 240)
  }, [])

  const showToast = useCallback(
    (next: ToastState) => {
      if (timer.current) window.clearTimeout(timer.current)
      setToast(next)
      setVisible(true)
      haptic(8)
      timer.current = window.setTimeout(() => dismiss(), 6000)
    },
    [dismiss],
  )

  const showUndo = useCallback(
    (message: string, undoLabel: string, onUndo: () => void) =>
      showToast({
        message,
        actionLabel: undoLabel,
        onAction: () => {
          haptic(10)
          onUndo()
        },
      }),
    [showToast],
  )

  return (
    <ToastContext.Provider value={{ showToast, showUndo }}>
      {children}
      {mounted && toast ? (
        <div className={`toast${exiting ? ' toast--out' : ''}`} role="status">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.onAction?.()
                dismiss()
              }}
            >
              {toast.actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside provider')
  return ctx
}
