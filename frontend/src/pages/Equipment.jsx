import { useState, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { equipment } from '../api/client'
import { useAuth } from '../context/AuthContext'
import ConfirmModal from '../components/ConfirmModal'

// ── Category detection ────────────────────────────────────────
function detectCategory(code, description) {
  const c = code.toUpperCase()
  const d = (description || '').toUpperCase()
  if (c.includes('HP') || d.includes('HEAT PUMP')) return 'heat_pump'
  if (c.includes('TSVS') || c.includes('96TSVS') || c.includes('RAJG96') || c.includes('HPVS'))
    return 'gas_vs'
  if (/^(CG|JG|RG|GG|LG|YG|DG|FG|CG9\+)/.test(c)) return 'gas_ac'
  if (d.includes('DUCTLESS') || d.includes('MINI') || d.includes('MINI-SPLIT')) return 'ductless'
  if (d.includes('AIR HANDLER') || d.includes('INDOOR')) return 'air_handler'
  return 'other'
}

const CATEGORIES = [
  {
    id: 'gas_ac', label: 'Gas + A/C Systems',
    subtitle: 'Standard efficiency gas furnace with central AC',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="16" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M6 8V5a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.5"/><circle cx="10" cy="13" r="2" stroke="currentColor" strokeWidth="1.5"/></svg>,
    color: 'var(--blue)', bg: 'var(--blue-light)', border: 'var(--gray-200)',
  },
  {
    id: 'gas_vs', label: 'High-Efficiency / Variable Speed',
    subtitle: '96% AFUE, two-stage, modulating systems',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M3 13l4-8 3 5 2-3 5 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    color: 'var(--blue-mid)', bg: 'var(--blue-light)', border: 'var(--gray-300)',
  },
  {
    id: 'heat_pump', label: 'Heat Pump Systems',
    subtitle: 'Air-source heat pumps, all efficiencies',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><path d="M10 3v14M3 10h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M6 6l8 8M14 6l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/></svg>,
    color: 'var(--success)', bg: 'var(--status-contracted-bg)', border: 'var(--status-contracted-border)',
  },
  {
    id: 'ductless', label: 'Ductless / Mini-Split',
    subtitle: 'Single and multi-zone ductless systems',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 9v7M10 9v7M15 9v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/></svg>,
    color: 'var(--accent)', bg: 'var(--status-proposed-bg)', border: 'var(--status-proposed-border)',
  },
  {
    id: 'other', label: 'Accessories & Other',
    subtitle: 'Miscellaneous equipment and add-ons',
    icon: <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2M4.22 4.22l1.42 1.42M14.36 14.36l1.42 1.42M4.22 15.78l1.42-1.42M14.36 5.64l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
    color: 'var(--gray-400)', bg: 'var(--gray-50)', border: 'var(--gray-200)',
  },
]

// ── Add Manufacturer modal ────────────────────────────────────
function AddManufacturerModal({ onClose, onSave }) {
  const [form, setForm] = useState({ code: '', name: '' })
  const [error, setError] = useState('')
  const mut = useMutation({
    mutationFn: () => equipment.createManufacturer(form),
    onSuccess: (data) => { onSave(data); onClose() },
    onError: (e) => setError(e.response?.data?.detail || 'Failed to create manufacturer'),
  })
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 12, padding: 28, width: 360,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Add Manufacturer</div>
        {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}
        <div style={{ marginBottom: 12 }}>
          <label>Code <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>(short identifier, e.g. CARR)</span></label>
          <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
            placeholder="CARR" maxLength={20} style={{ textTransform: 'uppercase' }} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label>Name</label>
          <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="Carrier" />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary"
            disabled={!form.code || !form.name || mut.isPending}
            onClick={() => mut.mutate()}>
            {mut.isPending ? 'Saving...' : 'Add Manufacturer'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Add System modal ──────────────────────────────────────────
function AddSystemModal({ manufacturers, onClose, onSave }) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    manufacturer_id: manufacturers[0]?.id || '',
    system_code: '', description: '',
    component_cost: '', bid_price: '',
    effective_date: today,
  })
  const [error, setError] = useState('')
  const mut = useMutation({
    mutationFn: () => equipment.createSystem({
      ...form,
      manufacturer_id: Number(form.manufacturer_id),
      component_cost: parseFloat(form.component_cost),
      bid_price: parseFloat(form.bid_price),
    }),
    onSuccess: (data) => { onSave(data); onClose() },
    onError: (e) => setError(e.response?.data?.detail || 'Failed to create system'),
  })
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const valid = form.manufacturer_id && form.system_code && form.description &&
    form.component_cost && form.bid_price
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 12, padding: 28, width: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 20 }}>Add Equipment System</div>
        {error && <div className="error-msg" style={{ marginBottom: 12 }}>{error}</div>}

        <div style={{ marginBottom: 12 }}>
          <label>Manufacturer</label>
          <select value={form.manufacturer_id} onChange={e => f('manufacturer_id', e.target.value)}>
            {manufacturers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>

        <div className="form-row form-row-2" style={{ marginBottom: 12 }}>
          <div>
            <label>System Code</label>
            <input value={form.system_code}
              onChange={e => f('system_code', e.target.value.toUpperCase())}
              placeholder="CGAE36S21" style={{ textTransform: 'uppercase' }} />
          </div>
          <div>
            <label>Effective Date</label>
            <input type="date" value={form.effective_date}
              onChange={e => f('effective_date', e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Description</label>
          <input value={form.description}
            onChange={e => f('description', e.target.value)}
            placeholder="3 Ton 16 SEER Gas/AC System" />
        </div>

        <div className="form-row form-row-2" style={{ marginBottom: 20 }}>
          <div>
            <label>Component Cost</label>
            <input type="number" min="0" step="0.01" value={form.component_cost}
              onChange={e => f('component_cost', e.target.value)} placeholder="0.00" />
          </div>
          <div>
            <label>Bid Price</label>
            <input type="number" min="0" step="0.01" value={form.bid_price}
              onChange={e => f('bid_price', e.target.value)} placeholder="0.00" />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" disabled={!valid || mut.isPending}
            onClick={() => mut.mutate()}>
            {mut.isPending ? 'Saving...' : 'Add System'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Component detail row ──────────────────────────────────────
function ComponentRow({ components, colCount }) {
  if (!components || components.length === 0) return null
  return (
    <tr style={{ background: 'var(--gray-50)' }}>
      <td colSpan={colCount} style={{ padding: '10px 24px 12px 48px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {components.map((c, i) => (
            <div key={i} style={{
              background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
              borderRadius: 7, padding: '6px 12px', fontSize: 12,
            }}>
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em',
                color: 'var(--gray-400)', fontWeight: 600, marginBottom: 2 }}>
                {c.component_type}
              </div>
              <div style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--gray-800)' }}>
                {c.model_number}
              </div>
            </div>
          ))}
        </div>
      </td>
    </tr>
  )
}

// ── Manufacturer group ────────────────────────────────────────
function ManufacturerGroup({ mfr, mfrId, systems, color, manageMode, selected, onToggle, onToggleAll }) {
  const [open, setOpen] = useState(false)
  const [expandedId, setExpandedId] = useState(null)
  const allSelected = systems.length > 0 && systems.every(s => selected.has(s.id))
  const someSelected = systems.some(s => selected.has(s.id))

  function toggleExpand(id) {
    if (manageMode) return
    setExpandedId(prev => prev === id ? null : id)
  }

  return (
    <div style={{ borderBottom: '1px solid var(--gray-100)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', background: 'none', border: 'none',
          padding: '11px 18px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', textAlign: 'left',
          color: 'var(--gray-800)',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {manageMode && (
            <input type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected && !allSelected }}
              onChange={e => { e.stopPropagation(); onToggleAll(systems.map(s => s.id), e.target.checked) }}
              onClick={e => e.stopPropagation()}
              style={{ width: 15, height: 15, cursor: 'pointer', flexShrink: 0 }}
            />
          )}
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: 14 }}>{mfr}</span>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
            {systems.length} system{systems.length !== 1 ? 's' : ''}
          </span>
          {manageMode && someSelected && (
            <span style={{ fontSize: 11, color: color, fontWeight: 600 }}>
              {systems.filter(s => selected.has(s.id)).length} selected
            </span>
          )}
        </div>
        <span style={{ fontSize: 12, color: 'var(--gray-400)',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
      </button>

      {open && (
        <div style={{ borderTop: '1px solid var(--gray-100)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--gray-50)' }}>
                {manageMode && <th style={{ width: 40, padding: '7px 18px' }} />}
                {!manageMode && <th style={{ width: 28, padding: '7px 8px 7px 18px' }} />}
                <th style={{ padding: '7px 18px', textAlign: 'left', fontWeight: 600,
                  fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase',
                  letterSpacing: '0.04em' }}>System code</th>
                <th style={{ padding: '7px 12px', textAlign: 'left', fontWeight: 600,
                  fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase',
                  letterSpacing: '0.04em' }}>Description</th>
              </tr>
            </thead>
            <tbody>
              {systems.map(s => {
                const isExpanded = expandedId === s.id
                const hasComponents = s.components && s.components.length > 0
                const colCount = manageMode ? 3 : 3
                return (
                  <>
                    <tr key={s.id}
                      onClick={() => manageMode ? onToggle(s.id) : toggleExpand(s.id)}
                      style={{
                        borderBottom: isExpanded ? 'none' : '1px solid var(--gray-100)',
                        cursor: 'pointer',
                        background: selected.has(s.id) ? 'rgba(220,38,38,0.04)'
                          : isExpanded ? 'var(--blue-light)' : 'transparent',
                        transition: 'background 0.1s',
                      }}>
                      {manageMode ? (
                        <td style={{ padding: '8px 18px' }}>
                          <input type="checkbox" checked={selected.has(s.id)}
                            onChange={() => onToggle(s.id)}
                            onClick={e => e.stopPropagation()}
                            style={{ width: 15, height: 15, cursor: 'pointer' }}
                          />
                        </td>
                      ) : (
                        <td style={{ padding: '8px 8px 8px 18px', color: 'var(--gray-300)',
                          fontSize: 11, lineHeight: 1 }}>
                          {hasComponents
                            ? <span style={{ transform: isExpanded ? 'rotate(90deg)' : 'none',
                                display: 'inline-block', transition: 'transform 0.15s' }}>▶</span>
                            : null}
                        </td>
                      )}
                      <td style={{ padding: '8px 18px', fontFamily: 'monospace', color, fontWeight: 600 }}>
                        {s.system_code}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--gray-600)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.description}
                      </td>
                    </tr>
                    {isExpanded && hasComponents && (
                      <ComponentRow
                        key={`${s.id}-components`}
                        components={s.components}
                        colCount={colCount}
                      />
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Category card ─────────────────────────────────────────────
function CategoryCard({ category, systems, manageMode, selected, onToggle, onToggleAll, mfrIdMap }) {
  const [open, setOpen] = useState(false)

  const byMfr = systems.reduce((acc, s) => {
    const mfr = s.manufacturer || 'Other'
    if (!acc[mfr]) acc[mfr] = []
    acc[mfr].push(s)
    return acc
  }, {})
  const mfrList = Object.keys(byMfr).sort()

  return (
    <div style={{ border: `1px solid ${category.border}`, borderRadius: 12,
      overflow: 'hidden', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', background: category.bg, border: 'none',
          padding: '14px 18px', display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', cursor: 'pointer', textAlign: 'left' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ color: category.color, display: 'flex' }}>{category.icon}</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: category.color }}>{category.label}</div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 1 }}>{category.subtitle}</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: category.color }}>
              {systems.length} systems
              {manageMode && selected.size > 0 && systems.some(s => selected.has(s.id)) && (
                <span style={{ color: 'var(--danger)', marginLeft: 8 }}>
                  ({systems.filter(s => selected.has(s.id)).length} selected)
                </span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
              {mfrList.length} manufacturer{mfrList.length !== 1 ? 's' : ''}
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--gray-400)',
            transform: open ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
        </div>
      </button>

      {open && (
        <div style={{ background: 'var(--card-bg)' }}>
          {mfrList.map(mfr => (
            <ManufacturerGroup
              key={mfr}
              mfr={mfr}
              mfrId={mfrIdMap?.[mfr]}
              systems={byMfr[mfr]}
              color={category.color}
              manageMode={manageMode}
              selected={selected}
              onToggle={onToggle}
              onToggleAll={onToggleAll}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function Equipment() {
  const [searchParams] = useSearchParams()
  const [globalSearch, setGlobalSearch] = useState(() => searchParams.get('q') || '')
  const [manageMode, setManageMode] = useState(false)
  const [selected, setSelected]     = useState(new Set())
  const [showAddMfr, setShowAddMfr] = useState(false)
  const [confirm, setConfirm]       = useState(null)
  const [showAddSys, setShowAddSys] = useState(false)

  const { user } = useAuth()
  const queryClient = useQueryClient()
  const isAdmin = user?.role === 'admin'

  const { data: allSystems = [], isLoading } = useQuery({
    queryKey: ['equipment-systems-all'],
    queryFn: () => equipment.systems({}),
  })
  const { data: allManufacturers = [] } = useQuery({
    queryKey: ['equipment-manufacturers'],
    queryFn: equipment.manufacturers,
  })

  const mfrIdMap = useMemo(() =>
    Object.fromEntries(allManufacturers.map(m => [m.name, m.id])),
  [allManufacturers])

  const bulkRetire = useMutation({
    mutationFn: (ids) => equipment.bulkRetire(ids),
    onSuccess: () => {
      setSelected(new Set())
      queryClient.invalidateQueries({ queryKey: ['equipment-systems-all'] })
    },
  })

  function toggleManageMode() {
    setManageMode(m => !m)
    setSelected(new Set())
  }

  function toggleOne(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll(ids, checked) {
    setSelected(prev => {
      const next = new Set(prev)
      ids.forEach(id => checked ? next.add(id) : next.delete(id))
      return next
    })
  }

  function handleBulkRetire() {
    const ids = [...selected]
    setConfirm({
      title: `Retire ${ids.length} system${ids.length !== 1 ? 's' : ''}?`,
      message: 'They will be hidden from new bids. Existing plan data is unaffected.',
      confirmLabel: 'Retire',
      onConfirm: () => bulkRetire.mutate(ids),
    })
  }

  const categorized = useMemo(() => {
    const filtered = globalSearch
      ? allSystems.filter(s =>
          s.system_code.toLowerCase().includes(globalSearch.toLowerCase()) ||
          s.description.toLowerCase().includes(globalSearch.toLowerCase()) ||
          (s.manufacturer || '').toLowerCase().includes(globalSearch.toLowerCase())
        )
      : allSystems
    return CATEGORIES.map(cat => ({
      ...cat,
      systems: filtered.filter(s => detectCategory(s.system_code, s.description) === cat.id),
    })).filter(cat => cat.systems.length > 0)
  }, [allSystems, globalSearch])

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ['equipment-systems-all'] })
    queryClient.invalidateQueries({ queryKey: ['equipment-manufacturers'] })
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Equipment</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {allSystems.length} systems across {[...new Set(allSystems.map(s => s.manufacturer))].length} manufacturers
          </div>
        </div>

        {isAdmin && (
          <div style={{ display: 'flex', gap: 8 }}>
            {manageMode ? (
              <>
                <button className="btn-secondary" onClick={() => setShowAddMfr(true)}>
                  + Manufacturer
                </button>
                <button className="btn-secondary" onClick={() => setShowAddSys(true)}>
                  + System
                </button>
                <button
                  onClick={toggleManageMode}
                  style={{
                    background: 'none', border: '1px solid var(--gray-200)',
                    borderRadius: 8, padding: '7px 16px', fontSize: 13,
                    cursor: 'pointer', color: 'var(--gray-600)',
                  }}>
                  Done
                </button>
              </>
            ) : (
              <button
                onClick={toggleManageMode}
                style={{
                  background: 'var(--blue)', color: 'white',
                  border: 'none', borderRadius: 8, padding: '7px 16px',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>
                Manage Systems
              </button>
            )}
          </div>
        )}
      </div>

      <>
        {manageMode && (
            <div style={{
              background: 'var(--status-proposed-bg)', border: '1px solid var(--status-proposed-border)',
              borderRadius: 8, padding: '10px 16px', marginBottom: 16,
              fontSize: 13, color: 'var(--status-proposed-text)', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              Manage mode — expand a category, then check systems to select them for bulk retire.
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <input
              placeholder="Search system codes, descriptions, manufacturers..."
              value={globalSearch}
              onChange={e => setGlobalSearch(e.target.value)}
              style={{ maxWidth: 400 }}
            />
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>
          ) : categorized.length === 0 ? (
            <div className="empty-state">
              <p>{globalSearch ? `No systems match "${globalSearch}"` : 'No equipment loaded.'}</p>
            </div>
          ) : (
            categorized.map(cat => (
              <CategoryCard
                key={cat.id}
                category={cat}
                systems={cat.systems}
                manageMode={manageMode}
                selected={selected}
                onToggle={toggleOne}
                onToggleAll={toggleAll}
                mfrIdMap={mfrIdMap}
              />
            ))
          )}

          {/* Sticky action bar */}
          {manageMode && selected.size > 0 && (
            <div style={{
              position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
              background: 'var(--sidebar-bg)', color: 'white', borderRadius: 12,
              padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 200,
              fontSize: 14, whiteSpace: 'nowrap',
            }}>
              <span style={{ fontWeight: 600 }}>{selected.size} system{selected.size !== 1 ? 's' : ''} selected</span>
              <button
                onClick={() => setSelected(new Set())}
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 6,
                  color: 'white', padding: '5px 12px', cursor: 'pointer', fontSize: 13 }}>
                Clear
              </button>
              <button
                onClick={handleBulkRetire}
                disabled={bulkRetire.isPending}
                style={{ background: 'var(--danger)', border: 'none', borderRadius: 6,
                  color: 'white', padding: '6px 16px', cursor: 'pointer',
                  fontWeight: 600, fontSize: 13 }}>
                {bulkRetire.isPending ? 'Retiring...' : `Retire ${selected.size}`}
              </button>
            </div>
          )}
      </>

      {showAddMfr && (
        <AddManufacturerModal
          onClose={() => setShowAddMfr(false)}
          onSave={() => invalidate()}
        />
      )}
      {showAddSys && (
        <AddSystemModal
          manufacturers={allManufacturers}
          onClose={() => setShowAddSys(false)}
          onSave={() => invalidate()}
        />
      )}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}
