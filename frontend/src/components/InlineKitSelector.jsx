/**
 * InlineKitSelector
 *
 * Displays kit categories grouped by type as chip rows. Click a chip to
 * expand it in-place — shows variants + optional footage input + Add button.
 */
import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kit, lineItems } from '../api/client'

function currency(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Category groups — codes map to A-W
const CATEGORY_GROUPS = [
  { label: 'Ductwork',     codes: ['A','B'] },
  { label: 'Venting',      codes: ['C','D','E','F','G'] },
  { label: 'Mechanical',   codes: ['H','I','J','K','L'] },
  { label: 'IAQ',          codes: ['M','N','O','V','W'] },
  { label: 'Fresh Air',    codes: ['R'] },
  { label: 'Accessories',  codes: ['P','Q','S','T','U'] },
]

export default function InlineKitSelector({ planId, systemId }) {
  const qc = useQueryClient()
  const [activeCode, setActiveCode] = useState(null)
  const [variantId, setVariantId] = useState('')
  const [footage, setFootage] = useState('')
  const [qty, setQty] = useState('1')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['kit-variants'],
    queryFn:  kit.variants,
  })

  const variantsByCode = useMemo(() => {
    const map = {}
    for (const cat of categories) map[cat.code] = cat.variants
    return map
  }, [categories])

  const activeVariants = activeCode ? (variantsByCode[activeCode] || []) : []
  const selectedVariant = activeVariants.find(v => String(v.id) === String(variantId))
  const needsFootage = selectedVariant?.per_foot > 0

  const price = useMemo(() => {
    if (!selectedVariant) return 0
    const ft = parseFloat(footage) || 0
    return selectedVariant.per_kit + (needsFootage ? ft * selectedVariant.per_foot : 0)
  }, [selectedVariant, footage, needsFootage])

  const addItem = useMutation({
    mutationFn: (data) => lineItems.add(planId, systemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', String(planId)] })
      // Reset variant/footage/qty but keep category open for fast multi-add
      setVariantId('')
      setFootage('')
      setQty('1')
    },
  })

  function handleAdd() {
    if (!selectedVariant) return
    const ft = parseFloat(footage) || 0
    const q  = parseFloat(qty) || 1
    const desc = needsFootage && ft > 0
      ? `${selectedVariant.variant_name} (${ft} ft)`
      : selectedVariant.variant_name

    addItem.mutate({
      description:   desc,
      quantity:      q,
      unit_price:    parseFloat(price.toFixed(4)),
      category_code: activeCode,
      sort_order:    50,
      part_number:   selectedVariant.variant_code,
      kit_variant_id: selectedVariant.id,
    })
  }

  function toggleCategory(code) {
    if (activeCode === code) {
      setActiveCode(null)
    } else {
      setActiveCode(code)
      setVariantId('')
      setFootage('')
      setQty('1')
    }
  }

  if (isLoading) return (
    <div style={{ fontSize: 12, color: 'var(--gray-400)', padding: '6px 0' }}>
      Loading kit categories…
    </div>
  )

  if (categories.length === 0) return null

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 8 }}>
        Kit Pricing
      </div>

      {/* Category chips — grouped by type */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: activeCode ? 10 : 0 }}>
        {CATEGORY_GROUPS.map(group => {
          const groupCats = categories.filter(c => group.codes.includes(c.code))
          if (groupCats.length === 0) return null
          return (
            <div key={group.label} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: 'var(--gray-400)',
                minWidth: 72, flexShrink: 0,
              }}>{group.label}</span>
              {groupCats.map(cat => {
                const isActive = activeCode === cat.code
                return (
                  <button
                    key={cat.code}
                    onClick={() => toggleCategory(cat.code)}
                    style={{
                      padding: '4px 9px',
                      borderRadius: 4,
                      border: `1px solid ${isActive ? 'var(--blue)' : 'var(--gray-200)'}`,
                      background: isActive ? 'var(--blue)' : 'var(--gray-50)',
                      color: isActive ? 'white' : 'var(--gray-700)',
                      fontSize: 12,
                      fontWeight: isActive ? 700 : 400,
                      cursor: 'pointer',
                      transition: 'all 0.1s',
                    }}
                  >
                    {cat.name}
                  </button>
                )
              })}
            </div>
          )
        })}
      </div>

      {/* Expanded category picker */}
      {activeCode && (
        <div style={{
          background: 'var(--blue-light)',
          border: '1px solid var(--blue-mid)',
          borderRadius: 'var(--radius)',
          padding: '12px 14px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'flex-end',
        }}>
          {/* Variant select */}
          <div style={{ flex: '1 1 220px', minWidth: 180 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)',
              marginBottom: 4 }}>Variant</div>
            <select
              value={variantId}
              onChange={e => { setVariantId(e.target.value); setFootage('') }}
              style={{ width: '100%', fontSize: 13 }}
              autoFocus
            >
              <option value="">— Select variant —</option>
              {activeVariants.map(v => (
                <option key={v.id} value={v.id}>
                  {v.variant_name}
                  {v.per_foot > 0 ? ' (per ft)' : ''}
                  {' — ' + currency(v.per_kit)}
                  {v.per_foot > 0 ? ' + ' + currency(v.per_foot) + '/ft' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Footage — only if variant has per_foot */}
          {needsFootage && (
            <div style={{ width: 90 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>
                Footage
              </div>
              <input
                type="number" min="0" step="1"
                value={footage}
                onChange={e => setFootage(e.target.value)}
                placeholder="ft"
                style={{ width: '100%', fontSize: 13 }}
              />
            </div>
          )}

          {/* Qty */}
          <div style={{ width: 70 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--blue)', marginBottom: 4 }}>
              Qty
            </div>
            <input
              type="number" min="1" step="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
            />
          </div>

          {/* Price preview */}
          {selectedVariant && (
            <div style={{ minWidth: 80, textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: 'var(--blue)', marginBottom: 4 }}>Price</div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--blue)' }}>
                {currency(price * (parseFloat(qty) || 1))}
              </div>
            </div>
          )}

          {/* Add button */}
          <button
            className="btn-primary btn-sm"
            disabled={!selectedVariant || (needsFootage && !footage) || addItem.isPending}
            onClick={handleAdd}
            style={{ height: 36, padding: '0 18px', fontSize: 13 }}
          >
            {addItem.isPending ? '…' : '+ Add'}
          </button>
        </div>
      )}
    </div>
  )
}
