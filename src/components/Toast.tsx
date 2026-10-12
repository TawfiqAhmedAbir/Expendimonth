import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { t } from '../i18n'

type ToastState = {
  message: string
  actionLabel?: string
  onAction?: () => void
}

type ToastContextValue = {
  showToast: (toast: ToastState) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)

  const showToast = useCallback((next: ToastState) => {
    setToast(next)
    window.setTimeout(() => setToast(null), 5000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast ? (
        <div className="toast" role="status">
          <span>{toast.message}</span>
          {toast.actionLabel && toast.onAction ? (
            <button
              type="button"
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

export function toastDeleted(onUndo: () => void, locale: string): ToastState {
  return {
    message: t('line.deleted', locale),
    actionLabel: t('line.undo', locale),
    onAction: onUndo,
  }
}
