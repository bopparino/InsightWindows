import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kit } from '../api/client'

const CATEGORIES = [
  { id: 'sheet_metal', label: 'Sheet Metal' },
  { id: 'flex_line',   label: 'Flex Duct' },
  { id: 'refrigerant', label: 'Refrigerant' },
  { id: 'drain',       label: 'Drain / Condensate' },
  { id: 'mastic',      label: 'Mastic' },
  { id: 'misc',        label: 'Miscellaneous' },
]

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c.label]))

const EMPTY_FORM = {
  category: 'sheet_metal',
  description: '',
  base_price: '',
  price_per_ton: '',
  unit: '',
  sort_order: '',
}

function fmt(val) {
  const n = parseFloat(val)
  return isNaN(n) ? '—' : `$${n.toFixed(2)}`
}

// ── Inline edit row ───────────────────────────────────────────
function EditRow({ item, onSave, onCancel, saving }) {
  const [draft, setDraft] = useState({
    description:   item.description,
    base_price:    String(item.base_price),
    price_per_ton: String(item.price_per_ton),
    unit:          item.unit,
    sort_order:    String(item.sort_order),
  })

  function set(field, value) {
    setDraft(d => ({ ...d, [field]: value }))
  }

  function handleSave() {
    onSave({
      category:      item.category,
      description:   draft.description,
      base_price:    parseFloat(draft.base_price) || 0,
      price_per_ton: parseFloat(draft.price_per_ton) || 0,
      unit:          draft.unit,
      sort_order:    parseInt(draft.sort_order, 10) || 0,
    })
  }

  const inputStyle = {
    padding: '4px 7px',
    fontSize: 13,
    border: '1px solid var(--gray-300)',
    borderRadius: 5,
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <tr style={{ background: '#fafbff', borderBottom: '1px solid var(--gray-200)' }}>
      <td style={{ padding: '6px 10px' }}>
        <input
          style={{ ...inputStyle, width: 64 }}
          type="number"
          value={draft.sort_order}
          onChange={e => set('sort_order', e.target.value)}
        />
      </td>
      <td style={{ padding: '6px 10px' }}>
        <input
          style={inputStyle}
          type="text"
          value={draft.description}
          onChange={e => set('description', e.target.value)}
        />
      </td>
      <td style={{ padding: '6px 10px' }}>
        <input
          style={{ ...inputStyle, width: 90 }}
          type="number"
          step="0.01"
          value={draft.base_price}
          onChange={e => set('base_price', e.target.value)}
        />
      </td>
      <td style={{ padding: '6px 10px' }}>
        <input
          style={{ ...inputStyle, width: 90 }}
          type="number"
          step="0.01"
          value={draft.price_per_ton}
          onChange={e => set('price_per_ton', e.target.value)}
        />
      </td>
      <td style={{ padding: '6px 10px' }}>
        <input
          style={{ ...inputStyle, width: 80 }}
          type="text"
          value={draft.unit}
          onChange={e => set('unit', e.target.value)}
        />
      </td>
      <td style={{ padding: '6px 10px', whiteSpace: 'nowrap' }}>
        <button
          className="btn-primary btn-sm"
          onClick={handleSave}
          disabled={saving}
          style={{ marginRight: 6 }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button className="btn-secondary btn-sm" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </td>
    </tr>
  )
}

// ── Read-only row ─────────────────────────────────────────────
function ViewRow({ item, onEdit, onDelete, deleting }) {
  return (
    <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
      <td style={{ padding: '8px 12px', color: 'var(--gray-400)', fontSize: 12,
        textAlign: 'center' }}>
        {item.sort_order}
      </td>
      <td style={{ padding: '8px 12px' }}>{item.description}</td>
      <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>
        {fmt(item.base_price)}
      </td>
      <td style={{ padding: '8px 12px', textAlign: 'right',
        color: item.price_per_ton > 0 ? 'var(--gray-700)' : 'var(--gray-300)' }}>
        {item.price_per_ton > 0 ? fmt(item.price_per_ton) : '—'}
      </td>
      <td style={{ padding: '8px 12px', color: 'var(--gray-400)', fontSize: 12,
        textAlign: 'center' }}>
        {item.unit || '—'}
      </td>
      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
        <button
          className="btn-secondary btn-sm"
          onClick={() => onEdit(item)}
          title="Edit"
          style={{ marginRight: 6 }}
        >
          Edit
        </button>
        <button
          className="btn-secondary btn-sm"
          onClick={() => onDelete(item)}
          disabled={deleting}
          style={{ color: 'var(--red, #dc2626)' }}
        >
          Delete
        </button>
      </td>
    </tr>
  )
}

// ── Add item form ─────────────────────────────────────────────
function AddForm({ onAdd, adding, onClose }) {
  const [form, setForm] = useState(EMPTY_FORM)

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    onAdd({
      category:      form.category,
      description:   form.description,
      base_price:    parseFloat(form.base_price) || 0,
      price_per_ton: parseFloat(form.price_per_ton) || 0,
      unit:          form.unit,
      sort_order:    parseInt(form.sort_order, 10) || 0,
    })
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: 'var(--gray-500)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  }

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
  }

  return (
    <div className="card" style={{ marginBottom: 20, border: '1.5px solid var(--blue)',
      borderRadius: 10, padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16,
        color: 'var(--gray-800)' }}>
        Add Kit Item
      </div>
      <form onSubmit={handleSubmit}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: 14, marginBottom: 16 }}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Category</label>
            <select style={inputStyle} value={form.category}
              onChange={e => set('category', e.target.value)}>
              {CATEGORIES.map(c => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={labelStyle}>Description</label>
            <input
              style={inputStyle}
              type="text"
              required
              placeholder="e.g. 6-in flex duct (per foot)"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Base Price ($)</label>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.base_price}
              onChange={e => set('base_price', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Per-Ton Adder ($/ton)</label>
            <input
              style={inputStyle}
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.price_per_ton}
              onChange={e => set('price_per_ton', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Unit</label>
            <input
              style={inputStyle}
              type="text"
              placeholder="e.g. ft, lb, each"
              value={form.unit}
              onChange={e => set('unit', e.target.value)}
            />
          </div>
          <div>
            <label style={labelStyle}>Sort #</label>
            <input
              style={inputStyle}
              type="number"
              min="0"
              placeholder="0"
              value={form.sort_order}
              onChange={e => set('sort_order', e.target.value)}
            />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="submit" className="btn-primary" disabled={adding}>
            {adding ? 'Adding...' : 'Add Item'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function KitAdmin() {
  const queryClient = useQueryClient()
  const [editingId, setEditingId]   = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)

  const { data: items = [], isLoading, isError } = useQuery({
    queryKey: ['kit-items'],
    queryFn:  kit.list,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => kit.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kit-items'] })
      setEditingId(null)
    },
  })

  const createMutation = useMutation({
    mutationFn: (data) => kit.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kit-items'] })
      setShowAddForm(false)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => kit.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kit-items'] })
    },
  })

  function handleEdit(item) {
    setEditingId(item.id)
    setShowAddForm(false)
  }

  function handleSave(id, data) {
    updateMutation.mutate({ id, data })
  }

  function handleDelete(item) {
    if (!window.confirm(`Delete "${item.description}"? This cannot be undone.`)) return
    deleteMutation.mutate(item.id)
  }

  // Group items by category, sorted within each group
  const grouped = CATEGORIES.map(cat => ({
    ...cat,
    items: items
      .filter(i => i.category === cat.id)
      .sort((a, b) => a.sort_order - b.sort_order),
  })).filter(cat => cat.items.length > 0)

  const thStyle = {
    padding: '7px 12px',
    textAlign: 'left',
    fontWeight: 600,
    fontSize: 11,
    color: 'var(--gray-400)',
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    background: 'var(--gray-50)',
    borderBottom: '1px solid var(--gray-200)',
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Kit Item Pricing</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            Manage consumable pricing used in the Kit Calculator
          </div>
        </div>
        <button
          className="btn-primary"
          onClick={() => { setShowAddForm(v => !v); setEditingId(null) }}
        >
          {showAddForm ? 'Cancel' : '+ Add item'}
        </button>
      </div>

      {/* Pricing formula note */}
      <div style={{
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        borderRadius: 8,
        padding: '10px 16px',
        fontSize: 13,
        color: '#1e40af',
        marginBottom: 20,
      }}>
        <strong>Pricing formula:</strong> Final price = base price + (per-ton adder x tonnage).
        Items with no per-ton adder use base price only.
      </div>

      {/* Add form */}
      {showAddForm && (
        <AddForm
          onAdd={data => createMutation.mutate(data)}
          adding={createMutation.isPending}
          onClose={() => setShowAddForm(false)}
        />
      )}

      {/* Loading / error / empty states */}
      {isLoading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <span className="spinner" />
        </div>
      )}

      {isError && (
        <div className="empty-state">
          <p>Failed to load kit items. Check the API connection.</p>
        </div>
      )}

      {!isLoading && !isError && items.length === 0 && (
        <div className="empty-state">
          <p>No kit items found.</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>
            Use the <strong>+ Add item</strong> button above, or run{' '}
            <code style={{ background: 'var(--gray-100)', padding: '2px 6px',
              borderRadius: 4 }}>python db/seed_kit_items.py</code> to seed defaults.
          </p>
        </div>
      )}

      {/* Category tables */}
      {!isLoading && !isError && grouped.map(cat => (
        <div key={cat.id} className="card" style={{ marginBottom: 18, padding: 0,
          overflow: 'hidden' }}>
          {/* Category header row */}
          <div style={{
            padding: '10px 16px',
            background: 'var(--gray-50)',
            borderBottom: '1px solid var(--gray-200)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-700)' }}>
              {cat.label}
            </span>
            <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              {cat.items.length} item{cat.items.length !== 1 ? 's' : ''}
            </span>
          </div>

          <table className="table" style={{ marginBottom: 0, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ ...thStyle, textAlign: 'center', width: 70 }}>Sort #</th>
                <th style={thStyle}>Description</th>
                <th style={{ ...thStyle, textAlign: 'right', width: 120 }}>Base Price ($)</th>
                <th style={{ ...thStyle, textAlign: 'right', width: 140 }}>Per-Ton Adder ($/ton)</th>
                <th style={{ ...thStyle, textAlign: 'center', width: 90 }}>Unit</th>
                <th style={{ ...thStyle, width: 150 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cat.items.map(item =>
                editingId === item.id ? (
                  <EditRow
                    key={item.id}
                    item={item}
                    onSave={data => handleSave(item.id, data)}
                    onCancel={() => setEditingId(null)}
                    saving={updateMutation.isPending}
                  />
                ) : (
                  <ViewRow
                    key={item.id}
                    item={item}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    deleting={deleteMutation.isPending && deleteMutation.variables === item.id}
                  />
                )
              )}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}
