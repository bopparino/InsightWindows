import { useEffect, useRef } from 'react'

/**
 * Reusable confirmation modal — replaces window.confirm() everywhere.
 *
 * Usage:
 *   const [confirm, setConfirm] = useState(null)
 *   // trigger:
 *   setConfirm({ title: 'Delete plan?', message: 'This cannot be undone.', onConfirm: () => del.mutate() })
 *   // render:
 *   {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
 */
export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel  = 'Cancel',
  danger       = true,
  onConfirm,
  onCancel,
}) {
  const confirmRef = useRef(null)

  useEffect(() => {
    // Auto-focus confirm button; restore focus on close
    const prev = document.activeElement
    confirmRef.current?.focus()
    function onKey(e) {
      if (e.key === 'Escape') { e.stopPropagation(); onCancel() }
    }
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      prev?.focus()
    }
  }, [onCancel])

  function handleConfirm() {
    onConfirm()
    onCancel()
  }

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
        animation: 'fadeIn 0.12s ease',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--card-bg)',
          borderRadius: 12,
          border: '1px solid var(--gray-200)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          width: '100%', maxWidth: 400,
          padding: '24px 24px 20px',
          animation: 'slideUp 0.15s ease',
        }}
      >
        {title && (
          <div style={{
            fontSize: 16, fontWeight: 700,
            color: 'var(--gray-800)', marginBottom: message ? 8 : 20,
          }}>
            {title}
          </div>
        )}
        {message && (
          <div style={{
            fontSize: 14, color: 'var(--gray-600)',
            lineHeight: 1.65, marginBottom: 20,
            whiteSpace: 'pre-line',
          }}>
            {message}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onCancel} className="btn-secondary btn-sm">
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={handleConfirm}
            className={danger ? 'btn-danger btn-sm' : 'btn-primary btn-sm'}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(8px); opacity: 0 } to { transform: translateY(0); opacity: 1 } }
      `}</style>
    </div>
  )
}
