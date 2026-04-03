const btn = (active, disabled) => ({
  padding: '5px 10px', minWidth: 32, fontSize: 13, borderRadius: 6,
  cursor: disabled ? 'default' : 'pointer', fontWeight: active ? 700 : 400,
  border: active ? 'none' : '1px solid var(--gray-200)',
  background: active ? 'var(--blue-mid)' : 'var(--card-bg)',
  color: active ? 'white' : disabled ? 'var(--gray-300)' : 'var(--gray-600)',
  opacity: disabled ? 0.4 : 1,
})

export default function Pagination({ page, totalPages, total, pageSize, onChange }) {
  if (totalPages <= 1) return null

  // Build page list with ellipsis
  let pages = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else {
    const keep = new Set(
      [1, 2, page - 1, page, page + 1, totalPages - 1, totalPages].filter(p => p >= 1 && p <= totalPages)
    )
    const sorted = [...keep].sort((a, b) => a - b)
    let prev = null
    for (const p of sorted) {
      if (prev !== null && p - prev > 1) pages.push('…')
      pages.push(p)
      prev = p
    }
  }

  const from = (page - 1) * pageSize + 1
  const to   = Math.min(page * pageSize, total)

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginTop: 14, flexWrap: 'wrap', gap: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
        Showing {from}–{to} of {total}
      </span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
        <button style={btn(false, page === 1)} disabled={page === 1}
          onClick={() => onChange(page - 1)}>‹</button>
        {pages.map((p, i) =>
          p === '…'
            ? <span key={`e${i}`} style={{ padding: '0 4px', color: 'var(--gray-400)', fontSize: 13 }}>…</span>
            : <button key={p} style={btn(p === page, false)} onClick={() => onChange(p)}>{p}</button>
        )}
        <button style={btn(false, page === totalPages)} disabled={page === totalPages}
          onClick={() => onChange(page + 1)}>›</button>
      </div>
    </div>
  )
}
