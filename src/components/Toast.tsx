import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

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
  const timer = useRef<number | null>(null)

  const showToast = useCallback((next: ToastState) => {
    if (timer.current) window.clearTimeout(timer.current)
    setToast(next)
    timer.current = window.setTimeout(() => setToast(null), 6000)
  }, [])

  const showUndo = useCallback(
    (message: string, undoLabel: string, onUndo: () => void) =>
      showToast({ message, actionLabel: undoLabel, onAction: onUndo }),
    [showToast],
  )

  return (
    <ToastContext.Provider value={{ showToast, showUndo }}>
      {children}
      {toast ? (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
              className="toast__action"
              onClick={() => {
                toast.onAction?.()
                setToast(null)
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
