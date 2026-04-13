/**
 * KitAdmin — Kit Pricing "bible"
 *
 * Categories A–U with variants. Per_kit = bid price (what builder pays).
 * markup_divisor < 1.0 means the item has an embedded margin:
 *   internal cost = per_kit × markup_divisor
 *   margin %      = (1 − markup_divisor) × 100
 *
 * Each variant can have template components (KitComponent) that define
 * what gets snapshotted into a bid when the kit is selected.
 */
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kit } from '../api/client'
import ConfirmModal from '../components/ConfirmModal'
import { useToast } from '../context/ToastContext'

function fmt(n) { return n > 0 ? `$${Number(n).toFixed(2)}` : '—' }
function fmtCost(n) { return n > 0 ? `$${Number(n).toFixed(4)}` : '$0.0000' }

// ── Component Editor (per-variant template components) ────────
function ComponentEditor({ variant }) {
  const queryClient = useQueryClient()
  const qKey = ['kit-components', variant.id]

  const { data: components = [], isLoading } = useQuery({
    queryKey: qKey,
    queryFn:  () => kit.listComponents(variant.id),
  })

  const EMPTY = { description: '', part_number: '', quantity: '1', unit_cost: '', sort_order: '10' }
  const [newRow, setNewRow] = useState(EMPTY)
  const [editId, setEditId] = useState(null)
  const [editRow, setEditRow] = useState({})
  const [confirm, setConfirm] = useState(null)

  const addMut = useMutation({
    mutationFn: (data) => kit.addComponent(variant.id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); setNewRow(EMPTY) },
  })
  const updateMut = useMutation({
    mutationFn: ({ id, data }) => kit.updateComponent(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: qKey }); setEditId(null) },
  })
  const removeMut = useMutation({
    mutationFn: (id) => kit.removeComponent(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qKey }),
  })

  function startEdit(c) {
    setEditId(c.id)
    setEditRow({ description: c.description, part_number: c.part_number || '', quantity: String(c.quantity), unit_cost: String(c.unit_cost), sort_order: String(c.sort_order) })
  }

  function submitEdit() {
    updateMut.mutate({ id: editId, data: {
      description: editRow.description.trim(),
      part_number: editRow.part_number.trim() || null,
      quantity:    parseFloat(editRow.quantity) || 1,
      unit_cost:   parseFloat(editRow.unit_cost) || 0,
      sort_order:  parseInt(editRow.sort_order, 10) || 10,
    }})
  }

  function submitNew() {
    if (!newRow.description.trim()) return
    addMut.mutate({
      description: newRow.description.trim(),
      part_number: newRow.part_number.trim() || null,
      quantity:    parseFloat(newRow.quantity) || 1,
      unit_cost:   parseFloat(newRow.unit_cost) || 0,
      sort_order:  parseInt(newRow.sort_order, 10) || 10,
    })
  }

  const inputStyle = { fontSize: 12, padding: '3px 5px', width: '100%' }
  const tdStyle    = { padding: '4px 6px', verticalAlign: 'middle' }

  return (
    <div style={{ padding: '10px 16px 14px', background: 'var(--gray-50)', borderTop: '1px solid var(--gray-200)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 8 }}>
        Template Components — {variant.variant_name}
      </div>

      {isLoading ? (
        <span className="spinner" style={{ width: 16, height: 16 }} />
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr>
              {['Sort', 'Description', 'Part #', 'Qty', 'Unit Cost', 'Ext Cost', ''].map((h, i) => (
                <th key={i} style={{ padding: '4px 6px', textAlign: i >= 3 ? 'right' : 'left', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-400)', borderBottom: '1px solid var(--gray-200)', whiteSpace: 'nowrap', width: i === 6 ? 100 : undefined }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {components.map(c => (
              editId === c.id ? (
                <tr key={c.id} style={{ background: 'var(--blue-light)' }}>
                  <td style={tdStyle}><input type="number" value={editRow.sort_order} onChange={e => setEditRow(r => ({...r, sort_order: e.target.value}))} style={{ ...inputStyle, width: 48, textAlign: 'center' }} /></td>
                  <td style={tdStyle}><input value={editRow.description} onChange={e => setEditRow(r => ({...r, description: e.target.value}))} style={inputStyle} /></td>
                  <td style={tdStyle}><input value={editRow.part_number} onChange={e => setEditRow(r => ({...r, part_number: e.target.value}))} style={{ ...inputStyle, width: 90 }} /></td>
                  <td style={tdStyle}><input type="number" step="0.001" value={editRow.quantity} onChange={e => setEditRow(r => ({...r, quantity: e.target.value}))} style={{ ...inputStyle, width: 60, textAlign: 'right' }} /></td>
                  <td style={tdStyle}><input type="number" step="0.0001" value={editRow.unit_cost} onChange={e => setEditRow(r => ({...r, unit_cost: e.target.value}))} style={{ ...inputStyle, width: 80, textAlign: 'right' }} /></td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--gray-500)' }}>
                    {fmtCost((parseFloat(editRow.quantity) || 0) * (parseFloat(editRow.unit_cost) || 0))}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button className="btn-primary btn-sm" onClick={submitEdit} disabled={updateMut.isPending} style={{ marginRight: 4 }}>Save</button>
                    <button className="btn-secondary btn-sm" onClick={() => setEditId(null)}>✕</button>
                  </td>
                </tr>
              ) : (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                  <td style={{ ...tdStyle, textAlign: 'center', color: 'var(--gray-400)' }}>{c.sort_order}</td>
                  <td style={tdStyle}>{c.description}</td>
                  <td style={{ ...tdStyle, color: 'var(--gray-500)', fontFamily: 'monospace', fontSize: 11 }}>{c.part_number || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{c.quantity}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{fmtCost(c.unit_cost)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--gray-500)' }}>{fmtCost(c.extended_cost)}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button className="btn-secondary btn-sm" onClick={() => startEdit(c)} style={{ marginRight: 4 }}>Edit</button>
                    <button className="btn-danger btn-sm" onClick={() => setConfirm({ title: 'Remove component?', message: `"${c.description}" will be removed from this kit template.`, confirmLabel: 'Remove', onConfirm: () => removeMut.mutate(c.id) })} disabled={removeMut.isPending}>✕</button>
                  </td>
                </tr>
              )
            ))}

            {/* Add new component row */}
            <tr style={{ background: 'var(--card-bg)', borderTop: '1px dashed var(--gray-200)' }}>
              <td style={tdStyle}><input type="number" placeholder="10" value={newRow.sort_order} onChange={e => setNewRow(r => ({...r, sort_order: e.target.value}))} style={{ ...inputStyle, width: 48, textAlign: 'center' }} /></td>
              <td style={tdStyle}><input placeholder="Description" value={newRow.description} onChange={e => setNewRow(r => ({...r, description: e.target.value}))} style={inputStyle} /></td>
              <td style={tdStyle}><input placeholder="Part #" value={newRow.part_number} onChange={e => setNewRow(r => ({...r, part_number: e.target.value}))} style={{ ...inputStyle, width: 90 }} /></td>
              <td style={tdStyle}><input type="number" step="0.001" placeholder="1" value={newRow.quantity} onChange={e => setNewRow(r => ({...r, quantity: e.target.value}))} style={{ ...inputStyle, width: 60, textAlign: 'right' }} /></td>
              <td style={tdStyle}><input type="number" step="0.0001" placeholder="0.00" value={newRow.unit_cost} onChange={e => setNewRow(r => ({...r, unit_cost: e.target.value}))} style={{ ...inputStyle, width: 80, textAlign: 'right' }} /></td>
              <td style={{ ...tdStyle, textAlign: 'right', color: 'var(--gray-400)', fontSize: 11 }}>
                {fmtCost((parseFloat(newRow.quantity) || 0) * (parseFloat(newRow.unit_cost) || 0))}
              </td>
              <td style={tdStyle}>
                <button className="btn-primary btn-sm" onClick={submitNew} disabled={addMut.isPending || !newRow.description.trim()}>
                  {addMut.isPending ? '…' : '+ Add'}
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      )}

      {components.length > 0 && (
        <div style={{ marginTop: 6, textAlign: 'right', fontSize: 11, color: 'var(--gray-400)' }}>
          Total template cost: <strong style={{ color: 'var(--gray-600)' }}>
            {fmtCost(components.reduce((s, c) => s + c.extended_cost, 0))}
          </strong>
        </div>
      )}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

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
      <td style={{ padding: '5px 8px', color: 'var(--gray-400)', fontSize: 12, textAlign: 'right' }}>
        {(() => { const c = (parseFloat(d.per_kit) || 0) * (parseFloat(d.markup_divisor) || 1); return c > 0 ? `$${c.toFixed(2)}` : '—' })()}
      </td>
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
  const [expandedComponents, setExpandedComponents] = useState(new Set())

  function toggleComponents(variantId) {
    setExpandedComponents(prev => {
      const next = new Set(prev)
      next.has(variantId) ? next.delete(variantId) : next.add(variantId)
      return next
    })
  }

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
              <TH center w={70}>Margin</TH>
              <TH right w={100}>Your Cost</TH>
              <TH right w={110}>Per Foot</TH>
              <TH center w={60}>Sort</TH>
              <TH w={100}>Price Set</TH>
              <TH w={190}>Actions</TH>
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
                <>
                  <tr key={v.id} style={{ borderBottom: expandedComponents.has(v.id) ? 'none' : '1px solid var(--gray-100)' }}>
                    <td style={{ padding: '8px 8px', color: 'var(--gray-500)', fontFamily: 'monospace', fontSize: 11 }}>
                      {v.variant_code}
                    </td>
                    <td style={{ padding: '8px 8px' }}>{v.variant_name}</td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontWeight: 600 }}>
                      {fmt(v.per_kit)}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'center', fontSize: 12,
                      color: v.markup_divisor < 1.0 ? '#166534' : 'var(--gray-300)' }}>
                      {v.markup_divisor < 1.0 ? `${v.margin_pct}%` : '—'}
                    </td>
                    <td style={{ padding: '8px 8px', textAlign: 'right', fontSize: 12,
                      color: v.markup_divisor < 1.0 ? 'var(--gray-600)' : 'var(--gray-300)' }}>
                      {v.markup_divisor < 1.0
                        ? <span>
                            {fmt(v.internal_cost)}
                            <span style={{ marginLeft: 4, fontSize: 10, color: 'var(--success)', fontWeight: 600 }}>
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
                    <td style={{ padding: '8px 8px', fontSize: 11, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>
                      {v.price_updated_at
                        ? new Date(v.price_updated_at).toLocaleDateString()
                        : '—'}
                    </td>
                    <td style={{ padding: '8px 8px', whiteSpace: 'nowrap' }}>
                      <button className="btn-secondary btn-sm" onClick={() => toggleComponents(v.id)} style={{ marginRight: 6 }}>
                        {expandedComponents.has(v.id) ? 'Hide Parts' : 'Parts'}
                      </button>
                      <button className="btn-secondary btn-sm" onClick={() => onEdit(v.id, null)} style={{ marginRight: 6 }}>Edit</button>
                      <button className="btn-danger btn-sm" onClick={() => onDelete(v)} disabled={deletingId === v.id}>
                        {deletingId === v.id ? '…' : 'Remove'}
                      </button>
                    </td>
                  </tr>
                  {expandedComponents.has(v.id) && (
                    <tr key={`${v.id}-components`} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td colSpan={9} style={{ padding: 0 }}>
                        <ComponentEditor variant={v} />
                      </td>
                    </tr>
                  )}
                </>
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
  const toast = useToast()
  const [editingId,  setEditingId]  = useState(null)
  const [savingId,   setSavingId]   = useState(null)
  const [addingCat,  setAddingCat]  = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [confirm,    setConfirm]    = useState(null)

  const { data: categories = [], isLoading, isError } = useQuery({
    queryKey: ['kit-variants'],
    queryFn:  kit.variants,
  })

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => kit.updateVariant(id, data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['kit-variants'] }); setEditingId(null); setSavingId(null); toast.success('Kit variant saved') },
    onError:    () => setSavingId(null),
  })
  const createMut = useMutation({
    mutationFn: (data) => kit.createVariant(data),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['kit-variants'] }); setAddingCat(null); toast.success('Kit variant added') },
    onError:    () => setAddingCat(null),
  })
  const deleteMut = useMutation({
    mutationFn: (id) => kit.removeVariant(id),
    onSuccess:  () => { queryClient.invalidateQueries({ queryKey: ['kit-variants'] }); setDeletingId(null); toast.success('Kit variant removed') },
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
    setConfirm({
      title: `Remove "${v.variant_name}"?`,
      message: 'Hides it from the kit picker. Existing bid line items are unaffected.',
      confirmLabel: 'Remove',
      onConfirm: () => { setDeletingId(v.id); deleteMut.mutate(v.id) },
    })
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
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}
