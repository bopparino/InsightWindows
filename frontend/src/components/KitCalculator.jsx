/**
 * Kit Pricing Calculator
 * Opens as a modal on a zone. Estimator fills in footage/quantities,
 * sees live pricing, then confirms to add all items to the bid.
 */
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { kit } from '../api/client'

// Descriptions already covered by hardcoded inputs — exclude from additional items list
const HARDCODED_DESCRIPTIONS = new Set([
  'sheet metal — supply plenum',
  'sheet metal — return plenum',
  'sheet metal — transitions / offsets',
  'flex duct',
  'flex duct connectors / clamps',
  'refrigerant line set — copper',
  'refrigerant line insulation (rubatex r3)',
  'service valve locking caps',
  'condensate drain line — pvc',
  'float switch',
  'condensate pump',
  'mastic duct sealing package',
  'mastic — fittings and boots',
  'canvas connector — supply plenum / return riser',
])

const CATEGORY_LABELS = {
  sheet_metal: 'Sheet Metal',
  flex_line:   'Flex Duct',
  refrigerant: 'Refrigerant',
  drain:       'Drain / Condensate',
  mastic:      'Mastic',
  misc:        'Miscellaneous',
}

const CATEGORY_COLORS = {
  sheet_metal: { bg: '#eff6ff', border: '#bfdbfe', text: '#1e40af' },
  flex_line:   { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
  refrigerant: { bg: '#fdf4ff', border: '#e9d5ff', text: '#6b21a8' },
  drain:       { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
  mastic:      { bg: '#fefce8', border: '#fde68a', text: '#92400e' },
  misc:        { bg: '#f8fafc', border: '#e2e8f0', text: '#475569' },
}

function NumInput({ label, value, onChange, min = 0, step = 1, unit = '' }) {
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--gray-600)',
        display: 'block', marginBottom: 3 }}>
        {label}{unit ? <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}> ({unit})</span> : ''}
      </label>
      <input
        type="number" min={min} step={step}
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        style={{ width: '100%', padding: '6px 10px', fontSize: 14 }}
      />
    </div>
  )
}

function Toggle({ label, checked, onChange, hint }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10,
      cursor: 'pointer', padding: '6px 0' }}>
      <div style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative',
        background: checked ? 'var(--blue)' : 'var(--gray-200)',
        transition: 'background 0.2s', flexShrink: 0,
      }}>
        <div style={{
          position: 'absolute', top: 2, left: checked ? 18 : 2,
          width: 16, height: 16, borderRadius: '50%', background: 'white',
          transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)}
          style={{ position: 'absolute', opacity: 0, width: '100%', height: '100%',
            cursor: 'pointer', margin: 0 }} />
      </div>
      <div>
        <div style={{ fontSize: 14, color: 'var(--gray-800)' }}>{label}</div>
        {hint && <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>{hint}</div>}
      </div>
    </label>
  )
}

export default function KitCalculator({ planId, systemId, zoneName, onAddItems, onClose, existingDescriptions = new Set() }) {
  const [inputs, setInputs] = useState({
    tonnage:             2.5,
    supply_plenum_count: 1,
    return_plenum_count: 1,
    transitions_count:   0,
    flex_footage:        0,
    lineset_footage:     0,
    lineset_insulated:   true,
    drain_footage:       0,
    float_switch:        true,
    condensate_pump:     false,
    mastic_package:      true,
    mastic_fittings:     true,
    canvas_connector:    false,
    locking_caps:        true,
  })

  const [result, setResult] = useState(null)
  const [stale, setStale] = useState(false)
  const [additionalSelected, setAdditionalSelected] = useState({}) // {id: quantity}

  const set = (k, v) => {
    setInputs(i => ({ ...i, [k]: v }))
    setStale(true)
  }

  const toggleAdditional = (id, checked) => {
    setAdditionalSelected(s => {
      const next = { ...s }
      if (checked) next[id] = 1
      else delete next[id]
      return next
    })
    setStale(true)
  }

  const setAdditionalQty = (id, qty) => {
    setAdditionalSelected(s => ({ ...s, [id]: qty }))
    setStale(true)
  }

  // Load all kit items to find any not covered by hardcoded inputs
  const { data: allKitItems = [] } = useQuery({
    queryKey: ['kit-items'],
    queryFn:  kit.list,
  })

  const additionalItems = allKitItems.filter(
    i => !HARDCODED_DESCRIPTIONS.has(i.description.toLowerCase().trim())
  )

  const isDupe = (item) =>
    existingDescriptions.has(item.description.toLowerCase().trim())

  const calculate = useMutation({
    mutationFn: () => kit.calculate({
      ...inputs,
      additional_items: Object.entries(additionalSelected).map(([id, qty]) => ({
        id: parseInt(id), quantity: qty,
      })),
    }),
    onSuccess: (data) => { setResult(data); setStale(false) },
  })

  const grouped = result
    ? result.items.reduce((acc, item) => {
        const cat = item.category || 'misc'
        if (!acc[cat]) acc[cat] = []
        acc[cat].push(item)
        return acc
      }, {})
    : {}

  const newItems = result ? result.items.filter(i => !isDupe(i)) : []
  const dupeCount = result ? result.items.length - newItems.length : 0

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div style={{
        background: 'var(--card-bg)', borderRadius: 12, width: '100%', maxWidth: 860,
        maxHeight: '92vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 80px rgba(0,0,0,0.25)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--blue)', borderRadius: '12px 12px 0 0' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12, marginBottom: 2 }}>
              Kit Pricing Calculator
            </div>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 17 }}>
              {zoneName}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)',
            color: 'white', padding: '6px 12px', borderRadius: 6, fontSize: 20,
            lineHeight: 1, border: 'none' }}>×</button>
        </div>

        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left — inputs */}
          <div style={{ width: 340, flexShrink: 0, overflowY: 'auto',
            borderRight: '1px solid var(--gray-200)', padding: 20 }}>

            {/* Tonnage */}
            <div style={{ marginBottom: 20, padding: 14, background: 'var(--blue-light)',
              borderRadius: 8, border: '1px solid var(--blue-mid)' }}>
              <NumInput label="System tonnage" value={inputs.tonnage}
                onChange={v => set('tonnage', v)} min={1} step={0.5} unit="tons" />
              <div style={{ fontSize: 11, color: 'var(--blue)', marginTop: 6 }}>
                Used to scale sheet metal, linesets, and mastic pricing
              </div>
            </div>

            {/* Sheet metal */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                color: CATEGORY_COLORS.sheet_metal.text, letterSpacing: '0.05em',
                marginBottom: 10 }}>Sheet Metal Fabrication</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                <NumInput label="Supply plenums" value={inputs.supply_plenum_count}
                  onChange={v => set('supply_plenum_count', v)} unit="qty" />
                <NumInput label="Return plenums" value={inputs.return_plenum_count}
                  onChange={v => set('return_plenum_count', v)} unit="qty" />
                <NumInput label="Transitions" value={inputs.transitions_count}
                  onChange={v => set('transitions_count', v)} unit="qty" />
              </div>
              <Toggle label="Canvas connector" checked={inputs.canvas_connector}
                onChange={v => set('canvas_connector', v)}
                hint="Supply plenum / return riser" />
            </div>

            {/* Flex duct */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                color: CATEGORY_COLORS.flex_line.text, letterSpacing: '0.05em',
                marginBottom: 10 }}>Flex Duct</div>
              <NumInput label="Flex footage" value={inputs.flex_footage}
                onChange={v => set('flex_footage', v)} unit="ft" />
            </div>

            {/* Refrigerant */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                color: CATEGORY_COLORS.refrigerant.text, letterSpacing: '0.05em',
                marginBottom: 10 }}>Refrigerant Line Set</div>
              <NumInput label="Lineset footage" value={inputs.lineset_footage}
                onChange={v => set('lineset_footage', v)} unit="ft" />
              <Toggle label="R3 Rubatex insulation" checked={inputs.lineset_insulated}
                onChange={v => set('lineset_insulated', v)} />
              <Toggle label="Service valve locking caps" checked={inputs.locking_caps}
                onChange={v => set('locking_caps', v)} />
            </div>

            {/* Drain */}
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                color: CATEGORY_COLORS.drain.text, letterSpacing: '0.05em',
                marginBottom: 10 }}>Drain / Condensate</div>
              <NumInput label="Drain line footage" value={inputs.drain_footage}
                onChange={v => set('drain_footage', v)} unit="ft" />
              <Toggle label="Float switch" checked={inputs.float_switch}
                onChange={v => set('float_switch', v)}
                hint="Emergency pan / finished area" />
              <Toggle label="Condensate pump" checked={inputs.condensate_pump}
                onChange={v => set('condensate_pump', v)} />
            </div>

            {/* Mastic */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                color: CATEGORY_COLORS.mastic.text, letterSpacing: '0.05em',
                marginBottom: 10 }}>Mastic Sealing</div>
              <Toggle label="Mastic duct sealing package" checked={inputs.mastic_package}
                onChange={v => set('mastic_package', v)} />
              <Toggle label="Mastic — fittings and boots" checked={inputs.mastic_fittings}
                onChange={v => set('mastic_fittings', v)} />
            </div>

            {/* Additional items from DB */}
            {additionalItems.length > 0 && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--gray-200)' }}>
                <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                  color: CATEGORY_COLORS.misc.text, letterSpacing: '0.05em',
                  marginBottom: 10 }}>Additional Items</div>
                {additionalItems.map(item => {
                  const checked = item.id in additionalSelected
                  const qty = additionalSelected[item.id] ?? 1
                  const unitPrice = item.base_price + item.price_per_ton * inputs.tonnage
                  return (
                    <div key={item.id} style={{ paddingBottom: 8 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8,
                        cursor: 'pointer', padding: '4px 0' }}>
                        <input type="checkbox" checked={checked}
                          onChange={e => toggleAdditional(item.id, e.target.checked)}
                          style={{ width: 16, height: 16, cursor: 'pointer' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 14, color: 'var(--gray-800)' }}>{item.description}</div>
                          <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                            ${unitPrice.toFixed(2)}/{item.unit || 'each'}
                          </div>
                        </div>
                      </label>
                      {checked && item.unit !== 'each' && (
                        <div style={{ paddingLeft: 24, marginTop: 4 }}>
                          <input type="number" min={0} step={1} value={qty}
                            onChange={e => setAdditionalQty(item.id, parseFloat(e.target.value) || 0)}
                            style={{ width: 80, padding: '4px 8px', fontSize: 13 }} />
                          <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 6 }}>
                            {item.unit}
                          </span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right — results */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 20,
            background: result ? 'var(--card-bg)' : 'var(--gray-50)' }}>

            {!result ? (
              <div style={{ textAlign: 'center', padding: '60px 24px',
                color: 'var(--gray-400)' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
                  style={{ margin: '0 auto 12px', display: 'block' }}>
                  <circle cx="24" cy="24" r="20" stroke="var(--gray-200)" strokeWidth="2"/>
                  <path d="M16 32c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round"/>
                  <circle cx="24" cy="20" r="4" stroke="var(--gray-300)" strokeWidth="2"/>
                </svg>
                <div style={{ fontSize: 15, fontWeight: 500, marginBottom: 6 }}>
                  Fill in the measurements on the left
                </div>
                <div style={{ fontSize: 13 }}>
                  then click Calculate to see itemized pricing
                </div>
              </div>
            ) : (
              <>
                {/* Stale inputs warning */}
                {stale && (
                  <div style={{ background: 'var(--status-proposed-bg)', border: '1px solid var(--status-proposed-border)',
                    borderRadius: 8, padding: '10px 16px', marginBottom: 16,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: 'var(--status-proposed-text)' }}>
                      Inputs changed — results below may be outdated
                    </span>
                    <button className="btn-primary btn-sm"
                      onClick={() => calculate.mutate()}
                      disabled={calculate.isPending}
                      style={{ fontSize: 12 }}>
                      {calculate.isPending ? '…' : 'Recalculate'}
                    </button>
                  </div>
                )}

                {/* Dupe warning */}
                {dupeCount > 0 && (
                  <div style={{ background: 'var(--status-proposed-bg)', border: '1px solid var(--status-proposed-border)',
                    borderRadius: 8, padding: '10px 16px', marginBottom: 16,
                    fontSize: 13, color: 'var(--status-proposed-text)' }}>
                    {dupeCount} item{dupeCount > 1 ? 's are' : ' is'} already in this zone and will be skipped.
                  </div>
                )}

                {/* Total banner */}
                <div style={{ background: stale ? 'var(--gray-400)' : 'var(--blue)',
                  color: 'white', borderRadius: 8, padding: '14px 20px', marginBottom: 20,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  transition: 'background 0.2s' }}>
                  <div>
                    <div style={{ fontSize: 12, opacity: 0.7 }}>
                      Kit total — {newItems.length} new item{newItems.length !== 1 ? 's' : ''}
                      {dupeCount > 0 ? ` (${dupeCount} skipped)` : ''}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 700 }}>
                      ${newItems.reduce((s, i) => s + i.extended, 0)
                          .toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.7, textAlign: 'right' }}>
                    {result.tonnage} ton system
                  </div>
                </div>

                {/* Grouped line items */}
                {Object.entries(grouped).map(([cat, items]) => {
                  const color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.misc
                  const catTotal = items.filter(i => !isDupe(i)).reduce((s, i) => s + i.extended, 0)
                  return (
                    <div key={cat} style={{ marginBottom: 16, border: `1px solid ${color.border}`,
                      borderRadius: 8, overflow: 'hidden' }}>
                      <div style={{ background: color.bg, padding: '8px 14px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.05em',
                          color: color.text }}>
                          {CATEGORY_LABELS[cat] || cat}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: color.text }}>
                          ${catTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      {items.map((item, i) => {
                        const dupe = isDupe(item)
                        return (
                          <div key={i} style={{ padding: '8px 14px',
                            borderTop: i > 0 ? '1px solid var(--gray-100)' : 'none',
                            display: 'flex', justifyContent: 'space-between',
                            alignItems: 'center', fontSize: 13,
                            opacity: dupe ? 0.45 : 1,
                            background: dupe ? 'var(--gray-50)' : 'transparent' }}>
                            <div>
                              <span style={{ textDecoration: dupe ? 'line-through' : 'none' }}>
                                {item.description}
                              </span>
                              {dupe && (
                                <span style={{ fontSize: 11, marginLeft: 8,
                                  color: 'var(--status-proposed-text)', background: 'var(--status-proposed-bg)',
                                  padding: '1px 6px', borderRadius: 99 }}>
                                  already in zone
                                </span>
                              )}
                              {!dupe && (
                                <span style={{ color: 'var(--gray-400)', marginLeft: 8 }}>
                                  × {item.quantity} @ ${item.unit_price.toFixed(2)}
                                </span>
                              )}
                            </div>
                            <div style={{ fontWeight: 600, flexShrink: 0, marginLeft: 16,
                              color: dupe ? 'var(--gray-400)' : 'inherit' }}>
                              {dupe ? '—' : `$${item.extended.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid var(--gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'var(--gray-50)', borderRadius: '0 0 12px 12px' }}>
          <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>
            {result
              ? stale
                ? 'Inputs changed — recalculate to update results'
                : 'Review items above, then add to bid'
              : 'Prices scale with tonnage. Adjust inputs then calculate.'}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-secondary" onClick={onClose}>Cancel</button>
            {result ? (
              <button className="btn-success"
                disabled={newItems.length === 0 || stale}
                onClick={() => { onAddItems(newItems); onClose() }}>
                {newItems.length === 0
                  ? 'All items already in zone'
                  : `Add ${newItems.length} item${newItems.length !== 1 ? 's' : ''} to bid — $${newItems.reduce((s, i) => s + i.extended, 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
              </button>
            ) : (
              <button className="btn-primary"
                onClick={() => calculate.mutate()}
                disabled={calculate.isPending}>
                {calculate.isPending ? 'Calculating...' : 'Calculate'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
