/**
 * InlineKitSelector — Workflow-oriented kit picker
 *
 * 15 buttons matching the old bid system's workflow.
 * Each button opens a specialized sub-form:
 *   ModelPicker  — variant dropdown + qty (Stats, Fans, Exhaust, Fresh Air, Registers)
 *   FootageRun   — size pills + footage + qty (SM Runs, Ductboard)
 *   CustomItem   — description + qty + price (Sheet Metal, Round Trunk, Flex, etc.)
 *   BrowseAll    — grouped accordion of remaining categories (Misc)
 *   Report       — triggers bid report print
 */
import { useState, useMemo, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { kit, lineItems } from '../api/client'

const mono = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace"
const tacticalLabel = {
  fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.06em', color: 'var(--gray-400)',
}

function currency(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ── Button definitions ──────────────────────────────────────────────────────

const WORKFLOW_BUTTONS = [
  // Row 1: Ductwork & sheet metal
  { id: 'sm-runs',     label: 'SM Runs',           codes: ['A'],  form: 'footage-run' },
  { id: 'ductboard',   label: 'Ductboard',         codes: ['B'],  form: 'footage-run' },
  { id: 'sheet-metal', label: 'Sheet Metal',        codes: [],     form: 'custom-item', descPrefix: 'Sheet Metal' },
  { id: 'round-trunk', label: 'Round Trunk',        codes: [],     form: 'custom-item', descPrefix: 'Round Trunk' },
  { id: 'flex-duct',   label: 'Flex Duct',          codes: [],     form: 'custom-item', descPrefix: 'Flex Duct', toggle: ['Insulated', 'Non-Insulated'] },

  // Row 2: Runs & venting
  { id: 'flex-runs',    label: 'Flex Runs',         codes: [],     form: 'custom-item', descPrefix: 'Flex Run' },
  { id: 'db-tri-ra',    label: 'DB Tri / RA',       codes: [],     form: 'custom-item', descPrefix: 'DB Triangle / RA Pan' },
  { id: 'exhaust-runs', label: 'Exhaust Runs',      codes: ['C'],  form: 'model-picker' },
  { id: 'fresh-air',    label: 'Fresh Air',          codes: ['R'],  form: 'model-picker' },
  { id: 'wall-roof',    label: 'Caps / Jacks',       codes: [],     form: 'custom-item', descPrefix: 'Wall Cap / Roof Jack' },

  // Row 3: Equipment & controls
  { id: 'fans',        label: 'Fans',               codes: ['V'],  form: 'model-picker' },
  { id: 'stats',       label: 'Thermostats',        codes: ['X'],  form: 'model-picker' },
  { id: 'registers',   label: 'Reg & Grills',       codes: ['S'],  form: 'model-picker' },
  { id: 'misc',        label: 'Misc / All',         codes: ['D','E','F','G','H','I','J','K','L','M','N','O','P','Q','T','U','W'], form: 'browse-all' },
]

// ── Main component ──────────────────────────────────────────────────────────

export default function InlineKitSelector({ planId, systemId, existingCategoryCodes = [] }) {
  const qc = useQueryClient()
  const [activeId, setActiveId] = useState(null)
  const [addedCodes, setAddedCodes] = useState(new Set())
  const [addedCustom, setAddedCustom] = useState(new Set())

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['kit-variants'],
    queryFn:  kit.variants,
  })

  const variantsByCode = useMemo(() => {
    const map = {}
    for (const cat of categories) map[cat.code] = cat
    return map
  }, [categories])

  const buttonHasItems = useCallback((btn) => {
    if (btn.codes.length > 0) {
      return btn.codes.some(c => addedCodes.has(c) || existingCategoryCodes.includes(c))
    }
    return addedCustom.has(btn.id)
  }, [addedCodes, addedCustom, existingCategoryCodes])

  const addItem = useMutation({
    mutationFn: (data) => lineItems.add(planId, systemId, data),
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['plan', String(planId)] })
      if (vars.category_code) {
        setAddedCodes(prev => new Set([...prev, vars.category_code]))
      }
    },
  })

  function handleAdd(data, btnId) {
    addItem.mutate(data, {
      onSuccess: () => {
        if (!data.category_code) {
          setAddedCustom(prev => new Set([...prev, btnId]))
        }
      },
    })
  }

  const activeBtn = WORKFLOW_BUTTONS.find(b => b.id === activeId)

  // Get variants for active button's category codes
  const activeVariants = useMemo(() => {
    if (!activeBtn) return []
    const all = []
    for (const code of activeBtn.codes) {
      const cat = variantsByCode[code]
      if (cat) all.push(...cat.variants.map(v => ({ ...v, _catCode: code, _catName: cat.name })))
    }
    return all
  }, [activeBtn, variantsByCode])

  if (isLoading) return (
    <div style={{ fontSize: 12, color: 'var(--gray-400)', padding: '6px 0' }}>
      Loading kit categories...
    </div>
  )

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ ...tacticalLabel, marginBottom: 10 }}>Kit Pricing</div>

      {/* 15-button grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 6,
        marginBottom: activeId ? 10 : 0,
      }}>
        {WORKFLOW_BUTTONS.map(btn => {
          const isActive = activeId === btn.id
          const isDone = buttonHasItems(btn)
          return (
            <button
              key={btn.id}
              onClick={() => setActiveId(isActive ? null : btn.id)}
              style={{
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 3, padding: '8px 4px',
                minHeight: 56,
                borderRadius: 8,
                border: isActive
                  ? '2px solid var(--accent)'
                  : isDone
                    ? '2px solid var(--success)'
                    : '1.5px solid var(--gray-200)',
                background: isActive ? 'var(--gray-900)' : 'var(--card-bg)',
                cursor: 'pointer',
                transition: 'all 0.1s ease',
                position: 'relative',
                boxShadow: isActive ? '0 2px 8px rgba(0,0,0,0.12)' : 'none',
              }}
            >
              <span style={{
                fontSize: 11, fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                textAlign: 'center',
                lineHeight: 1.2,
                color: isActive ? '#fff' : 'var(--gray-700)',
              }}>{btn.label}</span>

              {/* Code badges — show category letters */}
              {btn.codes.length > 0 && btn.codes.length <= 3 && (
                <div style={{ display: 'flex', gap: 2 }}>
                  {btn.codes.map(c => (
                    <span key={c} style={{
                      fontSize: 9, fontWeight: 800,
                      width: 16, height: 16, borderRadius: 4,
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      background: isActive ? 'rgba(255,255,255,0.2)' : 'var(--accent)',
                      color: '#fff',
                    }}>{c}</span>
                  ))}
                </div>
              )}

              {/* Done checkmark */}
              {isDone && !isActive && (
                <span style={{
                  position: 'absolute', top: 3, right: 3,
                  width: 14, height: 14, borderRadius: '50%',
                  background: 'var(--success)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 8, color: '#fff', fontWeight: 700,
                }}>&#10003;</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Active sub-form */}
      {activeBtn && (
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--gray-200)',
          borderRadius: 10,
          padding: 16,
          animation: 'slideUp 0.12s ease',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 12,
          }}>
            <span style={{
              fontSize: 13, fontWeight: 700, color: 'var(--gray-800)',
            }}>{activeBtn.label}</span>
            <button
              onClick={() => setActiveId(null)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: 18, color: 'var(--gray-400)', lineHeight: 1, padding: '0 4px',
              }}
            >&times;</button>
          </div>

          {activeBtn.form === 'model-picker' && (
            <ModelPickerForm
              variants={activeVariants}
              onAdd={(data) => handleAdd(data, activeBtn.id)}
              isPending={addItem.isPending}
            />
          )}
          {activeBtn.form === 'footage-run' && (
            <FootageRunForm
              variants={activeVariants}
              onAdd={(data) => handleAdd(data, activeBtn.id)}
              isPending={addItem.isPending}
            />
          )}
          {activeBtn.form === 'custom-item' && (
            <CustomItemForm
              descPrefix={activeBtn.descPrefix || ''}
              toggle={activeBtn.toggle}
              onAdd={(data) => handleAdd(data, activeBtn.id)}
              isPending={addItem.isPending}
            />
          )}
          {activeBtn.form === 'browse-all' && (
            <BrowseAllForm
              codes={activeBtn.codes}
              variantsByCode={variantsByCode}
              onAdd={(data) => handleAdd(data, activeBtn.id)}
              isPending={addItem.isPending}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── ModelPickerForm ─────────────────────────────────────────────────────────
// Simple: variant dropdown + qty + add

function ModelPickerForm({ variants, onAdd, isPending }) {
  const [variantId, setVariantId] = useState('')
  const [qty, setQty] = useState('1')
  const [search, setSearch] = useState('')

  const selected = variants.find(v => String(v.id) === variantId)

  const filtered = useMemo(() => {
    if (!search.trim()) return variants
    const q = search.toLowerCase()
    return variants.filter(v =>
      v.variant_name.toLowerCase().includes(q) ||
      v.variant_code.toLowerCase().includes(q)
    )
  }, [variants, search])

  function handleSubmit() {
    if (!selected) return
    const q = parseFloat(qty) || 1
    onAdd({
      description:    selected.variant_name,
      quantity:        q,
      unit_price:      selected.per_kit,
      category_code:   selected._catCode,
      sort_order:      50,
      part_number:     selected.variant_code,
      kit_variant_id:  selected.id,
    })
    setVariantId('')
    setQty('1')
  }

  return (
    <div>
      {variants.length > 8 && (
        <input
          type="text"
          placeholder="Search models..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ width: '100%', fontSize: 13, marginBottom: 8, padding: '6px 10px' }}
        />
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 280px', minWidth: 200 }}>
          <div style={{ ...tacticalLabel, marginBottom: 4 }}>Model</div>
          <select
            value={variantId}
            onChange={e => setVariantId(e.target.value)}
            style={{ width: '100%', fontSize: 13 }}
          >
            <option value="">-- Select --</option>
            {filtered.map(v => (
              <option key={v.id} value={v.id}>
                {v.variant_name} {' \u2014 '} {currency(v.per_kit)}
              </option>
            ))}
          </select>
        </div>

        <div style={{ width: 70 }}>
          <div style={{ ...tacticalLabel, marginBottom: 4 }}>Qty</div>
          <input
            type="number" min="1" step="1"
            value={qty}
            onChange={e => setQty(e.target.value)}
            style={{ width: '100%', fontSize: 13 }}
          />
        </div>

        {selected && (
          <div style={{ minWidth: 80, textAlign: 'right' }}>
            <div style={{ ...tacticalLabel, marginBottom: 4 }}>Total</div>
            <div style={{ fontWeight: 700, fontSize: 15, fontFamily: mono, color: 'var(--accent)' }}>
              {currency(selected.per_kit * (parseFloat(qty) || 1))}
            </div>
          </div>
        )}

        <button
          className="btn-primary btn-sm"
          disabled={!selected || isPending}
          onClick={handleSubmit}
          style={{ height: 36, padding: '0 18px', fontSize: 13 }}
        >
          {isPending ? '...' : '+ Add'}
        </button>
      </div>
    </div>
  )
}

// ── FootageRunForm ──────────────────────────────────────────────────────────
// Size pill buttons + footage + qty for per-foot categories (A, B)

function FootageRunForm({ variants, onAdd, isPending }) {
  const [selectedId, setSelectedId] = useState('')
  const [footage, setFootage] = useState('')
  const [qty, setQty] = useState('1')

  const selected = variants.find(v => String(v.id) === String(selectedId))
  const needsFootage = selected?.per_foot > 0

  const price = useMemo(() => {
    if (!selected) return 0
    const ft = parseFloat(footage) || 0
    return selected.per_kit + (needsFootage ? ft * selected.per_foot : 0)
  }, [selected, footage, needsFootage])

  function handleSubmit() {
    if (!selected) return
    const ft = parseFloat(footage) || 0
    const q = parseFloat(qty) || 1
    const desc = needsFootage && ft > 0
      ? `${selected.variant_name} (${ft} ft)`
      : selected.variant_name

    onAdd({
      description:    desc,
      quantity:        q,
      unit_price:      parseFloat(price.toFixed(4)),
      category_code:   selected._catCode,
      sort_order:      50,
      part_number:     selected.variant_code,
      kit_variant_id:  selected.id,
    })
    setFootage('')
    setQty('1')
  }

  // Extract size label from variant name (e.g. '4" Sheet Metal Run' → '4"')
  function sizeLabel(v) {
    const m = v.variant_name.match(/^(\d+"?)/)
    return m ? m[1] : v.variant_code
  }

  return (
    <div>
      {/* Size pill buttons */}
      <div style={{ ...tacticalLabel, marginBottom: 6 }}>Size</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {variants.map(v => {
          const isActive = String(v.id) === String(selectedId)
          return (
            <button
              key={v.id}
              onClick={() => { setSelectedId(String(v.id)); setFootage('') }}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: isActive ? '2px solid var(--accent)' : '1.5px solid var(--gray-200)',
                background: isActive ? 'var(--gray-900)' : 'var(--card-bg)',
                color: isActive ? '#fff' : 'var(--gray-700)',
                fontSize: 13, fontWeight: 700,
                fontFamily: mono,
                cursor: 'pointer',
                transition: 'all 0.1s',
              }}
            >
              {sizeLabel(v)}
            </button>
          )
        })}
      </div>

      {/* Footage + qty + price row */}
      {selected && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 12, color: 'var(--gray-500)', flex: '1 1 180px' }}>
            <span style={{ fontWeight: 600 }}>{selected.variant_name}</span>
            <br />
            <span style={{ fontFamily: mono, fontSize: 11 }}>
              {currency(selected.per_kit)} kit
              {selected.per_foot > 0 && ` + ${currency(selected.per_foot)}/ft`}
            </span>
          </div>

          {needsFootage && (
            <div style={{ width: 90 }}>
              <div style={{ ...tacticalLabel, marginBottom: 4 }}>Footage</div>
              <input
                type="number" min="0" step="1"
                value={footage}
                onChange={e => setFootage(e.target.value)}
                placeholder="ft"
                style={{ width: '100%', fontSize: 13, fontFamily: mono }}
                autoFocus
              />
            </div>
          )}

          <div style={{ width: 70 }}>
            <div style={{ ...tacticalLabel, marginBottom: 4 }}>Qty</div>
            <input
              type="number" min="1" step="1"
              value={qty}
              onChange={e => setQty(e.target.value)}
              style={{ width: '100%', fontSize: 13 }}
            />
          </div>

          <div style={{ minWidth: 80, textAlign: 'right' }}>
            <div style={{ ...tacticalLabel, marginBottom: 4 }}>Total</div>
            <div style={{ fontWeight: 700, fontSize: 15, fontFamily: mono, color: 'var(--accent)' }}>
              {currency(price * (parseFloat(qty) || 1))}
            </div>
          </div>

          <button
            className="btn-primary btn-sm"
            disabled={!selected || (needsFootage && !footage) || isPending}
            onClick={handleSubmit}
            style={{ height: 36, padding: '0 18px', fontSize: 13 }}
          >
            {isPending ? '...' : '+ Add'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── CustomItemForm ──────────────────────────────────────────────────────────
// Free-entry form for categories not yet in the DB (Round Trunk, Flex, etc.)

function CustomItemForm({ descPrefix, toggle, onAdd, isPending }) {
  const [toggleVal, setToggleVal] = useState(toggle ? toggle[0] : '')
  const [desc, setDesc] = useState('')
  const [qty, setQty] = useState('1')
  const [price, setPrice] = useState('')

  const fullDesc = [descPrefix, toggleVal, desc].filter(Boolean).join(' \u2014 ')

  function handleSubmit() {
    if (!desc.trim() && !descPrefix) return
    onAdd({
      description:   fullDesc || descPrefix,
      quantity:       parseFloat(qty) || 1,
      unit_price:     parseFloat(price) || 0,
      category_code:  null,
      sort_order:     50,
      part_number:    null,
      kit_variant_id: null,
    })
    setDesc('')
    setQty('1')
    setPrice('')
  }

  return (
    <div>
      {/* Insulated / Non-insulated toggle */}
      {toggle && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
          {toggle.map(t => (
            <button
              key={t}
              onClick={() => setToggleVal(t)}
              style={{
                padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 600,
                border: toggleVal === t ? '2px solid var(--accent)' : '1.5px solid var(--gray-200)',
                background: toggleVal === t ? 'var(--gray-900)' : 'var(--card-bg)',
                color: toggleVal === t ? '#fff' : 'var(--gray-600)',
                cursor: 'pointer', transition: 'all 0.1s',
              }}
            >{t}</button>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 160 }}>
          <div style={{ ...tacticalLabel, marginBottom: 4 }}>Description</div>
          <input
            type="text"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            placeholder={`${descPrefix} details...`}
            style={{ width: '100%', fontSize: 13 }}
            autoFocus
          />
          {(desc || descPrefix) && (
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 3 }}>
              {fullDesc}
            </div>
          )}
        </div>

        <div style={{ width: 70 }}>
          <div style={{ ...tacticalLabel, marginBottom: 4 }}>Qty</div>
          <input
            type="number" min="1" step="1"
            value={qty}
            onChange={e => setQty(e.target.value)}
            style={{ width: '100%', fontSize: 13 }}
          />
        </div>

        <div style={{ width: 100 }}>
          <div style={{ ...tacticalLabel, marginBottom: 4 }}>Unit Price</div>
          <input
            type="number" min="0" step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
            placeholder="$0.00"
            style={{ width: '100%', fontSize: 13, fontFamily: mono }}
          />
        </div>

        {(parseFloat(price) > 0) && (
          <div style={{ minWidth: 80, textAlign: 'right' }}>
            <div style={{ ...tacticalLabel, marginBottom: 4 }}>Total</div>
            <div style={{ fontWeight: 700, fontSize: 15, fontFamily: mono, color: 'var(--accent)' }}>
              {currency((parseFloat(price) || 0) * (parseFloat(qty) || 1))}
            </div>
          </div>
        )}

        <button
          className="btn-primary btn-sm"
          disabled={(!desc.trim() && !descPrefix) || isPending}
          onClick={handleSubmit}
          style={{ height: 36, padding: '0 18px', fontSize: 13 }}
        >
          {isPending ? '...' : '+ Add'}
        </button>
      </div>
    </div>
  )
}

// ── BrowseAllForm ───────────────────────────────────────────────────────────
// Collapsible sections for all remaining categories (Misc / All)

const BROWSE_GROUPS = [
  { label: 'Venting',        codes: ['C','D','E','F','G'] },
  { label: 'Mechanical',     codes: ['H','I','J','K','L'] },
  { label: 'IAQ',            codes: ['M','N','O','W'] },
  { label: 'Accessories',    codes: ['P','Q','S','T','U'] },
]

function BrowseAllForm({ codes, variantsByCode, onAdd, isPending }) {
  const [openSection, setOpenSection] = useState(null)
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState('')
  const [qty, setQty] = useState('1')

  // Flatten all variants for the given codes
  const allVariants = useMemo(() => {
    const out = []
    for (const code of codes) {
      const cat = variantsByCode[code]
      if (cat) out.push(...cat.variants.map(v => ({ ...v, _catCode: code, _catName: cat.name })))
    }
    return out
  }, [codes, variantsByCode])

  const filtered = useMemo(() => {
    if (!search.trim()) return null // show grouped view
    const q = search.toLowerCase()
    return allVariants.filter(v =>
      v.variant_name.toLowerCase().includes(q) ||
      v.variant_code.toLowerCase().includes(q) ||
      v._catName.toLowerCase().includes(q)
    )
  }, [search, allVariants])

  const selected = allVariants.find(v => String(v.id) === selectedId)

  function handleSubmit(variant) {
    const v = variant || selected
    if (!v) return
    const q = parseFloat(qty) || 1
    onAdd({
      description:    v.variant_name,
      quantity:        q,
      unit_price:      v.per_kit,
      category_code:   v._catCode,
      sort_order:      50,
      part_number:     v.variant_code,
      kit_variant_id:  v.id,
    })
    setSelectedId('')
    setQty('1')
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search all categories..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ width: '100%', fontSize: 13, marginBottom: 10, padding: '6px 10px' }}
        autoFocus
      />

      {/* Search results mode */}
      {filtered && (
        <div style={{ maxHeight: 300, overflowY: 'auto' }}>
          {filtered.length === 0 ? (
            <div style={{ fontSize: 13, color: 'var(--gray-400)', padding: 12 }}>No matches</div>
          ) : (
            filtered.map(v => (
              <VariantRow
                key={v.id}
                variant={v}
                onAdd={() => handleSubmit(v)}
                isPending={isPending}
              />
            ))
          )}
        </div>
      )}

      {/* Grouped accordion mode */}
      {!filtered && (
        <div style={{ maxHeight: 350, overflowY: 'auto' }}>
          {BROWSE_GROUPS.map(group => {
            const groupVariants = []
            for (const code of group.codes) {
              if (!codes.includes(code)) continue
              const cat = variantsByCode[code]
              if (cat) groupVariants.push(...cat.variants.map(v => ({ ...v, _catCode: code, _catName: cat.name })))
            }
            if (groupVariants.length === 0) return null
            const isOpen = openSection === group.label
            return (
              <div key={group.label} style={{ marginBottom: 2 }}>
                <button
                  onClick={() => setOpenSection(isOpen ? null : group.label)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '8px 10px',
                    background: isOpen ? 'var(--gray-50)' : 'transparent',
                    border: 'none', borderBottom: '1px solid var(--gray-100)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--gray-700)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {group.label}
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                    {groupVariants.length} items {isOpen ? '\u25B2' : '\u25BC'}
                  </span>
                </button>
                {isOpen && (
                  <div style={{ padding: '4px 0' }}>
                    {groupVariants.map(v => (
                      <VariantRow
                        key={v.id}
                        variant={v}
                        onAdd={() => handleSubmit(v)}
                        isPending={isPending}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── VariantRow (used in BrowseAll) ──────────────────────────────────────────

function VariantRow({ variant, onAdd, isPending }) {
  const [qty, setQty] = useState('1')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '6px 10px',
      borderBottom: '1px solid var(--gray-50)',
      fontSize: 12,
    }}>
      <span style={{
        width: 22, height: 22, borderRadius: 5, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--accent)', color: '#fff', fontSize: 9, fontWeight: 800,
      }}>{variant._catCode}</span>
      <span style={{ flex: 1, color: 'var(--gray-700)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {variant.variant_name}
      </span>
      <span style={{ fontFamily: mono, fontSize: 11, color: 'var(--gray-500)', flexShrink: 0 }}>
        {currency(variant.per_kit)}
      </span>
      <input
        type="number" min="1" step="1"
        value={qty}
        onChange={e => setQty(e.target.value)}
        style={{ width: 50, fontSize: 12, padding: '3px 6px', textAlign: 'center' }}
      />
      <button
        className="btn-primary btn-sm"
        disabled={isPending}
        onClick={() => {
          onAdd({
            description:    variant.variant_name,
            quantity:        parseFloat(qty) || 1,
            unit_price:      variant.per_kit,
            category_code:   variant._catCode,
            sort_order:      50,
            part_number:     variant.variant_code,
            kit_variant_id:  variant.id,
          })
          setQty('1')
        }}
        style={{ height: 28, padding: '0 10px', fontSize: 11, flexShrink: 0 }}
      >+</button>
    </div>
  )
}
