import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import '../components/Toast.css'

const ToastContext = createContext(null)

const DEFAULT_DURATION = 4000

function ToastItem({ toast, onDismiss }) {
  useEffect(() => {
    const timer = window.setTimeout(() => onDismiss(toast.id), toast.duration)
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss])

  return (
    <div
      className={`app-toast app-toast--${toast.type}`}
      role={toast.type === 'error' ? 'alert' : 'status'}
    >
      <p>{toast.message}</p>
      <button type="button" className="app-toast-close" onClick={() => onDismiss(toast.id)} aria-label="Dismiss">
        ✕
      </button>
    </div>
  )
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback((message, type = 'success', duration = DEFAULT_DURATION) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((current) => [...current, { id, message, type, duration }])
    return id
  }, [])

  const showSuccess = useCallback(
    (message, duration = DEFAULT_DURATION) => showToast(message, 'success', duration),
    [showToast],
  )

  const showError = useCallback(
    (message, duration = 6000) => showToast(message, 'error', duration),
    [showToast],
  )

  return (
    <ToastContext.Provider value={{ showToast, showSuccess, showError, dismiss }}>
      {children}
      {createPortal(
        <div className="app-toast-stack" aria-live="polite" aria-atomic="true">
          {toasts.map((toast) => (
            <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}
