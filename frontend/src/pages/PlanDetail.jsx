import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate, useBlocker } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plans, documents, lineItems, houseTypes, equipment, houseTypeApi, systems } from '../api/client'

// ── Email Quote modal ─────────────────────────────────────────
function EmailQuoteModal({ plan, onClose }) {
  const builderEmail = plan.project?.builder?.email || ''
  const [to,      setTo]      = useState(builderEmail)
  const [subject, setSubject] = useState(
    `HVAC Quote – ${plan.plan_number} – ${plan.project?.name || ''} (${plan.project?.builder?.name || ''})`
  )
  const [message, setMessage] = useState('')
  const [status,  setStatus]  = useState(null) // null | 'sending' | 'sent' | 'error'
  const [errMsg,  setErrMsg]  = useState('')

  async function handleSend() {
    if (!to.trim()) return
    setStatus('sending')
    try {
      await documents.emailQuote(plan.id, { to: to.trim(), subject, message })
      setStatus('sent')
    } catch (e) {
      setErrMsg(e.response?.data?.detail || 'Failed to send. Check server logs.')
      setStatus('error')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 'var(--radius)', width: 520,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Email Quote</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none',
            fontSize: 22, color: 'var(--gray-400)', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        {status === 'sent' ? (
          <div style={{ padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✓</div>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Quote sent successfully</div>
            <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 24 }}>
              Sent to {to}
            </div>
            <button className="btn-primary" onClick={onClose}>Done</button>
          </div>
        ) : (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)',
                display: 'block', marginBottom: 4 }}>To</label>
              <input value={to} onChange={e => setTo(e.target.value)}
                placeholder="builder@example.com"
                style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)',
                display: 'block', marginBottom: 4 }}>Subject</label>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)',
                display: 'block', marginBottom: 4 }}>
                Message <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optional)</span>
              </label>
              <textarea value={message} onChange={e => setMessage(e.target.value)}
                rows={4} placeholder="Add a note to the builder…"
                style={{ width: '100%', resize: 'vertical' }} />
            </div>
            <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
              The quote PDF will be attached. Replies go directly to you.
            </div>
            {status === 'error' && (
              <div style={{ fontSize: 13, color: '#dc2626', background: '#fff1f2',
                border: '1px solid #fecaca', borderRadius: 6, padding: '8px 12px' }}>
                {errMsg}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={onClose}>Cancel</button>
              <button className="btn-primary"
                disabled={!to.trim() || status === 'sending'}
                onClick={handleSend}>
                {status === 'sending' ? 'Sending…' : 'Send Quote'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
import KitCalculator from '../components/KitCalculator'
import { useAuth } from '../context/AuthContext'

const STATUS_FLOW = ['draft', 'proposed', 'contracted', 'complete']

// ── Equipment picker modal ────────────────────────────────────
function EquipmentPicker({ planId, systemId, onSelect, onClose }) {
  const [search, setSearch] = useState('')
  const [mfrId, setMfrId] = useState('')

  const { data: manufacturers = [] } = useQuery({
    queryKey: ['manufacturers'],
    queryFn: equipment.manufacturers,
  })

  const { data: systems = [], isLoading } = useQuery({
    queryKey: ['equipment-systems', mfrId, search],
    queryFn: () => equipment.systems({
      manufacturer_id: mfrId || undefined,
      search: search || undefined,
    }),
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }} onClick={onClose}>
      <div style={{
        background: 'white', borderRadius: 'var(--radius)', width: '90%', maxWidth: 740,
        maxHeight: '80vh', display: 'flex', flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--gray-200)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 16 }}>Equipment Catalog</div>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--gray-400)',
            fontSize: 22, padding: '0 4px', lineHeight: 1 }}>×</button>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--gray-100)',
          display: 'flex', gap: 10 }}>
          <input
            placeholder="Search system code or description..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1 }}
            autoFocus
          />
          <select value={mfrId} onChange={e => setMfrId(e.target.value)} style={{ width: 180 }}>
            <option value="">All manufacturers</option>
            {manufacturers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>

        {/* Results */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 32 }}><span className="spinner" /></div>
          ) : systems.length === 0 ? (
            <div className="empty-state"><p>No systems found.</p></div>
          ) : (
            <table className="table" style={{ fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ paddingLeft: 20 }}>System code</th>
                  <th>Manufacturer</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Cost</th>
                  <th style={{ textAlign: 'right', paddingRight: 20 }}>Bid price</th>
                </tr>
              </thead>
              <tbody>
                {systems.map(s => (
                  <tr key={s.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => onSelect(s)}>
                    <td style={{ paddingLeft: 20, fontWeight: 600,
                      fontFamily: 'monospace', color: 'var(--blue-mid)' }}>
                      {s.system_code}
                    </td>
                    <td>{s.manufacturer}</td>
                    <td style={{ color: 'var(--gray-600)', maxWidth: 260 }}>
                      <span style={{ display: 'block', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.description}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', color: 'var(--gray-600)' }}>
                      ${s.component_cost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 20, fontWeight: 600,
                      color: 'var(--blue)' }}>
                      ${s.bid_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--gray-100)',
          fontSize: 12, color: 'var(--gray-400)' }}>
          Click any row to add it as a line item
        </div>
      </div>
    </div>
  )
}

// ── Inline edit row ───────────────────────────────────────────
function EditableLineItemRow({ planId, li, onDelete, onEditingChange }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    description: li.description,
    quantity:    li.quantity,
    unit_price:  li.unit_price,
    pricing_flag: li.pricing_flag,
  })

  const startEditing = () => { setEditing(true);  onEditingChange?.(true)  }
  const stopEditing  = () => { setEditing(false); onEditingChange?.(false) }

  const save = useMutation({
    mutationFn: () => lineItems.update(planId, li.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', String(planId)] })
      stopEditing()
    },
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (editing) {
    return (
      <tr style={{ background: 'var(--blue-light)' }}>
        <td style={{ color: 'var(--gray-400)', fontSize: 11, paddingTop: 6, paddingBottom: 6 }}>
          {li.sort_order}
        </td>
        <td>
          <input value={form.description} onChange={e => set('description', e.target.value)}
            style={{ fontSize: 13, padding: '4px 8px' }} autoFocus />
        </td>
        <td style={{ textAlign: 'center' }}>
          <input type="number" min="0" step="0.5" value={form.quantity}
            onChange={e => set('quantity', parseFloat(e.target.value) || 0)}
            style={{ fontSize: 13, padding: '4px 8px', width: 60, textAlign: 'center' }} />
        </td>
        <td style={{ textAlign: 'right' }}>
          <input type="number" min="0" step="0.01" value={form.unit_price}
            onChange={e => set('unit_price', parseFloat(e.target.value) || 0)}
            style={{ fontSize: 13, padding: '4px 8px', width: 90, textAlign: 'right' }} />
        </td>
        <td style={{ textAlign: 'right', fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>
          {form.unit_price > 0
            ? `$${(form.quantity * form.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            : <span style={{ color: 'var(--gray-400)' }}>STD</span>}
        </td>
        <td>
          <select value={form.pricing_flag} onChange={e => set('pricing_flag', e.target.value)}
            style={{ fontSize: 12, padding: '3px 6px' }}>
            <option value="standard">standard</option>
            <option value="option">option</option>
          </select>
        </td>
        <td style={{ whiteSpace: 'nowrap' }}>
          <button className="btn-primary btn-sm"
            onClick={() => save.mutate()} disabled={save.isPending}
            style={{ fontSize: 12, padding: '3px 10px', marginRight: 4 }}>
            {save.isPending ? '…' : 'Save'}
          </button>
          <button className="btn-secondary btn-sm"
            onClick={stopEditing}
            style={{ fontSize: 12, padding: '3px 10px' }}>
            ✕
          </button>
        </td>
      </tr>
    )
  }

  return (
    <tr key={li.id} onDoubleClick={startEditing}
      title="Double-click to edit" style={{ cursor: 'default' }}>
      <td style={{ color: 'var(--gray-400)', fontSize: 11 }}>{li.sort_order}</td>
      <td>
        {li.description}
        {li.part_number && (
          <span style={{ fontSize: 11, color: 'var(--gray-400)', marginLeft: 6 }}>
            [{li.part_number}]
          </span>
        )}
      </td>
      <td style={{ textAlign: 'center' }}>{li.quantity}</td>
      <td style={{ textAlign: 'right' }}>
        {li.unit_price > 0 ? `$${li.unit_price.toFixed(2)}` : '—'}
      </td>
      <td style={{ textAlign: 'right', fontWeight: li.extended_price > 0 ? 600 : 400 }}>
        {li.extended_price > 0
          ? `$${li.extended_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
          : <span style={{ color: 'var(--gray-400)' }}>STD</span>}
      </td>
      <td style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 99,
          background: li.pricing_flag === 'option' ? '#fef3c7' : 'var(--gray-100)',
          color: li.pricing_flag === 'option' ? '#92400e' : 'var(--gray-600)' }}>
          {li.pricing_flag}
        </span>
      </td>
      <td style={{ whiteSpace: 'nowrap' }}>
        <button onClick={startEditing}
          style={{ background: 'none', color: 'var(--gray-400)',
            padding: '2px 5px', fontSize: 13, lineHeight: 1, marginRight: 2 }}
          title="Edit">✎</button>
        <button
          onClick={() => { if (window.confirm('Delete this line item?')) onDelete(li.id) }}
          style={{ background: 'none', color: 'var(--gray-400)',
            padding: '2px 5px', fontSize: 18, lineHeight: 1 }}
          title="Delete">×
        </button>
      </td>
    </tr>
  )
}

// ── Add line item form ────────────────────────────────────────
function AddLineItemForm({ planId, systemId, onDone }) {
  const qc = useQueryClient()
  const [showPicker, setShowPicker] = useState(false)
  const [form, setForm] = useState({
    description: '', quantity: 1, unit_price: 0,
    pricing_flag: 'standard', draw_stage: '', part_number: '', sort_order: '20',
  })

  const add = useMutation({
    mutationFn: (data) => lineItems.add(planId, systemId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', String(planId)] })
      onDone()
    },
  })

  const linkEquipment = useMutation({
    mutationFn: (equipSystemId) => systems.update(planId, systemId, { equipment_system_id: equipSystemId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', String(planId)] }),
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSelectEquipment = (sys) => {
    setForm(f => ({
      ...f,
      description: `${sys.system_code} — ${sys.description}`,
      unit_price: sys.bid_price,
      part_number: sys.system_code,
      quantity: 1,
    }))
    linkEquipment.mutate(sys.id)
    setShowPicker(false)
  }

  return (
    <>
      {showPicker && (
        <EquipmentPicker
          planId={planId}
          systemId={systemId}
          onSelect={handleSelectEquipment}
          onClose={() => setShowPicker(false)}
        />
      )}

      <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
        borderRadius: 'var(--radius)', padding: 14, marginTop: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--gray-600)' }}>
            Add line item
          </div>
          <button className="btn-secondary btn-sm" onClick={() => setShowPicker(true)}>
            Browse equipment catalog
          </button>
        </div>

        <div className="form-row" style={{ marginBottom: 10 }}>
          <div>
            <label>Description *</label>
            <input
              placeholder="e.g. Rough In Draw, FLOAT SWITCH (Zone 1)"
              value={form.description}
              onChange={e => set('description', e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid',
          gridTemplateColumns: '80px 80px 120px 150px 160px', gap: 10, marginBottom: 12 }}>
          <div>
            <label>Sort #</label>
            <input value={form.sort_order} onChange={e => set('sort_order', e.target.value)} />
          </div>
          <div>
            <label>Qty</label>
            <input type="number" min="0" step="0.5" value={form.quantity}
              onChange={e => set('quantity', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label>Unit price ($)</label>
            <input type="number" min="0" step="0.01" value={form.unit_price}
              onChange={e => set('unit_price', parseFloat(e.target.value) || 0)} />
          </div>
          <div>
            <label>Type</label>
            <select value={form.pricing_flag} onChange={e => set('pricing_flag', e.target.value)}>
              <option value="standard">Standard</option>
              <option value="option">Option</option>
            </select>
          </div>
          <div>
            <label>Draw stage</label>
            <select value={form.draw_stage} onChange={e => set('draw_stage', e.target.value)}>
              <option value="">None</option>
              <option value="rough_in">Rough In</option>
              <option value="indoor">Indoor</option>
              <option value="outdoor">Outdoor</option>
              <option value="final">Final</option>
            </select>
          </div>
        </div>

        {/* Live extended price preview */}
        {form.unit_price > 0 && (
          <div style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600,
            marginBottom: 10 }}>
            Extended: ${(form.quantity * form.unit_price).toLocaleString('en-US',
              { minimumFractionDigits: 2 })}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-primary btn-sm"
            disabled={!form.description || add.isPending}
            onClick={() => add.mutate(form)}>
            {add.isPending ? 'Adding...' : 'Add'}
          </button>
          <button className="btn-secondary btn-sm" onClick={onDone}>Cancel</button>
        </div>
      </div>
    </>
  )
}

// ── Add house type form ───────────────────────────────────────
function AddHouseTypeForm({ planId, onDone }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [bidHours, setBidHours] = useState('')

  const add = useMutation({
    mutationFn: (data) => houseTypes.add(planId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plan', String(planId)] })
      onDone()
    },
  })

  return (
    <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
      borderRadius: 'var(--radius)', padding: 14, marginTop: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Add house type</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 12, marginBottom: 12 }}>
        <div>
          <label>House type name *</label>
          <input placeholder="e.g. NEWHAVEN, TYPE A"
            value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label>Bid hours</label>
          <input type="number" min="0" step="0.5" placeholder="0"
            value={bidHours} onChange={e => setBidHours(e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary btn-sm"
          disabled={!name || add.isPending}
          onClick={() => add.mutate({
            name, bid_hours: bidHours ? parseFloat(bidHours) : null
          })}>
          {add.isPending ? 'Adding...' : 'Add house type'}
        </button>
        <button className="btn-secondary btn-sm" onClick={onDone}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main plan detail page ─────────────────────────────────────
export default function PlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [addingHouseType, setAddingHouseType] = useState(false)
  const [addingLineItemTo, setAddingLineItemTo] = useState(null)
  const [kitZone, setKitZone] = useState(null)  // { systemId, zoneName }
  const [dirtyRows, setDirtyRows] = useState(0)

  const onRowEditingChange = useCallback((active) => {
    setDirtyRows(n => Math.max(0, n + (active ? 1 : -1)))
  }, [])

  // Block SPA navigation when a line item row is open for editing
  const blocker = useBlocker(dirtyRows > 0)

  // Block browser refresh / tab close
  useEffect(() => {
    if (dirtyRows === 0) return
    const handler = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirtyRows])

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', id],
    queryFn: () => plans.get(id),
  })

  const updateStatus = useMutation({
    mutationFn: (status) => plans.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
  })

  const generateQuote = useMutation({
    mutationFn: () => documents.generate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
  })

  const generateFieldSheet = useMutation({
    mutationFn: async () => {
      await documents.generateFieldSheet(id)
      await documents.fieldSheetDownload(id, `${plan?.plan_number}_field_sheet.pdf`)
    },
  })

  const addKitItems = useMutation({
    mutationFn: async ({ systemId, items }) => {
      for (const item of items) {
        await lineItems.add(parseInt(id), systemId, item)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
  })

  const duplicateHouseType = useMutation({
    mutationFn: ({ houseTypeId }) => houseTypeApi.duplicate(parseInt(id), houseTypeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
    onError: (e) => alert(e.response?.data?.detail || 'Could not duplicate house type'),
  })

  const deleteLineItem = useMutation({
    mutationFn: (liId) => lineItems.delete(id, liId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
  })

  const deletePlan = useMutation({
    mutationFn: () => plans.delete(parseInt(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); navigate('/plans') },
    onError: (e) => alert(e.response?.data?.detail || 'Could not delete plan'),
  })

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>
  )
  if (!plan) return <div className="error-msg">Plan not found.</div>

  const statusIdx  = STATUS_FLOW.indexOf(plan.status)
  const nextStatus = statusIdx >= 0 ? STATUS_FLOW[statusIdx + 1] : null
  const prevStatus = statusIdx > 0  ? STATUS_FLOW[statusIdx - 1]  : null
  const totalBid = plan.house_types.reduce((sum, ht) =>
    sum + ht.systems.reduce((s2, sys) =>
      s2 + sys.line_items.reduce((s3, li) => s3 + li.extended_price, 0), 0), 0)

  return (
    <div>
      {showEmailModal && (
        <EmailQuoteModal plan={plan} onClose={() => setShowEmailModal(false)} />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 4 }}>
            <Link to="/plans">Plans</Link> / {plan.plan_number}
          </div>
          <h1 className="page-title">{plan.plan_number}</h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button className="btn-secondary"
            onClick={async () => {
              const url = await documents.preview(id)
              window.open(url, '_blank')
            }}>
            Preview Quote
          </button>
          <button className="btn-secondary"
            style={{ background: 'var(--blue-light)', color: 'var(--blue)',
              border: '1px solid var(--blue-mid)' }}
            onClick={async () => {
              await generateQuote.mutateAsync()
              await documents.download(id, `${plan.plan_number}_quote.pdf`)
            }}
            disabled={generateQuote.isPending}>
            {generateQuote.isPending ? 'Generating...' : '⬇ Download Quote'}
          </button>
          <button className="btn-secondary"
            style={{ background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd' }}
            onClick={() => setShowEmailModal(true)}>
            ✉ Email Quote
          </button>
          <button className="btn-secondary"
            style={{ background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0' }}
            onClick={() => generateFieldSheet.mutate()}
            disabled={generateFieldSheet.isPending}>
            {generateFieldSheet.isPending ? 'Generating...' : '⬇ Field Sheet'}
          </button>

          {/* Divider between document actions and workflow actions */}
          <div style={{ width: 1, height: 32, background: 'var(--gray-200)', margin: '0 2px' }} />

          {/* Revert — only show if not already at the first status */}
          {prevStatus && (
            <button
              onClick={() => {
                if (window.confirm(
                  `Revert "${plan.plan_number}" from ${plan.status} back to ${prevStatus}?`
                )) updateStatus.mutate(prevStatus)
              }}
              disabled={updateStatus.isPending}
              style={{ background: 'var(--gray-100)', color: 'var(--gray-600)',
                border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
                padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              ← Revert to {prevStatus}
            </button>
          )}

          {/* Advance */}
          {nextStatus && (
            <button className="btn-primary"
              onClick={() => updateStatus.mutate(nextStatus)}
              disabled={updateStatus.isPending}>
              Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
            </button>
          )}

          {/* Mark as Lost — only from proposed */}
          {plan.status === 'proposed' && (
            <button
              onClick={() => {
                if (window.confirm(
                  `Mark "${plan.plan_number}" as Lost/Declined?\n\nThis indicates the bid was not won.`
                )) updateStatus.mutate('lost')
              }}
              disabled={updateStatus.isPending}
              style={{ background: 'none', color: 'var(--danger)', border: '1px solid #fecaca',
                borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13,
                fontWeight: 500, cursor: 'pointer' }}>
              Mark as Lost
            </button>
          )}

          {/* Delete — admin only, draft plans only */}
          {isAdmin && plan.status === 'draft' && (
            <button
              onClick={() => {
                if (window.confirm(
                  `Permanently delete plan "${plan.plan_number}"?\n\nThis cannot be undone.`
                )) deletePlan.mutate()
              }}
              disabled={deletePlan.isPending}
              style={{ background: 'none', color: 'var(--danger)', border: '1px solid #fecaca',
                borderRadius: 'var(--radius)', padding: '8px 14px', fontSize: 13,
                fontWeight: 500, cursor: 'pointer' }}>
              {deletePlan.isPending ? 'Deleting...' : 'Delete plan'}
            </button>
          )}
        </div>
      </div>

      {/* Meta cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Builder</div>
          <div style={{ fontWeight: 600 }}>{plan.project.builder.name}</div>
          <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
            {plan.project.builder.contact_name}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Project</div>
          <div style={{ fontWeight: 600 }}>{plan.project.name}</div>
          <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>{plan.project.code}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Status</div>
          <span className={`badge badge-${plan.status}`} style={{ fontSize: 13 }}>
            {plan.status}
          </span>
          {plan.contracted_at && (
            <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
              {new Date(plan.contracted_at).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Total Bid</div>
          <div style={{ fontWeight: 700, fontSize: 20, color: 'var(--blue)' }}>
            ${totalBid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
        </div>
      </div>

      {/* Empty plan guided flow */}
      {plan.house_types.length === 0 && (
        <div className="card" style={{ marginBottom: 20, textAlign: 'center',
          padding: '40px 24px', border: '2px dashed var(--gray-200)' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none"
              style={{ margin: '0 auto', display: 'block' }}>
              <rect x="8" y="6" width="32" height="36" rx="4"
                stroke="var(--gray-300)" strokeWidth="2"/>
              <line x1="16" y1="16" x2="32" y2="16"
                stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="22" x2="32" y2="22"
                stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round"/>
              <line x1="16" y1="28" x2="24" y2="28"
                stroke="var(--gray-300)" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <div style={{ fontWeight: 600, fontSize: 16, color: 'var(--gray-600)',
            marginBottom: 6 }}>
            This plan has no house types yet
          </div>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 20,
            maxWidth: 380, margin: '0 auto 20px' }}>
            Start by adding a house type below. Each house type gets its own zones,
            equipment, and line items. Then add line items or use the kit calculator
            to price out consumables.
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button className="btn-primary"
              onClick={() => setAddingHouseType(true)}>
              + Add house type
            </button>
            <button className="btn-secondary"
              onClick={async () => {
                const url = await documents.preview(id)
                window.open(url, '_blank')
              }}>
              Preview blank quote
            </button>
          </div>
        </div>
      )}

      {/* House types */}
      {plan.house_types.map(ht => (
        <div key={ht.id} className="card" style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 16 }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{ht.name}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                House #{ht.house_number}{ht.bid_hours ? ` · ${ht.bid_hours}h labor` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>House total</div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>
                  ${ht.systems.reduce((s, sys) =>
                    s + sys.line_items.reduce((s2, li) => s2 + li.extended_price, 0), 0
                  ).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <button
                onClick={() => {
                  if (window.confirm(
                    `Duplicate "${ht.name}" (House #${ht.house_number})?\n\nThis copies all zones and line items.`
                  )) duplicateHouseType.mutate({ houseTypeId: ht.id })
                }}
                title="Duplicate this house type"
                style={{ background: 'var(--gray-100)', color: 'var(--gray-600)',
                  border: '1px solid var(--gray-200)', borderRadius: 8,
                  padding: '6px 12px', fontSize: 13, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="4" y="4" width="9" height="9" rx="1.5"
                    stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M4 10H2.5A1.5 1.5 0 011 8.5V2.5A1.5 1.5 0 012.5 1h6A1.5 1.5 0 0110 2.5V4"
                    stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Duplicate
              </button>
            </div>
          </div>

          {ht.systems.map(sys => (
            <div key={sys.id} style={{ marginBottom: 20 }}>
              {/* Zone header */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--gray-600)' }}>
                  Zone {sys.system_number}
                  {sys.zone_label ? ` — ${sys.zone_label}` : ''}
                </div>
                {sys.equipment_system && (
                  <span style={{ fontSize: 12, color: 'var(--blue-mid)',
                    background: 'var(--blue-light)', padding: '2px 10px', borderRadius: 99 }}>
                    {sys.equipment_system.system_code} ·
                    ${sys.equipment_system.bid_price.toLocaleString()}
                  </span>
                )}
              </div>

              {/* Line items */}
              {sys.line_items.length > 0 && (
                <table className="table" style={{ fontSize: 13, marginBottom: 8 }}>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}>#</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'center', width: 55 }}>Qty</th>
                      <th style={{ textAlign: 'right', width: 100 }}>Unit</th>
                      <th style={{ textAlign: 'right', width: 120 }}>Extended</th>
                      <th style={{ textAlign: 'center', width: 80 }}>Type</th>
                      <th style={{ width: 60 }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {sys.line_items.map(li => (
                      <EditableLineItemRow
                        key={li.id}
                        planId={parseInt(id)}
                        li={li}
                        onDelete={(liId) => deleteLineItem.mutate(liId)}
                        onEditingChange={onRowEditingChange}
                      />
                    ))}
                  </tbody>
                </table>
              )}

              {/* Add line item */}
              {kitZone?.systemId === sys.id && (
                <KitCalculator
                  planId={parseInt(id)}
                  systemId={sys.id}
                  zoneName={sys.zone_label || `Zone ${sys.system_number}`}
                  existingDescriptions={kitZone.existingDescriptions}
                  onAddItems={(items) => addKitItems.mutate({ systemId: sys.id, items })}
                  onClose={() => setKitZone(null)}
                />
              )}
              {addingLineItemTo === sys.id ? (
                <AddLineItemForm
                  planId={parseInt(id)}
                  systemId={sys.id}
                  onDone={() => setAddingLineItemTo(null)}
                />
              ) : (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary btn-sm"
                    onClick={() => setAddingLineItemTo(sys.id)}>
                    + Add line item
                  </button>
                  <button className="btn-secondary btn-sm"
                    style={{ background: 'var(--blue-light)', color: 'var(--blue)',
                      border: '1px solid var(--blue-mid)' }}
                    onClick={() => setKitZone({
                      systemId: sys.id,
                      existingDescriptions: new Set(
                        sys.line_items.map(li => li.description.toLowerCase().trim())
                      ),
                    })}>
                    Kit pricing
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Draws */}
          {ht.draws.length > 0 && (
            <div style={{ marginTop: 12, paddingTop: 12,
              borderTop: '1px solid var(--gray-100)' }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)',
                marginBottom: 8 }}>DRAW SCHEDULE</div>
              <div style={{ display: 'flex', gap: 12 }}>
                {ht.draws.map(d => (
                  <div key={d.draw_number} style={{ background: 'var(--blue-light)',
                    borderRadius: 'var(--radius)', padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600,
                      textTransform: 'uppercase' }}>Draw {d.draw_number}</div>
                    <div style={{ fontWeight: 700, color: 'var(--blue)' }}>
                      ${d.amount.toLocaleString()}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gray-600)' }}>{d.stage}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add house type */}
      {addingHouseType ? (
        <AddHouseTypeForm
          planId={parseInt(id)}
          onDone={() => setAddingHouseType(false)}
        />
      ) : (
        <button className="btn-secondary"
          style={{ marginBottom: 16 }}
          onClick={() => setAddingHouseType(true)}>
          + Add house type
        </button>
      )}

      {/* Notes */}
      {plan.notes && (
        <div className="card" style={{ marginTop: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)',
            marginBottom: 6 }}>NOTES</div>
          <p style={{ fontSize: 14, color: 'var(--gray-600)' }}>{plan.notes}</p>
        </div>
      )}

      {/* Activity */}
      <ActivityLog planId={parseInt(id)} />

      {/* Unsaved changes blocker modal */}
      {blocker.state === 'blocked' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'var(--surface)', borderRadius: 'var(--radius)',
            padding: 28, width: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
            <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 10 }}>
              Unsaved changes
            </div>
            <div style={{ fontSize: 14, color: 'var(--gray-600)', marginBottom: 24 }}>
              You have a line item open for editing. If you leave now your changes will be lost.
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => blocker.reset()}>
                Stay & keep editing
              </button>
              <button className="btn-primary"
                style={{ background: 'var(--danger)', borderColor: 'var(--danger)' }}
                onClick={() => blocker.proceed()}>
                Leave anyway
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ActivityLog({ planId }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['plan-activity', planId],
    queryFn: () => plans.activity(planId),
  })

  const EVENT_ICONS = {
    plan_created:          '✦',
    plan_contracted:       '★',
    plan_lost:             '✕',
    house_type_added:      '+',
    house_type_duplicated: '⧉',
    document_generated:    '⬇',
    quote_emailed:         '✉',
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)',
        marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Activity
      </div>
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 16 }}><span className="spinner" /></div>
      ) : events.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>No activity recorded.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {events.map((e, i) => (
            <div key={e.id} style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              paddingBottom: i < events.length - 1 ? 12 : 0,
              marginBottom: i < events.length - 1 ? 12 : 0,
              borderBottom: i < events.length - 1 ? '1px solid var(--gray-100)' : 'none',
            }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                background: 'var(--blue-light)', border: '1px solid var(--blue-mid)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, color: 'var(--blue)', fontWeight: 700,
              }}>
                {EVENT_ICONS[e.event_type] || '·'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--gray-700)' }}>{e.description}</div>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>
                  {e.username && e.username !== 'system' ? `${e.username} · ` : ''}
                  {e.event_at ? new Date(e.event_at).toLocaleString() : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
