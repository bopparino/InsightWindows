import { useEffect, useRef } from 'react'

const ICONS = {
  success: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill="#22c55e" />
      <path d="M4.5 8l2.5 2.5 4.5-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  error: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill="#ef4444" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  info: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="8" fill="#3b82f6" />
      <path d="M8 7v5M8 5.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  warning: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 1.5L14.5 13.5H1.5L8 1.5z" fill="#f59e0b" />
      <path d="M8 6v4M8 11.5v.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
}

const ACCENT = {
  success: '#22c55e',
  error:   '#ef4444',
  info:    '#3b82f6',
  warning: '#f59e0b',
}

export function ToastItem({ id, type = 'info', message, onDismiss, duration = 4000 }) {
  const timerRef = useRef(null)

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(id), duration)
    return () => clearTimeout(timerRef.current)
  }, [id, duration, onDismiss])

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 10,
        background: 'var(--card-bg)',
        border: '1px solid var(--gray-200)',
        borderLeft: `3px solid ${ACCENT[type]}`,
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,0.14)',
        padding: '10px 12px',
        minWidth: 260,
        maxWidth: 360,
        animation: 'toastIn 0.2s ease',
        cursor: 'default',
      }}
    >
      <span style={{ flexShrink: 0, marginTop: 1 }}>{ICONS[type]}</span>
      <span style={{ flex: 1, fontSize: 13, lineHeight: 1.45, color: 'var(--gray-800)', wordBreak: 'break-word' }}>
        {message}
      </span>
      <button
        onClick={() => onDismiss(id)}
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--gray-400)',
          padding: '0 0 0 4px',
          fontSize: 16,
          lineHeight: 1,
          marginTop: -1,
        }}
      >
        ×
      </button>
    </div>
  )
}

export default function ToastContainer({ toasts, onDismiss }) {
  if (!toasts.length) return null
  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(t => (
          <div key={t.id} style={{ pointerEvents: 'auto' }}>
            <ToastItem {...t} onDismiss={onDismiss} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)   scale(1);    }
        }
      `}</style>
    </>
  )
}
