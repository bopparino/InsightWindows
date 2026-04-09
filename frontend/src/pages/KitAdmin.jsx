/**
 * KitAdmin — Kit Pricing "bible"
 *
 * Categories A–U with variants. Per_kit = bid price (what builder pays).
 * markup_divisor < 1.0 means the item has an embedded margin:
 *   internal cost = per_kit × markup_divisor
 *   margin %      = (1 − markup_divisor) × 100
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kit } from '../api/client'

function fmt(n) { return n > 0 ? `$${Number(n).toFixed(2)}` : '—' }

// ── Inline edit row ───────────────────────────────────────────
function EditRow({ v, cat, onSave, onCancel, saving }) {
  const [d, setD] = useState({
    variant_code:   v.variant_code,
    variant_name:   v.variant_name,
    per_kit:        String(v.per_kit),
    per_foot:       String(v.per_foot),
    markup_divisor: String(v.markup_divisor),
    sort_order:     String(v.sort_order),
  })
  const set = (k, val) => setD(p => ({ ...p, [k]: val }))

  function save() {
    onSave({
      category_code:  cat.code,
      category_name:  cat.name,
      variant_code:   d.variant_code.trim(),
      variant_name:   d.variant_name.trim(),
      per_kit:        parseFloat(d.per_kit)        || 0,
      per_foot:       parseFloat(d.per_foot)       || 0,
      markup_divisor: parseFloat(d.markup_divisor) || 1.0,
      sort_order:     parseInt(d.sort_order, 10)   || 10,
      active:         true,
    })
  }

  return (
    <tr style={{ background: 'var(--blue-light)' }}>
      <td style={{ padding: '5px 8px' }}><input value={d.variant_code} onChange={e => set('variant_code', e.target.value)} style={{ fontSize: 13, width: 80 }} /></td>
      <td style={{ padding: '5px 8px' }}><input value={d.variant_name} onChange={e => set('variant_name', e.target.value)} style={{ fontSize: 13, width: '100%' }} /></td>
      <td style={{ padding: '5px 8px' }}><input type="number" step="0.01" value={d.per_kit} onChange={e => set('per_kit', e.target.value)} style={{ fontSize: 13, width: 84, textAlign: 'right' }} /></td>
      <td style={{ padding: '5px 8px' }}><input type="number" step="0.01" min="0.01" max="1" value={d.markup_divisor} onChange={e => set('markup_divisor', e.target.value)} style={{ fontSize: 13, width: 60, textAlign: 'center' }} /></td>
      <td style={{ padding: '5px 8px', color: 'var(--gray-500)', fontSize: 12, textAlign: 'right' }}>
        {(() => { const c = (parseFloat(d.per_kit) || 0) * (parseFloat(d.markup_divisor) || 1); return c > 0 ? `$${c.toFixed(2)}` : '—' })()}
      </td>
      <td style={{ padding: '5px 8px' }}><input type="number" step="0.01" value={d.per_foot} onChange={e => set('per_foot', e.target.value)} style={{ fontSize: 13, width: 84, textAlign: 'right' }} /></td>
      <td style={{ padding: '5px 8px' }}><input type="number" value={d.sort_order} onChange={e => set('sort_order', e.target.value)} style={{ fontSize: 13, width: 50, textAlign: 'center' }} /></td>
      <td style={{ padding: '5px 8px', whiteSpace: 'nowrap' }}>
        <button className="btn-primary btn-sm" onClick={save} disabled={saving} style={{ marginRight: 6 }}>{saving ? '…' : 'Save'}</button>
        <button className="btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </td>
    </tr>
  )
}

// ── Add-variant row (bottom of each category) ─────────────────
function AddRow({ cat, onAdd, adding }) {
  const EMPTY = { variant_code: '', variant_name: '', per_kit: '', per_foot: '', markup_divisor: '1.0', sort_order: '' }
  const [d, setD] = useState(EMPTY)
  const set = (k, val) => setD(p => ({ ...p, [k]: val }))

  function submit() {
    if (!d.variant_code.trim() || !d.variant_name.trim()) return
    onAdd({
      category_code:  cat.code,
      category_name:  cat.name,
      variant_code:   d.variant_code.trim(),
      variant_name:   d.variant_name.trim(),
      per_kit:        parseFloat(d.per_kit)        || 0,
      per_foot:       parseFloat(d.per_foot)       || 0,
      markup_divisor: parseFloat(d.markup_divisor) || 1.0,
      sort_order:     parseInt(d.sort_order, 10)   || 10,
      active:         true,
    })
    setD(EMPTY)
  }

  return (
    <tr style={{ background: 'var(--gray-50)', borderTop: '1px dashed var(--gray-200)' }}>
      <td style={{ padding: '5px 8px' }}><input placeholder="Code" value={d.variant_code} onChange={e => set('variant_code', e.target.value)} style={{ fontSize: 13, width: 80 }} /></td>
      <td style={{ padding: '5px 8px' }}><input placeholder="Variant name" value={d.variant_name} onChange={e => set('variant_name', e.target.value)} style={{ fontSize: 13, width: '100%' }} /></td>
      <td style={{ padding: '5px 8px' }}><input type="number" step="0.01" placeholder="0.00" value={d.per_kit} onChange={e => set('per_kit', e.target.value)} style={{ fontSize: 13, width: 84, textAlign: 'right' }} /></td>
      <td style={{ padding: '5px 8px' }}><input type="number" step="0.01" placeholder="1.0" value={d.markup_divisor} onChange={e => set('markup_divisor', e.target.value)} style={{ fontSize: 13, width: 60, textAlign: 'center' }} /></td>
      <td style={{ padding: '5px 8px', color: 'var(--gray-400)', fontSize: 12, textAlign: 'right' }}>auto</td>
      <td style={{ padding: '5px 8px' }}><input type="number" step="0.01" placeholder="0.00" value={d.per_foot} onChange={e => set('per_foot', e.target.value)} style={{ fontSize: 13, width: 84, textAlign: 'right' }} /></td>
      <td style={{ padding: '5px 8px' }}><input type="number" placeholder="10" value={d.sort_order} onChange={e => set('sort_order', e.target.value)} style={{ fontSize: 13, width: 50, textAlign: 'center' }} /></td>
      <td style={{ padding: '5px 8px' }}>
        <button className="btn-primary btn-sm" onClick={submit} disabled={adding || !d.variant_code.trim() || !d.variant_name.trim()}>
          {adding ? '…' : '+ Add'}
        </button>
      </td>
    </tr>
  )
}

// ── Single category accordion ─────────────────────────────────
function CategorySection({ cat, editingId, savingId, addingCat, deletingId, onEdit, onAdd, onDelete }) {
  const [open, setOpen] = useState(false)

  const TH = ({ children, right, center, w }) => (
    <th style={{
      padding: '6px 8px',
      textAlign: right ? 'right' : center ? 'center' : 'left',
      fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
      color: 'var(--gray-400)', background: 'var(--gray-50)',
      borderBottom: '1px solid var(--gray-200)', width: w, whiteSpace: 'nowrap',
    }}>{children}</th>
  )

  return (
    <div className="card" style={{ marginBottom: 10, padding: 0, overflow: 'hidden' }}>
      <div onClick={() => setOpen(o => !o)} style={{
        padding: '10px 16px', background: 'var(--gray-50)',
        borderBottom: open ? '1px solid var(--gray-200)' : 'none',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        cursor: 'pointer', userSelect: 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 26, height: 26, borderRadius: 6,
            background: 'var(--blue)', color: 'white', fontSize: 12, fontWeight: 700, flexShrink: 0,
          }}>{cat.code}</span>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)' }}>{cat.name}</span>
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
            {cat.variants.length} variant{cat.variants.length !== 1 ? 's' : ''}
          </span>
        </div>
        <span style={{ color: 'var(--gray-400)', fontSize: 14 }}>{open ? '▾' : '▸'}</span>
      </div>

      {open && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr>
              <TH w={90}>Code</TH>
              <TH>Variant Name</TH>
              <TH right w={100}>Bid Price</TH>
              <TH center w={70}>Divisor</TH>
              <TH right w={100}>Your Cost</TH>
              <TH right w={110}>Per Foot</TH>
              <TH center w={60}>Sort</TH>
              <TH w={140}>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {cat.variants.map(v =>
              editingId === v.id ? (
                <EditRow key={v.id} v={v} cat={cat}
                  onSave={data => onEdit(v.id, data)}
                  onCancel={() => onEdit(null, null)}
                  saving={savingId === v.id} />
              ) : (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ padding: '8px 8px', color: 'var(--gray-500)', fontFamily: 'monospace', fontSize: 11 }}>
                    {v.variant_code}
                  </td>
                  <td style={{ padding: '8px 8px' }}>{v.variant_name}</td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>
                    {fmt(v.per_kit)}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'center', fontSize: 12,
                    color: v.markup_divisor < 1.0 ? '#166534' : 'var(--gray-300)' }}>
                    {v.markup_divisor < 1.0 ? v.markup_divisor.toFixed(2) : '—'}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: 12,
                    color: v.markup_divisor < 1.0 ? 'var(--gray-600)' : 'var(--gray-300)' }}>
                    {v.markup_divisor < 1.0
                      ? <span>
                          {fmt(v.internal_cost)}
                          <span style={{ marginLeft: 4, fontSize: 10, color: '#16a34a', fontWeight: 600 }}>
                            {v.margin_pct}%
                          </span>
                        </span>
                      : '—'}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'right',
                    color: v.per_foot > 0 ? 'var(--gray-700)' : 'var(--gray-300)' }}>
                    {v.per_foot > 0 ? `$${v.per_foot.toFixed(2)}/ft` : '—'}
                  </td>
                  <td style={{ padding: '8px 8px', textAlign: 'center', color: 'var(--gray-400)', fontSize: 12 }}>
                    {v.sort_order}
                  </td>
                  <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                    <button className="btn-secondary btn-sm" onClick={() => onEdit(v.id, null)} style={{ marginRight: 6 }}>Edit</button>
                    <button className="btn-danger btn-sm" onClick={() => onDelete(v)} disabled={deletingId === v.id}>
                      {deletingId === v.id ? '…' : 'Remove'}
                    </button>
                  </td>
                </tr>
              )
            )}
            <AddRow cat={cat} onAdd={onAdd} adding={addingCat === cat.code} />
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function KitAdmin() {
  const queryClient = useQueryClient()
  const [editingId,  setEditingId]  = useState(null)
  const [savingId,   setSavingId]   = useState(null)
  const [addingCat,  setAddingCat]  = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ['kit-variants'],
    queryFn:  kit.variants,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => kit.updateVariant(id, data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['kit-variants'] }); setEditingId(null); setSavingId(null) },
    onError:    () => setSavingId(null),
  })
  const createMut = useMutation({
    mutationFn: (data) => kit.createVariant(data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['kit-variants'] }); setAddingCat(null) },
    onError:    () => setAddingCat(null),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => kit.removeVariant(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['kit-variants'] }); setDeletingId(null) },
    onError:    () => setDeletingId(null),
  })

  function handleEdit(id, data) {
    if (id === null)   { setEditingId(null); return }
    if (data === null) { setEditingId(id);   return }
    setSavingId(id)
    updateMut.mutate({ id, data })
  }
  function handleAdd(catCode, data) { setAddingCat(catCode); createMut.mutate(data) }
  function handleDelete(v) {
    if (!window.confirm(`Remove "${v.variant_name}"?\n\nHides it from the kit picker but keeps existing bid line items.`)) return
    setDeletingId(v.id)
    deleteMut.mutate(v.id)
  }

  const totalVariants = categories.reduce((s, c) => s + c.variants.length, 0)

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kit Pricing</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {isLoading ? 'Loading…' : `${categories.length} categories · ${totalVariants} variants`}
          </div>
        </div>
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>}
      {isError   && <div className="empty-state"><p>Failed to load kit pricing. Check API connection.</p></div>}

      {!isLoading && !isError && categories.map(cat => (
        <CategorySection
          key={cat.code} cat={cat}
          editingId={editingId} savingId={savingId} addingCat={addingCat} deletingId={deletingId}
          onEdit={handleEdit}
          onAdd={(data) => handleAdd(cat.code, data)}
          onDelete={handleDelete}
        />
      ))}
    </div>
  )
}
