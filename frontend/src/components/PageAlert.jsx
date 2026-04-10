import { useEffect } from 'react'

/**
 * Inline page-level notification banner.
 * type: 'error' | 'info'
 * Auto-clears after `ttl` ms if provided (default: manual dismiss only).
 */
export default function PageAlert({ msg, type = 'error', onClose, ttl }) {
  useEffect(() => {
    if (!msg || !ttl) return
    const t = setTimeout(onClose, ttl)
    return () => clearTimeout(t)
  }, [msg, ttl, onClose])

  if (!msg) return null

  const isError = type === 'error'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, marginBottom: 16,
      padding: '10px 14px',
      borderRadius: 'var(--radius)',
      background:   isError ? 'var(--status-lost-bg)'         : 'var(--status-proposed-bg)',
      border:       isError ? '1px solid var(--status-lost-border)' : '1px solid var(--status-proposed-border)',
      color:        isError ? 'var(--status-lost-text)'        : 'var(--status-proposed-text)',
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
