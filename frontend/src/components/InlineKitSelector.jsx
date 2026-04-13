/**
 * InlineKitSelector
 *
 * Displays kit categories as a bento tile grid. Click a tile to expand it
 * in-place — shows variant picker with footage input + Add button.
 * Tiles show a checkmark when at least one item has been added from that category.
 */
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kit, lineItems } from '../api/client'

function currency(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Category groups — codes map to A-X
const CATEGORY_GROUPS = [
  { label: 'Ductwork',     codes: ['A','B'] },
  { label: 'Venting',      codes: ['C','D','E','F','G'] },
  { label: 'Mechanical',   codes: ['H','I','J','K','L'] },
  { label: 'IAQ',          codes: ['M','N','O','V','W'] },
  { label: 'Fresh Air',    codes: ['R'] },
  { label: 'Accessories',  codes: ['P','Q','S','T','U'] },
  { label: 'Controls',     codes: ['X'] },
]

export default function InlineKitSelector({ planId, systemId, existingCategoryCodes = [] }) {
  const qc = useQueryClient()
  const [activeCode, setActiveCode] = useState(null)
  const [variantId, setVariantId] = useState('')
  const [footage, setFootage] = useState('')
  const [qty, setQty] = useState('1')
  // Track categories where items were added in this session
  const [addedCodes, setAddedCodes] = useState(new Set())

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

  // Check if a category has items — either from existing line items or added this session
  const categoryHasItems = useCallback((code) => {
    return addedCodes.has(code) || existingCategoryCodes.includes(code)
  }, [addedCodes, existingCategoryCodes])

  const addItem = useMutation({
    mutationFn: (data) => lineItems.add(planId, systemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', String(planId)] })
      // Mark this category as having items
      setAddedCodes(prev => new Set([...prev, activeCode]))
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
      Loading kit categories...
    </div>
  )

  if (categories.length === 0) return null

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--gray-400)', marginBottom: 10 }}>
        Kit Pricing
      </div>

      {/* Category tile grid — grouped by type */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: activeCode ? 12 : 0 }}>
        {CATEGORY_GROUPS.map(group => {
          const groupCats = categories.filter(c => group.codes.includes(c.code))
          if (groupCats.length === 0) return null
          return (
            <div key={group.label}>
              <div style={{
                fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                letterSpacing: '0.07em', color: 'var(--gray-400)',
                marginBottom: 6,
              }}>{group.label}</div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                gap: 8,
              }}>
                {groupCats.map(cat => {
                  const isActive = activeCode === cat.code
                  const isDone = categoryHasItems(cat.code)
                  return (
                    <button
                      key={cat.code}
                      onClick={() => toggleCategory(cat.code)}
                      style={{
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        gap: 4, padding: '10px 6px',
                        minHeight: 80,
                        borderRadius: 'var(--radius)',
                        border: isActive
                          ? '2px solid var(--accent)'
                          : isDone
                            ? '2px solid var(--success)'
                            : '1.5px solid var(--gray-200)',
                        background: isActive
                          ? 'var(--accent)'
                          : isDone
                            ? 'var(--card-bg)'
                            : 'var(--card-bg)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                        position: 'relative',
                        boxShadow: isActive
                          ? '0 4px 12px rgba(0,0,0,0.1)'
                          : '0 1px 2px rgba(0,0,0,0.03)',
                      }}
                    >
                      {/* Category code badge */}
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 26, height: 26, borderRadius: 7,
                        background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
                        color: isActive ? '#fff' : 'white',
                        fontSize: 12, fontWeight: 800, letterSpacing: '0.02em',
                        flexShrink: 0,
                      }}>{cat.code}</span>

                      {/* Category name */}
                      <span style={{
                        fontSize: 11, fontWeight: 600, textAlign: 'center',
                        color: isActive ? '#fff' : 'var(--gray-700)',
                        lineHeight: 1.2, maxWidth: '100%',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                      }}>{cat.name}</span>

                      {/* Done checkmark */}
                      {isDone && !isActive && (
                        <span style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 16, height: 16, borderRadius: '50%',
                          background: 'var(--success)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, color: '#fff', fontWeight: 700,
                          lineHeight: 1,
                        }}>&#10003;</span>
                      )}

                      {/* Active indicator */}
                      {isActive && (
                        <span style={{
                          position: 'absolute', top: 4, right: 4,
                          width: 16, height: 16, borderRadius: '50%',
                          background: 'rgba(255,255,255,0.25)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 9, color: '#fff', fontWeight: 700,
                        }}>&#9660;</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {/* Expanded variant picker — renders below the group that contains the active tile */}
              {groupCats.some(c => c.code === activeCode) && (
                <div style={{
                  marginTop: 8,
                  background: 'var(--blue-light)',
                  border: '1px solid var(--blue-mid)',
                  borderRadius: 'var(--radius)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 10,
                  alignItems: 'flex-end',
                  animation: 'slideUp 0.12s ease',
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
                    {addItem.isPending ? '...' : '+ Add'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
