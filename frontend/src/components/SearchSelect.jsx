/**
 * SearchSelect — a combined search input + dropdown.
 * Type to filter, click to select, or use the arrow to open the full list.
 *
 * Props:
 *   options      — array of { id, label, sublabel? }
 *   value        — currently selected id
 *   onChange     — (id) => void
 *   placeholder  — input placeholder text
 *   disabled     — bool
 */
import { useState, useRef, useEffect, useMemo } from 'react'

export default function SearchSelect({
  options = [],
  value,
  onChange,
  placeholder = 'Search or select...',
  disabled = false,
}) {
  const [search, setSearch]   = useState('')
  const [open, setOpen]       = useState(false)
  const containerRef          = useRef(null)

  const selected = options.find(o => String(o.id) === String(value))

  // Close on outside click
  useEffect(() => {
    function handle(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setSearch('')
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  const filtered = useMemo(() => {
    if (!search.trim()) return options
    const q = search.toLowerCase()
    return options.filter(o =>
      o.label.toLowerCase().includes(q) ||
      (o.sublabel && o.sublabel.toLowerCase().includes(q))
    )
  }, [options, search])

  const displayValue = open ? search : (selected ? selected.label : '')

  function select(opt) {
    onChange(opt.id)
    setSearch('')
    setOpen(false)
  }

  function clear(e) {
    e.stopPropagation()
    onChange('')
    setSearch('')
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <input
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          onChange={e => { setSearch(e.target.value); setOpen(true) }}
          onFocus={() => { setOpen(true); setSearch('') }}
          style={{ paddingRight: 56 }}
        />
        {/* Clear button */}
        {selected && !open && (
          <button onClick={clear} style={{
            position: 'absolute', right: 30, background: 'none',
            color: 'var(--gray-400)', fontSize: 16, padding: '0 4px',
            lineHeight: 1, border: 'none', cursor: 'pointer',
          }}>×</button>
        )}
        {/* Arrow toggle */}
        <button
          onClick={() => { setOpen(o => !o); setSearch('') }}
          disabled={disabled}
          style={{
            position: 'absolute', right: 6, background: 'none',
            color: 'var(--gray-400)', fontSize: 11, padding: '4px 6px',
            lineHeight: 1, border: 'none', cursor: 'pointer',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.15s',
          }}>▼</button>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
          background: 'white', border: '1px solid var(--gray-200)',
          borderRadius: 8, boxShadow: '0 6px 20px rgba(0,0,0,0.12)',
          zIndex: 100, maxHeight: 240, overflowY: 'auto',
        }}>
          {filtered.length === 0 ? (
            <div style={{ padding: '12px 14px', fontSize: 13,
              color: 'var(--gray-400)' }}>
              No results{search ? ` for "${search}"` : ''}
            </div>
          ) : (
            filtered.map(opt => {
              const isSelected = String(opt.id) === String(value)
              return (
                <div
                  key={opt.id}
                  onMouseDown={() => select(opt)}
                  style={{
                    padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                    background: isSelected ? 'var(--blue-light)' : 'white',
                    borderBottom: '1px solid var(--gray-100)',
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) e.currentTarget.style.background = 'var(--gray-50)'
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = isSelected
                      ? 'var(--blue-light)' : 'white'
                  }}
                >
                  <span style={{
                    fontWeight: isSelected ? 600 : 400,
                    color: isSelected ? 'var(--blue)' : 'var(--gray-800)',
                  }}>
                    {opt.label}
                  </span>
                  {opt.sublabel && (
                    <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 8 }}>
                      {opt.sublabel}
                    </span>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
