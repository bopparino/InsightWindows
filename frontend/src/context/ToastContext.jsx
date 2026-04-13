import { createContext, useCallback, useContext, useRef, useState } from 'react'
import ToastContainer from '../components/Toast'

const ToastContext = createContext(null)

let _nextId = 1

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const toastsRef = useRef(toasts)
  toastsRef.current = toasts

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const push = useCallback((type, message, duration) => {
    const id = _nextId++
    setToasts(prev => [...prev, { id, type, message, duration }])
    return id
  }, [])

  const toast = {
    success: (msg, duration)  => push('success', msg, duration),
    error:   (msg, duration)  => push('error',   msg, duration),
    info:    (msg, duration)  => push('info',     msg, duration),
    warning: (msg, duration)  => push('warning',  msg, duration),
  }

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
