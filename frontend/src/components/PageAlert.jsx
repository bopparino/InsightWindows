import { useEffect } from 'react'

/**
 * Inline page-level notification banner.
 * type: 'error' | 'info' | 'success'
 * Auto-clears after `ttl` ms if provided (default: manual dismiss only).
 */
const STYLES = {
  error:   { bg: 'var(--status-lost-bg)',         border: '1px solid var(--status-lost-border)',         color: 'var(--status-lost-text)'        },
  info:    { bg: 'var(--status-proposed-bg)',      border: '1px solid var(--status-proposed-border)',     color: 'var(--status-proposed-text)'    },
  success: { bg: 'var(--status-contracted-bg)',    border: '1px solid var(--status-contracted-border)',   color: 'var(--success)'                 },
}

export default function PageAlert({ msg, type = 'error', onClose, ttl }) {
  useEffect(() => {
    if (!msg || !ttl) return
    const t = setTimeout(onClose, ttl)
    return () => clearTimeout(t)
  }, [msg, ttl, onClose])

  if (!msg) return null

  const s = STYLES[type] || STYLES.error
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, marginBottom: 16,
      padding: '10px 14px',
      borderRadius: 'var(--radius)',
      background: s.bg, border: s.border, color: s.color,
      fontSize: 13,
    }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 18, lineHeight: 1, padding: '0 2px',
        color: 'inherit', opacity: 0.6, flexShrink: 0,
      }}>×</button>
    </div>
  )
}
