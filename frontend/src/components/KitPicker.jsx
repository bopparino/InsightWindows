/**
 * KitPicker — replaces KitCalculator
 *
 * UI: one row per kit selection (category dropdown → variant dropdown →
 * optional footage input → auto-priced). Queue multiple, then commit.
 * Plus a "Custom item" row at the bottom for one-off line items.
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { kit } from '../api/client'

const EMPTY_ROW = { categoryCode: '', variantId: '', footage: '', price: 0 }
const EMPTY_CUSTOM = { description: '', quantity: '1', unit_price: '' }

function currency(n) {
  return '$' + Number(n).toFixed(2)
}

export default function KitPicker({ zoneName, onAddItems, onClose }) {
  const [rows, setRows] = useState([{ ...EMPTY_ROW, _key: Date.now() }])
  const [custom, setCustom] = useState({ ...EMPTY_CUSTOM })
  const [customRows, setCustomRows] = useState([])

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['kit-variants'],
    queryFn:  kit.variants,
  })

  // Build lookup maps
  const variantsByCategory = useMemo(() => {
    const map = {}
    for (const cat of categories) map[cat.code] = cat.variants
    return map
  }, [categories])

  // ── Row helpers ──────────────────────────────────────────────

  function setRow(key, patch) {
    setRows(rs => rs.map(r => r._key === key ? { ...r, ...patch } : r))
  }

  function addRow() {
    setRows(rs => [...rs, { ...EMPTY_ROW, _key: Date.now() }])
  }

  function removeRow(key) {
    setRows(rs => rs.filter(r => r._key !== key))
  }

  function computePrice(row) {
    if (!row.variantId) return 0
    const variants = variantsByCategory[row.categoryCode] || []
    const v = variants.find(v => String(v.id) === String(row.variantId))
    if (!v) return 0
    const footage = parseFloat(row.footage) || 0
    return v.per_kit + (v.per_foot > 0 ? footage * v.per_foot : 0)
  }

  function getVariant(row) {
    const variants = variantsByCategory[row.categoryCode] || []
    return variants.find(v => String(v.id) === String(row.variantId))
  }

  // ── Custom item helpers ──────────────────────────────────────

  function addCustomRow() {
    const desc = custom.description.trim()
    const qty  = parseFloat(custom.quantity) || 1
    const price = parseFloat(custom.unit_price) || 0
    if (!desc) return
    setCustomRows(rs => [...rs, { ...custom, description: desc, quantity: qty, unit_price: price, _key: Date.now() }])
    setCustom({ ...EMPTY_CUSTOM })
  }

  function removeCustomRow(key) {
    setCustomRows(rs => rs.filter(r => r._key !== key))
  }

  // ── Build final line items ───────────────────────────────────

  const kitLineItems = rows
    .filter(r => r.variantId)
    .map(r => {
      const v       = getVariant(r)
      const footage = parseFloat(r.footage) || 0
      const price   = computePrice(r)
      const desc    = v.per_foot > 0 && footage > 0
        ? `${v.variant_name} (${footage} ft)`
        : v.variant_name
      return {
        description:  desc,
        quantity:     1,
        unit_price:   parseFloat(price.toFixed(4)),
        category_code: null,
        sort_order:   50,
        draw_stage:   null,
        part_number:  v.variant_code,
      }
    })

  const customLineItems = customRows.map(r => ({
    description:  r.description,
    quantity:     parseFloat(r.quantity) || 1,
    unit_price:   parseFloat(r.unit_price) || 0,
    category_code: null,
    sort_order:   60,
    draw_stage:   null,
    part_number:  null,
  }))

  const allItems   = [...kitLineItems, ...customLineItems]
  const grandTotal = allItems.reduce((s, i) => s + i.quantity * i.unit_price, 0)

  function handleAdd() {
    if (allItems.length === 0) return
    onAddItems(allItems)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 12, width: '100%', maxWidth: 780,
        maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          padding: '16px 22px', borderBottom: '1px solid var(--gray-200)',
          background: 'var(--blue)', borderRadius: '12px 12px 0 0',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>
              Kit Pricing
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'white' }}>{zoneName}</div>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.15)', color: 'white',
            border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 20, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 22px' }}>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
          ) : (
            <>
              {/* Column headers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 90px 90px 28px',
                gap: 8, marginBottom: 6,
              }}>
                {['Category', 'Variant', 'Footage', 'Price', ''].map(h => (
                  <div key={h} style={{
                    fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.05em', color: 'var(--gray-400)',
                  }}>{h}</div>
                ))}
              </div>

              {/* Kit rows */}
              {rows.map(row => {
                const variants    = variantsByCategory[row.categoryCode] || []
                const variant     = getVariant(row)
                const showFootage = variant && variant.per_foot > 0
                const price       = computePrice(row)

                return (
                  <div key={row._key} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 90px 90px 28px',
                    gap: 8, marginBottom: 8, alignItems: 'center',
                  }}>
                    {/* Category */}
                    <select
                      value={row.categoryCode}
                      onChange={e => setRow(row._key, {
                        categoryCode: e.target.value,
                        variantId: '',
                        footage: '',
                      })}
                      style={{ fontSize: 13 }}
                    >
                      <option value="">— Category —</option>
                      {categories.map(c => (
                        <option key={c.code} value={c.code}>{c.name}</option>
                      ))}
                    </select>

                    {/* Variant */}
                    <select
                      value={row.variantId}
                      onChange={e => setRow(row._key, { variantId: e.target.value, footage: '' })}
                      disabled={!row.categoryCode}
                      style={{ fontSize: 13 }}
                    >
                      <option value="">— Variant —</option>
                      {variants.map(v => (
                        <option key={v.id} value={v.id}>{v.variant_name}</option>
                      ))}
                    </select>

                    {/* Footage */}
                    {showFootage ? (
                      <input
                        type="number" min={0} step={1}
                        value={row.footage}
                        onChange={e => setRow(row._key, { footage: e.target.value })}
                        placeholder="ft"
                        style={{ fontSize: 13, width: '100%' }}
                      />
                    ) : (
                      <div style={{ fontSize: 12, color: 'var(--gray-300)', textAlign: 'center' }}>—</div>
                    )}

                    {/* Price */}
                    <div style={{
                      fontSize: 13, fontWeight: 600, textAlign: 'right',
                      color: price > 0 ? 'var(--gray-800)' : 'var(--gray-300)',
                    }}>
                      {price > 0 ? currency(price) : '—'}
                    </div>

                    {/* Remove */}
                    <button
                      onClick={() => removeRow(row._key)}
                      disabled={rows.length === 1}
                      style={{
                        background: 'none', border: 'none', color: 'var(--gray-300)',
                        fontSize: 18, lineHeight: 1, cursor: rows.length > 1 ? 'pointer' : 'default',
                        padding: 0,
                      }}>×</button>
                  </div>
                )
              })}

              {/* Add row button */}
              <button
                onClick={addRow}
                className="btn-secondary btn-sm"
                style={{ marginTop: 2, marginBottom: 20 }}>
                + Add another kit item
              </button>

              {/* Divider */}
              <div style={{
                borderTop: '1px solid var(--gray-200)',
                paddingTop: 16, marginBottom: 10,
              }}>
                <div style={{
                  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.05em', color: 'var(--gray-400)', marginBottom: 10,
                }}>Custom / One-off Items</div>

                {/* Queued custom rows */}
                {customRows.map(r => (
                  <div key={r._key} style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    marginBottom: 6, fontSize: 13,
                  }}>
                    <span style={{ flex: 1, color: 'var(--gray-700)' }}>{r.description}</span>
                    <span style={{ color: 'var(--gray-500)', whiteSpace: 'nowrap' }}>
                      {r.quantity} × {currency(r.unit_price)}
                    </span>
                    <span style={{ fontWeight: 600, minWidth: 70, textAlign: 'right' }}>
                      {currency(r.quantity * r.unit_price)}
                    </span>
                    <button onClick={() => removeCustomRow(r._key)}
                      style={{ background: 'none', border: 'none', color: 'var(--gray-300)',
                        fontSize: 16, cursor: 'pointer', padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                ))}

                {/* Custom input row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 90px auto', gap: 8, alignItems: 'center' }}>
                  <input
                    value={custom.description}
                    onChange={e => setCustom(c => ({ ...c, description: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addCustomRow()}
                    placeholder="Description"
                    style={{ fontSize: 13 }}
                  />
                  <input
                    type="number" min={0.01} step={0.01}
                    value={custom.quantity}
                    onChange={e => setCustom(c => ({ ...c, quantity: e.target.value }))}
                    placeholder="Qty"
                    style={{ fontSize: 13, width: '100%' }}
                  />
                  <input
                    type="number" min={0} step={0.01}
                    value={custom.unit_price}
                    onChange={e => setCustom(c => ({ ...c, unit_price: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addCustomRow()}
                    placeholder="Unit $"
                    style={{ fontSize: 13, width: '100%' }}
                  />
                  <button
                    onClick={addCustomRow}
                    disabled={!custom.description.trim()}
                    className="btn-secondary btn-sm">
                    Add
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--gray-200)',
          background: 'var(--gray-50)', borderRadius: '0 0 12px 12px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 13, color: 'var(--gray-500)' }}>
            {allItems.length > 0
              ? `${allItems.length} item${allItems.length !== 1 ? 's' : ''} — total ${currency(grandTotal)}`
              : 'Select kit items or add custom items above'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            <button
              className="btn-primary"
              disabled={allItems.length === 0}
              onClick={handleAdd}>
              {allItems.length === 0
                ? 'Nothing to add'
                : `Add ${allItems.length} item${allItems.length !== 1 ? 's' : ''} to bid`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
