import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plans, documents, lineItems, houseTypes, equipment, houseTypeApi, systems, draws as drawsApi, search, kit } from '../api/client'
import InlineKitSelector from '../components/InlineKitSelector'
import ConfirmModal from '../components/ConfirmModal'

// ── Email Quote modal ─────────────────────────────────────────
function EmailQuoteModal({ plan, currentUser, onClose, onSent }) {
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
      onSent?.()
    } catch (e) {
      setErrMsg(e.response?.data?.detail || 'Failed to send. Check server logs.')
      setStatus('error')
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', width: 520,
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
            {!currentUser?.email && (
              <div style={{ background: 'var(--status-proposed-bg)', border: '1px solid var(--status-proposed-border)',
                borderRadius: 6, padding: '8px 12px', fontSize: 13, color: 'var(--status-proposed-text)' }}>
                Your account has no email address — builder replies will go to the shared
                SMTP inbox instead of you. Ask an admin to add your email in User Management.
              </div>
            )}
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
              <div style={{ fontSize: 13, color: 'var(--status-lost-text)', background: 'var(--status-lost-bg)',
                border: '1px solid var(--status-lost-border)', borderRadius: 6, padding: '8px 12px' }}>
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
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

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
        background: 'var(--card-bg)', borderRadius: 'var(--radius)', width: '90%', maxWidth: 740,
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
// ── Kit component sub-row (within a bid line item) ───────────
function KitComponentRow({ planId, comp }) {
  const qc = useQueryClient()
  const [qty, setQty] = useState(String(comp.quantity))
  const [dirty, setDirty] = useState(false)

  const updateMut = useMutation({
    mutationFn: (data) => kit.updateLineItemComponent(comp.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan', String(planId)] }); setDirty(false) },
  })

  function commitQty() {
    const q = parseFloat(qty)
    if (!isNaN(q) && q !== comp.quantity) {
      updateMut.mutate({ quantity: q })
    } else {
      setQty(String(comp.quantity))
      setDirty(false)
    }
  }

  function toggleExcluded() {
    updateMut.mutate({ excluded: !comp.excluded })
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '4px 12px 4px 28px',
      opacity: comp.excluded ? 0.4 : 1,
      borderBottom: '1px solid var(--gray-100)',
      fontSize: 12,
    }}>
      <span style={{ color: 'var(--gray-400)', fontSize: 10, flexShrink: 0 }}>└</span>
      <span style={{ flex: 1, color: comp.excluded ? 'var(--gray-400)' : 'var(--gray-700)',
        textDecoration: comp.excluded ? 'line-through' : 'none' }}>
        {comp.description}
        {comp.part_number && (
          <span style={{ marginLeft: 6, color: 'var(--gray-400)', fontFamily: 'monospace', fontSize: 10 }}>
            {comp.part_number}
          </span>
        )}
      </span>
      <input
        type="number" min="0" step="0.001"
        value={dirty ? qty : comp.quantity}
        disabled={comp.excluded}
        onChange={e => { setQty(e.target.value); setDirty(true) }}
        onBlur={commitQty}
        onKeyDown={e => e.key === 'Enter' && commitQty()}
        style={{ width: 52, fontSize: 12, textAlign: 'center', padding: '2px 4px' }}
      />
      <span style={{ color: 'var(--gray-400)', fontSize: 11, width: 70, textAlign: 'right', flexShrink: 0 }}>
        {comp.excluded ? '—' : `$${(comp.quantity * comp.unit_cost).toFixed(4)}`}
      </span>
      <button
        onClick={toggleExcluded}
        title={comp.excluded ? 'Include' : 'Exclude (we have stock)'}
        disabled={updateMut.isPending}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 2px', flexShrink: 0,
          fontSize: 14, color: comp.excluded ? 'var(--success)' : 'var(--gray-300)' }}>
        {comp.excluded ? '↩' : '✕'}
      </button>
    </div>
  )
}

function LineItemRow({ planId, li, onDelete }) {
  const qc = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [showComponents, setShowComponents] = useState(false)
  const [confirm, setConfirm] = useState(null)
  const [form, setForm] = useState({
    description: li.description,
    quantity:    li.quantity,
    unit_price:  li.unit_price,
  })
  const [suggestions, setSuggestions] = useState([])

  const isKit = !!li.kit_variant_id
  const components = li.components || []
  const activeComponents = components.filter(c => !c.excluded)

  useEffect(() => {
    if (!editing) return
    const q = form.description.trim()
    if (q.length < 3) { setSuggestions([]); return }
    const timer = setTimeout(() => {
      search.lineItemSuggestions(q)
        .then(data => setSuggestions(data.filter(s => s.description !== form.description)))
        .catch(() => setSuggestions([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [form.description, editing])

  const save = useMutation({
    mutationFn: () => lineItems.update(planId, li.id, form),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan', String(planId)] }); setEditing(false) },
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (editing) {
    return (
      <div style={{ padding: '10px 12px', background: 'var(--blue-light)',
        borderRadius: 8, marginBottom: 4, border: '1px solid var(--blue-mid)' }}>
        <div style={{ position: 'relative', marginBottom: 8 }}>
          <input value={form.description} onChange={e => set('description', e.target.value)}
            style={{ width: '100%', fontSize: 14 }} autoFocus
            onKeyDown={e => { if (e.key === 'Escape') setEditing(false) }} />
          {suggestions.length > 0 && (
            <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
              background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
              borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              maxHeight: 180, overflowY: 'auto' }}>
              {suggestions.map((s, i) => (
                <div key={i}
                  onMouseDown={() => { set('description', s.description); set('unit_price', s.avg_price); setSuggestions([]) }}
                  style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                    borderBottom: '1px solid var(--gray-100)',
                    display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span>{s.description}</span>
                  <span style={{ color: 'var(--gray-400)', fontSize: 12, whiteSpace: 'nowrap' }}>
                    avg ${s.avg_price.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
            color: 'var(--gray-600)', margin: 0 }}>
            Qty
            <input type="number" min="0" step="0.5" value={form.quantity}
              onChange={e => set('quantity', parseFloat(e.target.value) || 0)}
              style={{ width: 58, fontSize: 13, textAlign: 'center' }} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
            color: 'var(--gray-600)', margin: 0 }}>
            Unit $
            <input type="number" min="0" step="0.01" value={form.unit_price}
              onChange={e => set('unit_price', parseFloat(e.target.value) || 0)}
              style={{ width: 86, fontSize: 13, textAlign: 'right' }} />
          </label>
          {form.unit_price > 0 && (
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)', marginLeft: 4 }}>
              = ${(form.quantity * form.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          )}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            <button className="btn-primary btn-sm" onClick={() => save.mutate()} disabled={save.isPending}>
              {save.isPending ? '…' : 'Save'}
            </button>
            <button className="btn-secondary btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        onClick={() => setEditing(true)}
        style={{ display: 'flex', alignItems: 'center', gap: 12,
          padding: '9px 12px', cursor: 'pointer',
          borderBottom: (isKit && showComponents) ? 'none' : '1px solid var(--gray-100)', borderRadius: 4 }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
        <span style={{ flex: 1, fontSize: 14, color: 'var(--gray-800)' }}>
          {li.description}
          {li.quantity !== 1 && (
            <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 6 }}>
              ×{li.quantity}
            </span>
          )}
          {isKit && (
            <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.05em', color: 'var(--blue-mid)', background: 'var(--blue-light)',
              borderRadius: 4, padding: '1px 5px' }}>
              Kit
            </span>
          )}
        </span>
        {li.extended_price > 0 && (
          <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--gray-700)', flexShrink: 0 }}>
            ${li.extended_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        )}
        {isKit && components.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); setShowComponents(s => !s) }}
            title="Show/hide components"
            style={{ background: 'none', border: '1px solid var(--gray-200)', borderRadius: 4,
              color: 'var(--gray-400)', fontSize: 11, cursor: 'pointer', padding: '2px 6px', flexShrink: 0 }}>
            {showComponents ? '▴' : `▾ ${activeComponents.length}/${components.length}`}
          </button>
        )}
        <button
          onClick={e => { e.stopPropagation(); setConfirm({ title: 'Remove item?', message: li.description, confirmLabel: 'Remove', onConfirm: () => onDelete(li.id) }) }}
          style={{ background: 'none', border: 'none', color: 'var(--gray-300)',
            fontSize: 20, cursor: 'pointer', padding: '0 2px', flexShrink: 0, lineHeight: 1 }}>
          ×
        </button>
      </div>
      {isKit && showComponents && components.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--gray-100)' }}>
          <div style={{ padding: '3px 12px 3px 28px', display: 'flex', gap: 8, fontSize: 10,
            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--gray-400)',
            borderBottom: '1px solid var(--gray-100)' }}>
            <span style={{ flex: 1 }}>Component</span>
            <span style={{ width: 52, textAlign: 'center' }}>Qty</span>
            <span style={{ width: 70, textAlign: 'right' }}>Cost</span>
            <span style={{ width: 22 }} />
          </div>
          {components.map(c => <KitComponentRow key={c.id} planId={planId} comp={c} />)}
        </div>
      )}
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

// ── Add custom line item form ─────────────────────────────────
function AddItemForm({ planId, systemId, onDone }) {
  const qc = useQueryClient()
  const [suggestions, setSuggestions] = useState([])
  const [form, setForm] = useState({ description: '', quantity: 1, unit_price: 0 })

  useEffect(() => {
    const q = form.description.trim()
    if (q.length < 3) { setSuggestions([]); return }
    const timer = setTimeout(() => {
      search.lineItemSuggestions(q).then(setSuggestions).catch(() => setSuggestions([]))
    }, 300)
    return () => clearTimeout(timer)
  }, [form.description])

  const add = useMutation({
    mutationFn: () => lineItems.add(planId, systemId, {
      ...form, category_code: null, sort_order: 20,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan', String(planId)] }); onDone() },
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ background: 'var(--gray-50)', border: '1px dashed var(--gray-300)',
      borderRadius: 8, padding: '12px 14px', marginTop: 8 }}>
      <div style={{ position: 'relative', marginBottom: 10 }}>
        <input placeholder="Item description…" value={form.description} autoFocus
          onChange={e => set('description', e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') onDone() }}
          style={{ width: '100%', fontSize: 14 }} />
        {suggestions.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
            background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
            borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            maxHeight: 180, overflowY: 'auto' }}>
            {suggestions.map((s, i) => (
              <div key={i}
                onMouseDown={() => { set('description', s.description); set('unit_price', s.avg_price); setSuggestions([]) }}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13,
                  borderBottom: '1px solid var(--gray-100)',
                  display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                <span>{s.description}</span>
                <span style={{ color: 'var(--gray-400)', fontSize: 12 }}>avg ${s.avg_price.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
          color: 'var(--gray-600)', margin: 0 }}>
          Qty
          <input type="number" min="0" step="0.5" value={form.quantity}
            onChange={e => set('quantity', parseFloat(e.target.value) || 0)}
            style={{ width: 58, fontSize: 13, textAlign: 'center' }} />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 13,
          color: 'var(--gray-600)', margin: 0 }}>
          Unit $
          <input type="number" min="0" step="0.01" value={form.unit_price}
            onChange={e => set('unit_price', parseFloat(e.target.value) || 0)}
            style={{ width: 86, fontSize: 13, textAlign: 'right' }} />
        </label>
        {form.unit_price > 0 && (
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--blue)' }}>
            = ${(form.quantity * form.unit_price).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <button className="btn-primary btn-sm" disabled={!form.description || add.isPending}
            onClick={() => add.mutate()}>
            {add.isPending ? '…' : 'Add'}
          </button>
          <button className="btn-secondary btn-sm" onClick={onDone}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

// ── Quote version history ─────────────────────────────────────
function QuoteHistory({ planId, inline }) {
  const { data: history = [] } = useQuery({
    queryKey: ['quote-history', String(planId)],
    queryFn:  () => documents.history(planId),
  })
  if (history.length === 0) return (
    <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>No quotes generated yet.</div>
  )
  const content = history.map(d => (
    <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '7px 0', borderBottom: '1px solid var(--gray-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px',
          borderRadius: 99, background: 'var(--blue-light)', color: 'var(--blue)' }}>
          v{d.version}
        </span>
        <span style={{ fontSize: 13, color: 'var(--gray-600)' }}>{d.filename}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
          {new Date(d.generated_at).toLocaleDateString()} {new Date(d.generated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        <button onClick={() => documents.downloadVersion(planId, d.id, d.filename)}
          style={{ fontSize: 12, background: 'none', border: '1px solid var(--gray-200)',
            borderRadius: 6, padding: '3px 10px', cursor: 'pointer', color: 'var(--gray-600)' }}>
          ⬇ Download
        </button>
      </div>
    </div>
  ))
  if (inline) return <div>{content}</div>
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--gray-600)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Quote Versions
      </div>
      {content}
    </div>
  )
}

// ── Email history ─────────────────────────────────────────────
function EmailHistory({ planId, inline }) {
  const { data: emails = [] } = useQuery({
    queryKey: ['plan-emails', String(planId)],
    queryFn:  () => plans.emails(planId),
  })
  if (emails.length === 0) return (
    <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>No emails sent yet.</div>
  )
  const content = emails.map(e => (
    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between',
      alignItems: 'flex-start', padding: '8px 0',
      borderBottom: '1px solid var(--gray-100)' }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500 }}>{e.to}</div>
        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>{e.subject}</div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--gray-500)' }}>
          {new Date(e.sent_at).toLocaleDateString()} {new Date(e.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>by {e.sent_by}</div>
      </div>
    </div>
  ))
  if (inline) return <div>{content}</div>
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--gray-600)',
        textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
        Emails Sent
      </div>
      {content}
    </div>
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

// ── Zone header with inline label editing ─────────────────────
function ZoneHeader({ sys, isOnly, onLabelSave, onDelete, zoneBid }) {
  const [editing, setEditing] = useState(false)
  const [label, setLabel] = useState(sys.zone_label || '')

  function handleBlur() {
    setEditing(false)
    const trimmed = label.trim()
    if (trimmed !== (sys.zone_label || '')) onLabelSave(trimmed || null)
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--gray-800)', flexShrink: 0 }}>
        Zone {sys.system_number}
      </span>
      {editing ? (
        <input
          value={label}
          onChange={e => setLabel(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); if (e.key === 'Escape') { setLabel(sys.zone_label || ''); setEditing(false) } }}
          placeholder="Label (e.g. Upstairs, Master)"
          autoFocus
          style={{ fontSize: 13, padding: '3px 8px', flex: 1, maxWidth: 260 }}
        />
      ) : (
        <span
          onClick={() => { setLabel(sys.zone_label || ''); setEditing(true) }}
          style={{ fontSize: 13, color: sys.zone_label ? 'var(--gray-700)' : 'var(--gray-300)',
            fontStyle: sys.zone_label ? 'normal' : 'italic',
            cursor: 'text', padding: '2px 4px', borderRadius: 4,
            border: '1px dashed transparent',
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gray-200)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
          title="Click to add/edit label">
          {sys.zone_label || 'add label…'}
        </span>
      )}
      {/* Zone total always visible in header */}
      {zoneBid > 0 && (
        <span style={{ marginLeft: 'auto', fontWeight: 700, fontSize: 15, color: 'var(--blue)',
          flexShrink: 0 }}>
          ${zoneBid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </span>
      )}
      {!isOnly && (
        <button
          onClick={onDelete}
          style={{ background: 'none', border: 'none',
            color: 'var(--gray-300)', cursor: 'pointer', fontSize: 16,
            padding: '2px 4px', lineHeight: 1, flexShrink: 0 }}
          title="Delete this zone">
          ×
        </button>
      )}
    </div>
  )
}

// ── Constants ─────────────────────────────────────────────────
const LABOR_RATE   = 86
const SERVICE_RATE = 32
const PERMIT_COST  = 170

// ── Bid receipt (per zone) ─────────────────────────────────────
function BidSummary({ planId, system, factor }) {
  const qc = useQueryClient()
  const [expanded, setExpanded] = useState(false)
  const [fields, setFields] = useState({
    labor_hrs:     system.labor_hrs,
    service_qty:   system.service_qty,
    permit_yn:     system.permit_yn,
    sales_tax_pct: system.sales_tax_pct,
  })

  const save = useMutation({
    mutationFn: (data) => systems.update(planId, system.id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', String(planId)] }),
  })

  // Auto-save on blur of any field
  const commit = (patch) => {
    const updated = { ...fields, ...patch }
    setFields(updated)
    save.mutate(updated)
  }

  const matCost    = system.line_items.reduce((s, li) => s + li.extended_price, 0)
  const matSelling = factor > 0 ? matCost / factor : 0
  const equipSell  = system.equipment_system?.bid_price ?? 0
  const laborAmt   = fields.labor_hrs * LABOR_RATE
  const serviceAmt = fields.service_qty * SERVICE_RATE
  const permitAmt  = fields.permit_yn ? PERMIT_COST : 0
  const taxAmt     = matCost * fields.sales_tax_pct
  const finalBid   = matSelling + equipSell + laborAmt + serviceAmt + permitAmt + taxAmt

  const fmt  = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtP = (n) => '+' + fmt(n)

  const inputStyle = {
    width: 58, fontSize: 14, textAlign: 'center', padding: '2px 6px',
    background: 'var(--input-bg)', border: '1px solid var(--gray-300)',
    borderRadius: 6, fontWeight: 600,
  }
  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '7px 0', borderBottom: '1px solid var(--gray-100)',
  }
  const labelStyle = { display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 15, color: 'var(--gray-700)' }
  const amtStyle  = { fontSize: 15, color: 'var(--gray-800)', fontWeight: 500 }
  const hintStyle = { fontSize: 12, color: 'var(--gray-400)' }

  return (
    <div style={{ marginTop: 16, borderTop: '2px solid var(--gray-100)', paddingTop: 12 }}>

      {/* Collapsed: just show total + expand toggle */}
      {!expanded ? (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button
            onClick={() => setExpanded(true)}
            style={{ fontSize: 13, color: 'var(--gray-400)', background: 'none', border: 'none',
              cursor: 'pointer', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ fontSize: 10 }}>▸</span> Adjust labor, permit &amp; tax
          </button>
          <span style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue)' }}>
            {fmt(finalBid)}
          </span>
        </div>
      ) : (
        /* Expanded: full breakdown */
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--gray-400)' }}>
              Zone Bid Breakdown
            </div>
            <button onClick={() => setExpanded(false)}
              style={{ fontSize: 12, color: 'var(--gray-400)', background: 'none',
                border: 'none', cursor: 'pointer' }}>
              ▾ Hide
            </button>
          </div>

          {/* Materials */}
          {matCost > 0 && (
            <div style={rowStyle}>
              <div style={labelStyle}>
                Kit items &amp; materials
                <span style={hintStyle}>÷ {factor.toFixed(2)} factor</span>
              </div>
              <span style={amtStyle}>{fmt(matSelling)}</span>
            </div>
          )}

          {/* Equipment */}
          {equipSell > 0 && (
            <div style={rowStyle}>
              <span style={labelStyle}>Equipment</span>
              <span style={amtStyle}>{fmtP(equipSell)}</span>
            </div>
          )}

          {/* Labor */}
          <div style={rowStyle}>
            <label style={{ ...labelStyle, cursor: 'default', margin: 0 }}>
              Labor
              <input
                type="number" min="0" step="0.5"
                value={fields.labor_hrs}
                onChange={e => setFields(f => ({ ...f, labor_hrs: parseFloat(e.target.value) || 0 }))}
                onBlur={e => commit({ labor_hrs: parseFloat(e.target.value) || 0 })}
                style={inputStyle}
              />
              <span style={hintStyle}>hrs × ${LABOR_RATE}/hr</span>
            </label>
            <span style={amtStyle}>{fmtP(laborAmt)}</span>
          </div>

          {/* Service */}
          <div style={rowStyle}>
            <label style={{ ...labelStyle, cursor: 'default', margin: 0 }}>
              Service calls
              <input
                type="number" min="0" step="1"
                value={fields.service_qty}
                onChange={e => setFields(f => ({ ...f, service_qty: parseInt(e.target.value) || 0 }))}
                onBlur={e => commit({ service_qty: parseInt(e.target.value) || 0 })}
                style={inputStyle}
              />
              <span style={hintStyle}>× ${SERVICE_RATE} each</span>
            </label>
            <span style={amtStyle}>{fmtP(serviceAmt)}</span>
          </div>

          {/* Permit */}
          <div style={rowStyle}>
            <label style={{ ...labelStyle, cursor: 'pointer', margin: 0 }}>
              <input
                type="checkbox" checked={fields.permit_yn}
                onChange={e => commit({ permit_yn: e.target.checked })}
                style={{ width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--blue)' }}
              />
              Permit required
              <span style={hintStyle}>${PERMIT_COST} flat</span>
            </label>
            <span style={{ ...amtStyle, color: fields.permit_yn ? 'var(--gray-800)' : 'var(--gray-300)' }}>
              {fmtP(permitAmt)}
            </span>
          </div>

          {/* Sales tax */}
          <div style={{ ...rowStyle, borderBottom: 'none' }}>
            <label style={{ ...labelStyle, cursor: 'default', margin: 0 }}>
              Sales tax
              <input
                type="number" min="0" max="20" step="0.5"
                value={parseFloat((fields.sales_tax_pct * 100).toFixed(1))}
                onChange={e => setFields(f => ({ ...f, sales_tax_pct: (parseFloat(e.target.value) || 0) / 100 }))}
                onBlur={e => commit({ sales_tax_pct: (parseFloat(e.target.value) || 0) / 100 })}
                style={inputStyle}
              />
              <span style={hintStyle}>% on materials</span>
            </label>
            <span style={amtStyle}>{fmtP(taxAmt)}</span>
          </div>

          {/* Final bid */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: 14, paddingTop: 14, borderTop: '3px solid var(--gray-800)' }}>
            <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--gray-900)',
              textTransform: 'uppercase', letterSpacing: '0.03em' }}>
              Zone Bid
            </span>
            <span style={{ fontSize: 26, fontWeight: 800, color: 'var(--blue)' }}>
              {fmt(finalBid)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main plan detail page ─────────────────────────────────────
export default function PlanDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { user } = useAuth()
  const toast = useToast()
  const isAdmin = user?.role === 'admin'
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showDocMenu, setShowDocMenu] = useState(false)
  const [addingHouseType, setAddingHouseType] = useState(false)
  const [addingLineItemTo, setAddingLineItemTo] = useState(null)
  const [pickingEquipmentFor, setPickingEquipmentFor] = useState(null) // systemId
  const [editingFactor, setEditingFactor] = useState(false)
  const [factorInput, setFactorInput] = useState('')
  const [copied, setCopied] = useState(false)
  const [historyTab, setHistoryTab] = useState('activity')
  const [confirm, setConfirm] = useState(null)

  const { data: plan, isLoading } = useQuery({
    queryKey: ['plan', id],
    queryFn: () => plans.get(id),
  })

  const invalidatePlan = () => {
    qc.invalidateQueries({ queryKey: ['plan', id] })
    qc.invalidateQueries({ queryKey: ['plan-activity', id] })
  }

  const updateStatus = useMutation({
    mutationFn: (status) => plans.update(id, { status }),
    onSuccess: (_, status) => { invalidatePlan(); toast.success(`Status set to ${status}`) },
  })

  const generateQuote = useMutation({
    mutationFn: () => documents.generate(id),
    onSuccess: () => { invalidatePlan(); toast.success('Quote generated') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to generate quote'),
  })

  const generateFieldSheet = useMutation({
    mutationFn: async () => {
      await documents.generateFieldSheet(id)
      await documents.fieldSheetDownload(id, `${plan?.plan_number}_field_sheet.pdf`)
    },
    onSuccess: () => toast.success('Field sheet downloaded'),
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to generate field sheet'),
  })

  const generateTopSheet = useMutation({
    mutationFn: () => documents.generateTopSheet(id),
    onSuccess: () => toast.success('Top sheet generated'),
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to generate top sheet'),
  })

  const duplicateHouseType = useMutation({
    mutationFn: ({ houseTypeId }) => houseTypeApi.duplicate(parseInt(id), houseTypeId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan', id] }); toast.success('House type duplicated') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Could not duplicate house type'),
  })

  const linkEquipment = useMutation({
    mutationFn: ({ systemId, equipmentSystemId }) =>
      systems.update(parseInt(id), systemId, { equipment_system_id: equipmentSystemId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
  })

  const addZone = useMutation({
    mutationFn: (houseTypeId) => systems.add(parseInt(id), houseTypeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to add zone'),
  })

  const deleteZone = useMutation({
    mutationFn: (systemId) => systems.delete(parseInt(id), systemId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to delete zone'),
  })

  const updateZoneLabel = useMutation({
    mutationFn: ({ systemId, zone_label }) => systems.update(parseInt(id), systemId, { zone_label }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
    onError: () => toast.error('Failed to save zone label'),
  })

  const updateFactor = useMutation({
    mutationFn: (f) => plans.update(id, { factor: f }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
    onError: () => toast.error('Failed to update factor'),
  })

  const updateScope = useMutation({
    mutationFn: (data) => plans.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
    onError: () => toast.error('Failed to save changes'),
  })

  const deleteLineItem = useMutation({
    mutationFn: (liId) => lineItems.delete(id, liId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan', id] }),
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to remove item'),
  })

  const deletePlan = useMutation({
    mutationFn: () => plans.delete(parseInt(id)),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); navigate('/plans') },
    onError: (e) => toast.error(e.response?.data?.detail || 'Could not delete plan'),
  })

  if (isLoading) return (
    <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>
  )
  if (!plan) return <div className="error-msg">Plan not found.</div>

  const statusIdx  = STATUS_FLOW.indexOf(plan.status)
  const nextStatus = statusIdx >= 0 ? STATUS_FLOW[statusIdx + 1] : null
  const prevStatus = statusIdx > 0  ? STATUS_FLOW[statusIdx - 1]  : null
  const totalBid = (plan.house_types ?? []).reduce((sum, ht) =>
    sum + (ht.systems ?? []).reduce((s2, sys) => {
      const matCost    = (sys.line_items ?? []).reduce((s3, li) => s3 + li.extended_price, 0)
      const matSelling = plan.factor > 0 ? matCost / plan.factor : 0
      const equipSell  = sys.equipment_system?.bid_price ?? 0
      const laborAmt   = (sys.labor_hrs ?? 0) * LABOR_RATE
      const serviceAmt = (sys.service_qty ?? 0) * SERVICE_RATE
      const permitAmt  = sys.permit_yn ? PERMIT_COST : 0
      const taxAmt     = matCost * (sys.sales_tax_pct ?? 0.06)
      return s2 + matSelling + equipSell + laborAmt + serviceAmt + permitAmt + taxAmt
    }, 0), 0)

  return (
    <div>
      {showEmailModal && (
        <EmailQuoteModal
          plan={plan}
          currentUser={user}
          onClose={() => setShowEmailModal(false)}
          onSent={() => qc.invalidateQueries({ queryKey: ['plan-emails', id] })}
        />
      )}

      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 4 }}>
            <Link to="/plans">Plans</Link> / {plan.plan_number}
          </div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {plan.plan_number}
            <button
              onClick={() => {
                navigator.clipboard.writeText(plan.plan_number)
                setCopied(true)
                setTimeout(() => setCopied(false), 1500)
              }}
              title="Copy plan number"
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px',
                fontSize: 13, color: copied ? 'var(--blue)' : 'var(--gray-400)', lineHeight: 1 }}>
              {copied ? '✓' : '⧉'}
            </button>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* ── Documents dropdown ── */}
          <div style={{ position: 'relative' }}>
            <button
              className="btn-secondary"
              onClick={() => setShowDocMenu(m => !m)}
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              Documents
              <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
            </button>
            {showDocMenu && (
              <>
                {/* Backdrop to close */}
                <div style={{ position: 'fixed', inset: 0, zIndex: 49 }}
                  onClick={() => setShowDocMenu(false)} />
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
                  borderRadius: 'var(--radius)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 50, minWidth: 220, overflow: 'hidden',
                }}>
                  {[
                    {
                      label: 'Preview Quote',
                      icon: '👁',
                      action: async () => { const url = await documents.preview(id); window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 10000) },
                    },
                    {
                      label: generateQuote.isPending ? 'Generating...' : 'Generate & Download Quote',
                      icon: '⬇',
                      disabled: generateQuote.isPending,
                      action: async () => {
                        const result = await generateQuote.mutateAsync()
                        await documents.downloadVersion(id, result.id ?? result.doc_id, result.filename)
                          .catch(() => documents.download(id, result.filename))
                        qc.invalidateQueries({ queryKey: ['quote-history', id] })
                      },
                    },
                    {
                      label: 'Email Quote',
                      icon: '✉',
                      action: () => setShowEmailModal(true),
                    },
                    {
                      label: generateFieldSheet.isPending ? 'Generating...' : 'Field Sheet',
                      icon: '⬇',
                      disabled: generateFieldSheet.isPending,
                      action: async () => {
                        await documents.generateFieldSheet(id)
                        await documents.fieldSheetDownload(id, `${plan?.plan_number}_field_sheet.pdf`)
                      },
                    },
                    {
                      label: generateTopSheet.isPending ? 'Generating...' : 'Top Sheet',
                      icon: '⬇',
                      disabled: generateTopSheet.isPending,
                      action: async () => {
                        const result = await generateTopSheet.mutateAsync()
                        await documents.topSheetDownload(id, result.filename)
                      },
                    },
                    ...(isAdmin ? [{
                      label: plan.is_template ? '★ Remove from Templates' : '☆ Save as Template',
                      icon: '',
                      accent: plan.is_template,
                      action: () => {
                        const next = !plan.is_template
                        if (!next) {
                          setConfirm({ title: 'Remove from templates?', message: `"${plan.plan_number}" will no longer appear in the templates list.`, confirmLabel: 'Remove', danger: false, onConfirm: () => plans.update(id, { is_template: false }).then(() => { qc.invalidateQueries({ queryKey: ['plan', id] }); qc.invalidateQueries({ queryKey: ['plans', 'templates'] }) }) })
                        } else {
                          plans.update(id, { is_template: true }).then(() => { qc.invalidateQueries({ queryKey: ['plan', id] }); qc.invalidateQueries({ queryKey: ['plans', 'templates'] }) })
                        }
                      },
                    }] : []),
                  ].map((item, i) => (
                    <button key={i}
                      disabled={item.disabled}
                      onClick={() => { if (!item.disabled) { item.action(); setShowDocMenu(false) } }}
                      style={{
                        width: '100%', textAlign: 'left', background: 'none', border: 'none',
                        padding: '10px 16px', fontSize: 13, cursor: item.disabled ? 'not-allowed' : 'pointer',
                        display: 'flex', alignItems: 'center', gap: 10,
                        color: item.accent ? 'var(--status-proposed-accent)' : 'var(--gray-700)',
                        fontWeight: item.accent ? 600 : 400,
                        borderBottom: i < 4 || (isAdmin && i === 4) ? '1px solid var(--gray-100)' : 'none',
                        opacity: item.disabled ? 0.5 : 1,
                      }}
                      onMouseEnter={e => { if (!item.disabled) e.currentTarget.style.background = 'var(--gray-50)' }}
                      onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                      <span style={{ width: 16, textAlign: 'center', fontSize: 12 }}>{item.icon}</span>
                      {item.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 32, background: 'var(--gray-200)', margin: '0 2px' }} />

          {/* Revert */}
          {prevStatus && (
            <button
              onClick={() => setConfirm({ title: `Revert to ${prevStatus}?`, message: `Move "${plan.plan_number}" from ${plan.status} back to ${prevStatus}.`, confirmLabel: 'Revert', danger: false, onConfirm: () => updateStatus.mutate(prevStatus) })}
              disabled={updateStatus.isPending}
              style={{ background: 'var(--gray-100)', color: 'var(--gray-600)',
                border: '1px solid var(--gray-200)', borderRadius: 'var(--radius)',
                padding: '7px 14px', fontSize: 13, fontWeight: 500 }}>
              ← Revert to {prevStatus}
            </button>
          )}

          {/* Advance — color matches next status */}
          {nextStatus && (() => {
            const s = {
              proposed:   { bg: 'var(--status-proposed-accent)',   color: 'white' },
              contracted: { bg: 'var(--status-contracted-accent)', color: 'white' },
              complete:   { bg: 'var(--status-complete-accent)',   color: 'white' },
            }[nextStatus] || { bg: 'var(--blue)', color: 'white' }
            return (
              <button
                onClick={() => updateStatus.mutate(nextStatus)}
                disabled={updateStatus.isPending}
                style={{ background: s.bg, color: s.color, border: 'none',
                  borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 13, fontWeight: 600 }}>
                Mark as {nextStatus.charAt(0).toUpperCase() + nextStatus.slice(1)}
              </button>
            )
          })()}

          {/* Mark as Lost — proposed only */}
          {plan.status === 'proposed' && (
            <button
              onClick={() => setConfirm({ title: 'Mark as Lost?', message: `Mark "${plan.plan_number}" as Lost/Declined — indicates the bid was not won.`, confirmLabel: 'Mark Lost', onConfirm: () => updateStatus.mutate('lost') })}
              disabled={updateStatus.isPending}
              style={{ background: 'var(--status-lost-bg)', color: 'var(--status-lost-text)',
                border: '1px solid var(--status-lost-border)',
                borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 13, fontWeight: 500 }}>
              Mark as Lost
            </button>
          )}

          {/* Delete — admin only, draft plans only */}
          {isAdmin && plan.status === 'draft' && (
            <button
              onClick={() => setConfirm({ title: `Delete "${plan.plan_number}"?`, message: 'This will permanently delete the plan and all its zones, line items, and draws. This cannot be undone.', confirmLabel: 'Delete', onConfirm: () => deletePlan.mutate() })}
              disabled={deletePlan.isPending}
              style={{ background: 'var(--status-lost-bg)', color: 'var(--status-lost-text)',
                border: '1px solid var(--status-lost-border)',
                borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: 13, fontWeight: 500 }}>
              {deletePlan.isPending ? 'Deleting...' : 'Delete plan'}
            </button>
          )}
        </div>
      </div>

      {/* Meta cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Builder</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{plan.project.builder.name}</div>
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
            {plan.project.builder.contact_name}
          </div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 4 }}>Project</div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{plan.project.name}</div>
          <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>{plan.project.code}</div>
        </div>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 6 }}>Status</div>
          <span className={`badge badge-${plan.status}`} style={{ fontSize: 14 }}>
            {plan.status}
          </span>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 6 }}>
            {plan.estimator_name && `By ${plan.estimator_name}`}
            {plan.contracted_at && ` · ${new Date(plan.contracted_at).toLocaleDateString()}`}
          </div>
        </div>
        <div className="card" style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-mid)' }}>
          <div style={{ fontSize: 12, color: 'var(--blue)', marginBottom: 4, fontWeight: 600 }}>Total Bid</div>
          <div style={{ fontWeight: 800, fontSize: 28, color: 'var(--blue)', lineHeight: 1 }}>
            ${totalBid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </div>
          {/* Always-visible margin editor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--blue)', opacity: 0.8 }}>Margin</span>
            <input
              type="number" min="1" max="60" step="1"
              value={editingFactor ? factorInput : Math.round((1 - plan.factor) * 100)}
              onFocus={() => { setFactorInput(String(Math.round((1 - plan.factor) * 100))); setEditingFactor(true) }}
              onChange={e => setFactorInput(e.target.value)}
              onBlur={() => {
                const pct = parseFloat(factorInput)
                if (pct > 0 && pct < 100) updateFactor.mutate(+(1 - pct / 100).toFixed(4))
                setEditingFactor(false)
              }}
              onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur() }}
              style={{ width: 52, fontSize: 15, fontWeight: 700, textAlign: 'center',
                background: 'var(--input-bg)', border: '1px solid var(--blue-mid)', borderRadius: 6,
                padding: '3px 4px', color: 'var(--blue)' }}
            />
            <span style={{ fontSize: 12, color: 'var(--blue)', opacity: 0.8 }}>%</span>
            <span style={{ fontSize: 11, color: 'var(--blue)', opacity: 0.5, marginLeft: 2 }}>
              factor {plan.factor.toFixed(2)}
            </span>
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
                setTimeout(() => URL.revokeObjectURL(url), 10000)
              }}>
              Preview blank quote
            </button>
          </div>
        </div>
      )}

      {/* House types */}
      {plan.house_types.map(ht => {
        const htBid = ht.systems.reduce((s2, sys) => {
          const matCost    = sys.line_items.reduce((s3, li) => s3 + li.extended_price, 0)
          const matSelling = plan.factor > 0 ? matCost / plan.factor : 0
          const equipSell  = sys.equipment_system?.bid_price ?? 0
          const laborAmt   = (sys.labor_hrs ?? 0) * LABOR_RATE
          const serviceAmt = (sys.service_qty ?? 0) * SERVICE_RATE
          const permitAmt  = sys.permit_yn ? PERMIT_COST : 0
          const taxAmt     = matCost * (sys.sales_tax_pct ?? 0.06)
          return s2 + matSelling + equipSell + laborAmt + serviceAmt + permitAmt + taxAmt
        }, 0)

        return (
        <div key={ht.id} className="card" style={{ marginBottom: 20 }}>
          {/* House type header */}
          <div style={{ display: 'flex', justifyContent: 'space-between',
            alignItems: 'flex-start', marginBottom: 20, paddingBottom: 16,
            borderBottom: '2px solid var(--gray-100)' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>{ht.name}</div>
              <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 2 }}>
                House #{ht.house_number}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase',
                  letterSpacing: '0.04em' }}>House Bid</div>
                <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--blue)' }}>
                  ${htBid.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <button
                onClick={() => setConfirm({ title: `Duplicate "${ht.name}"?`, message: `Copies all zones and line items from House #${ht.house_number}.`, confirmLabel: 'Duplicate', danger: false, onConfirm: () => duplicateHouseType.mutate({ houseTypeId: ht.id }) })}
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

          {ht.systems.map((sys) => {
            const sysMatCost = sys.line_items.reduce((s, li) => s + li.extended_price, 0)
            const sysZoneBid = (plan.factor > 0 ? sysMatCost / plan.factor : 0)
              + (sys.equipment_system?.bid_price ?? 0)
              + (sys.labor_hrs ?? 0) * LABOR_RATE
              + (sys.service_qty ?? 0) * SERVICE_RATE
              + (sys.permit_yn ? PERMIT_COST : 0)
              + sysMatCost * (sys.sales_tax_pct ?? 0.06)
            return (
            <div key={sys.id} style={{
              border: '1px solid var(--gray-200)', borderRadius: 10,
              overflow: 'hidden', marginBottom: 16,
            }}>
              {/* Zone header strip */}
              <div style={{
                background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)',
                padding: '10px 16px',
              }}>
                <ZoneHeader
                  sys={sys}
                  isOnly={ht.systems.length === 1}
                  zoneBid={sysZoneBid}
                  onLabelSave={(label) => updateZoneLabel.mutate({ systemId: sys.id, zone_label: label })}
                  onDelete={() => setConfirm({ title: `Delete Zone ${sys.system_number}${sys.zone_label ? ` — ${sys.zone_label}` : ''}?`, message: 'All line items in this zone will be permanently removed.', confirmLabel: 'Delete Zone', onConfirm: () => deleteZone.mutate(sys.id) })}
                />
              </div>

              {/* Zone body */}
              <div style={{ padding: 16 }}>

                {/* 1. Equipment */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16,
                  padding: '12px 14px',
                  background: sys.equipment_system ? 'var(--blue-light)' : 'white',
                  border: `2px solid ${sys.equipment_system ? 'var(--blue-mid)' : 'var(--gray-200)'}`,
                  borderRadius: 8,
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {sys.equipment_system ? (
                      <>
                        <div style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>
                          Equipment
                        </div>
                        <div style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: 15,
                          color: 'var(--gray-900)' }}>
                          {sys.equipment_system.system_code}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--gray-600)', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {sys.equipment_system.description}
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: 15, color: 'var(--gray-400)' }}>
                        No equipment selected yet
                      </div>
                    )}
                  </div>
                  {sys.equipment_system && (
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Bid price</div>
                      <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--blue)' }}>
                        ${sys.equipment_system.bid_price.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => setPickingEquipmentFor(sys.id)}
                    style={{
                      flexShrink: 0,
                      background: sys.equipment_system ? 'white' : 'var(--blue)',
                      color: sys.equipment_system ? 'var(--gray-700)' : 'white',
                      border: `1px solid ${sys.equipment_system ? 'var(--gray-300)' : 'var(--blue)'}`,
                      borderRadius: 8, padding: '8px 20px',
                      fontSize: 14, fontWeight: 600, cursor: 'pointer',
                    }}>
                    {sys.equipment_system ? 'Change' : 'Select Equipment'}
                  </button>
                </div>

                {/* 2. Kit pricing chips */}
                <InlineKitSelector planId={parseInt(id)} systemId={sys.id} />

                {/* 3. Items added */}
                {sys.line_items.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.08em', color: 'var(--gray-400)', marginBottom: 6 }}>
                      Items Added
                    </div>
                    {sys.line_items.map(li => (
                      <LineItemRow
                        key={li.id}
                        planId={parseInt(id)}
                        li={li}
                        onDelete={(liId) => deleteLineItem.mutate(liId)}
                      />
                    ))}
                  </div>
                )}

                {/* Custom item button / form */}
                {addingLineItemTo === sys.id ? (
                  <AddItemForm
                    planId={parseInt(id)}
                    systemId={sys.id}
                    onDone={() => setAddingLineItemTo(null)}
                  />
                ) : (
                  <button
                    className="btn-secondary btn-sm"
                    style={{ marginTop: 10 }}
                    onClick={() => setAddingLineItemTo(sys.id)}>
                    + Custom item
                  </button>
                )}

                {/* 4. Bid receipt */}
                <BidSummary planId={parseInt(id)} system={sys} factor={plan.factor} />
              </div>

              {/* Equipment picker modal */}
              {pickingEquipmentFor === sys.id && (
                <EquipmentPicker
                  planId={parseInt(id)}
                  systemId={sys.id}
                  onSelect={(equip) => {
                    linkEquipment.mutate({ systemId: sys.id, equipmentSystemId: equip.id })
                    setPickingEquipmentFor(null)
                  }}
                  onClose={() => setPickingEquipmentFor(null)}
                />
              )}
            </div>
          )
          })}

          {/* Add zone */}
          <button
            className="btn-secondary btn-sm"
            style={{ marginBottom: 16 }}
            disabled={addZone.isPending}
            onClick={() => addZone.mutate(ht.id)}>
            + Add zone
          </button>

          {/* Draws */}
          <DrawSchedule planId={parseInt(id)} houseTypeId={ht.id} draws={ht.draws} />
        </div>
        )
      })}

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

      {/* Scope + Notes */}
      <div key={plan.id} className="card" style={{ marginTop: 8 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>INCLUDES</div>
            <textarea
              defaultValue={plan.includes || ''}
              placeholder="What's included in this bid..."
              rows={5}
              style={{ width: '100%', fontSize: 13, resize: 'vertical', padding: '6px 8px',
                border: '1px solid var(--gray-300)', borderRadius: 4, fontFamily: 'inherit' }}
              onBlur={(e) => { if (e.target.value !== (plan.includes || '')) updateScope.mutate({ includes: e.target.value }) }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>NOT INCLUDED</div>
            <textarea
              defaultValue={plan.excludes || ''}
              placeholder="What's excluded from this bid..."
              rows={5}
              style={{ width: '100%', fontSize: 13, resize: 'vertical', padding: '6px 8px',
                border: '1px solid var(--gray-300)', borderRadius: 4, fontFamily: 'inherit' }}
              onBlur={(e) => { if (e.target.value !== (plan.excludes || '')) updateScope.mutate({ excludes: e.target.value }) }}
            />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)', marginBottom: 6 }}>NOTES</div>
          <textarea
            defaultValue={plan.notes || ''}
            placeholder="Internal notes..."
            rows={3}
            style={{ width: '100%', fontSize: 13, resize: 'vertical', padding: '6px 8px',
              border: '1px solid var(--gray-300)', borderRadius: 4, fontFamily: 'inherit' }}
            onBlur={(e) => { if (e.target.value !== (plan.notes || '')) updateScope.mutate({ notes: e.target.value }) }}
          />
        </div>
      </div>

      {/* History panel */}
      <div className="card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid var(--gray-200)', padding: '0 4px' }}>
          {[
            { id: 'activity', label: 'Activity' },
            { id: 'quotes',   label: 'Quote Versions' },
            { id: 'emails',   label: 'Emails Sent' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setHistoryTab(tab.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                padding: '10px 16px', fontSize: 13, fontWeight: historyTab === tab.id ? 600 : 400,
                color: historyTab === tab.id ? 'var(--blue)' : 'var(--gray-400)',
                borderBottom: historyTab === tab.id ? '2px solid var(--blue)' : '2px solid transparent',
                marginBottom: -1, transition: 'color 0.15s',
              }}>
              {tab.label}
            </button>
          ))}
        </div>
        <div style={{ padding: 16 }}>
          {historyTab === 'activity' && <ActivityLog planId={parseInt(id)} inline />}
          {historyTab === 'quotes'   && <QuoteHistory planId={parseInt(id)} inline />}
          {historyTab === 'emails'   && <EmailHistory planId={parseInt(id)} inline />}
        </div>
      </div>

      {/* Comments + Tasks */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 24 }}>
        <PlanComments planId={parseInt(id)} currentUser={user} />
        <PlanTasks planId={parseInt(id)} currentUser={user} />
      </div>

      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}

function PlanComments({ planId, currentUser }) {
  const qc = useQueryClient()
  const [body, setBody] = useState('')
  const { data: comments = [] } = useQuery({
    queryKey: ['plan-comments', planId],
    queryFn:  () => plans.comments(planId),
  })
  const add = useMutation({
    mutationFn: () => plans.addComment(planId, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan-comments', planId] }); setBody('') },
  })
  const remove = useMutation({
    mutationFn: (cid) => plans.deleteComment(planId, cid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-comments', planId] }),
  })

  return (
    <div className="card">
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Comments</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        {comments.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--gray-400)' }}>No comments yet.</div>
        )}
        {comments.map(c => (
          <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: 'var(--blue-light)', color: 'var(--blue)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700,
            }}>
              {c.full_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{c.full_name}</span>
                <span style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                  {new Date(c.created_at).toLocaleString()}
                </span>
                {(c.username === currentUser?.username || currentUser?.role === 'admin') && (
                  <button onClick={() => remove.mutate(c.id)}
                    style={{ marginLeft: 'auto', fontSize: 11, background: 'none', border: 'none',
                      color: 'var(--gray-300)', cursor: 'pointer', padding: 0 }}>
                    ×
                  </button>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--gray-700)', whiteSpace: 'pre-wrap',
                wordBreak: 'break-word' }}>
                {c.body}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <textarea
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && body.trim()) add.mutate() }}
          placeholder="Add a comment… (Ctrl+Enter to submit)"
          rows={2}
          style={{ flex: 1, resize: 'vertical', fontSize: 13 }}
        />
        <button className="btn-primary" disabled={!body.trim() || add.isPending}
          onClick={() => add.mutate()}
          style={{ alignSelf: 'flex-end' }}>
          Post
        </button>
      </div>
    </div>
  )
}

function PlanTasks({ planId, currentUser }) {
  const qc = useQueryClient()
  const [title, setTitle] = useState('')
  const { data: tasks = [] } = useQuery({
    queryKey: ['plan-tasks', planId],
    queryFn:  () => plans.tasks(planId),
  })
  const add = useMutation({
    mutationFn: () => plans.addTask(planId, { title }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plan-tasks', planId] }); setTitle('') },
  })
  const toggle = useMutation({
    mutationFn: ({ tid, done }) => plans.updateTask(planId, tid, { done }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-tasks', planId] }),
  })
  const remove = useMutation({
    mutationFn: (tid) => plans.deleteTask(planId, tid),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['plan-tasks', planId] }),
  })

  const open = tasks.filter(t => !t.done)
  const done = tasks.filter(t => t.done)

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Tasks</div>
        {tasks.length > 0 && (
          <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
            {done.length}/{tasks.length} done
          </div>
        )}
      </div>

      {tasks.length === 0 && (
        <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 14 }}>No tasks yet.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 14 }}>
        {open.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '5px 0', borderBottom: '1px solid var(--gray-100)' }}>
            <input type="checkbox" checked={false}
              onChange={() => toggle.mutate({ tid: t.id, done: true })}
              style={{ cursor: 'pointer', flexShrink: 0, marginTop: 2, width: 'auto' }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, wordBreak: 'break-word',
              lineHeight: 1.4 }}>{t.title}</span>
            {t.assigned_to && (
              <span style={{ fontSize: 11, color: 'var(--gray-400)', whiteSpace: 'nowrap',
                flexShrink: 0 }}>
                {t.assigned_to}
              </span>
            )}
            <button onClick={() => remove.mutate(t.id)}
              style={{ background: 'none', border: 'none', color: 'var(--gray-300)',
                cursor: 'pointer', fontSize: 16, padding: '0 2px', flexShrink: 0,
                lineHeight: 1 }}>
              ×
            </button>
          </div>
        ))}
        {done.length > 0 && open.length > 0 && (
          <div style={{ height: 1, background: 'var(--gray-100)', margin: '4px 0' }} />
        )}
        {done.map(t => (
          <div key={t.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 8,
            padding: '5px 0', borderBottom: '1px solid var(--gray-100)', opacity: 0.5 }}>
            <input type="checkbox" checked={true}
              onChange={() => toggle.mutate({ tid: t.id, done: false })}
              style={{ cursor: 'pointer', flexShrink: 0, marginTop: 2, width: 'auto' }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13, textDecoration: 'line-through',
              color: 'var(--gray-500)', wordBreak: 'break-word', lineHeight: 1.4 }}>{t.title}</span>
            <button onClick={() => remove.mutate(t.id)}
              style={{ background: 'none', border: 'none', color: 'var(--gray-300)',
                cursor: 'pointer', fontSize: 16, padding: '0 2px', flexShrink: 0,
                lineHeight: 1 }}>
              ×
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input value={title} onChange={e => setTitle(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && title.trim()) add.mutate() }}
          placeholder="Add a task… (Enter to add)"
          style={{ flex: 1, fontSize: 13 }} />
        <button className="btn-primary" disabled={!title.trim() || add.isPending}
          onClick={() => add.mutate()}>
          Add
        </button>
      </div>
    </div>
  )
}

function DrawSchedule({ planId, houseTypeId, draws }) {
  const qc = useQueryClient()
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ stage: '', amount: '', draw_number: '' })
  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const invalidate = () => qc.invalidateQueries({ queryKey: ['plan', String(planId)] })

  const addDraw = useMutation({
    mutationFn: (data) => drawsApi.add(planId, houseTypeId, data),
    onSuccess: () => { invalidate(); setAdding(false); setForm({ stage: '', amount: '', draw_number: '' }) },
  })
  const updateDraw = useMutation({
    mutationFn: ({ drawId, data }) => drawsApi.update(planId, houseTypeId, drawId, data),
    onSuccess: () => { invalidate(); setEditingId(null) },
  })
  const deleteDraw = useMutation({
    mutationFn: (drawId) => drawsApi.delete(planId, houseTypeId, drawId),
    onSuccess: invalidate,
  })

  const nextDrawNumber = draws.length > 0
    ? Math.max(...draws.map(d => d.draw_number)) + 1
    : 1

  return (
    <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--gray-100)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)' }}>DRAW SCHEDULE</div>
        {!adding && (
          <button onClick={() => { setAdding(true); setForm({ stage: '', amount: '', draw_number: String(nextDrawNumber) }) }}
            style={{ fontSize: 11, background: 'none', border: '1px solid var(--gray-200)',
              borderRadius: 6, padding: '2px 8px', color: 'var(--gray-600)', cursor: 'pointer' }}>
            + Add draw
          </button>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-start' }}>
        {draws.map(d => (
          editingId === d.draw_number ? (
            <div key={d.draw_number} style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-mid)',
              borderRadius: 'var(--radius)', padding: '8px 12px', minWidth: 140 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
                <input placeholder="Draw #" type="number" value={form.draw_number}
                  onChange={e => setF('draw_number', e.target.value)}
                  style={{ fontSize: 12, padding: '3px 6px' }} />
                <input placeholder="Amount" type="number" value={form.amount}
                  onChange={e => setF('amount', e.target.value)}
                  style={{ fontSize: 12, padding: '3px 6px' }} />
              </div>
              <input placeholder="Stage description" value={form.stage}
                onChange={e => setF('stage', e.target.value)}
                style={{ fontSize: 12, padding: '3px 6px', width: '100%', marginBottom: 6 }} />
              <div style={{ display: 'flex', gap: 4 }}>
                <button className="btn-primary btn-sm" style={{ fontSize: 11 }}
                  disabled={updateDraw.isPending}
                  onClick={() => updateDraw.mutate({ drawId: d.draw_number, data: {
                    stage: form.stage, amount: parseFloat(form.amount), draw_number: parseInt(form.draw_number),
                  }})}>Save</button>
                <button className="btn-secondary btn-sm" style={{ fontSize: 11 }}
                  onClick={() => setEditingId(null)}>✕</button>
              </div>
            </div>
          ) : (
            <div key={d.draw_number} style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-mid)',
              borderRadius: 'var(--radius)', padding: '8px 14px', textAlign: 'center', position: 'relative' }}>
              <div style={{ fontSize: 11, color: 'var(--blue)', fontWeight: 600, textTransform: 'uppercase' }}>
                Draw {d.draw_number}
              </div>
              <div style={{ fontWeight: 700, color: 'var(--blue)', fontSize: 15 }}>
                ${d.amount.toLocaleString()}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray-600)', marginBottom: 6 }}>{d.stage}</div>
              <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                <button onClick={() => { setEditingId(d.draw_number); setForm({ stage: d.stage, amount: String(d.amount), draw_number: String(d.draw_number) }) }}
                  style={{ fontSize: 11, background: 'none', border: '1px solid var(--gray-200)',
                    borderRadius: 4, padding: '1px 6px', cursor: 'pointer', color: 'var(--gray-500)' }}>
                  Edit
                </button>
                <button onClick={() => setConfirm({ title: 'Delete draw?', message: `Draw ${d.draw_number} — ${d.stage} ($${d.amount.toLocaleString()})`, confirmLabel: 'Delete', onConfirm: () => deleteDraw.mutate(d.draw_number) })}
                  style={{ fontSize: 11, background: 'none', border: '1px solid var(--status-lost-border)',
                    borderRadius: 4, padding: '1px 6px', cursor: 'pointer', color: 'var(--danger)' }}>
                  ×
                </button>
              </div>
            </div>
          )
        ))}

        {adding && (
          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius)', padding: '8px 12px', minWidth: 160 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              <input placeholder="Draw #" type="number" value={form.draw_number}
                onChange={e => setF('draw_number', e.target.value)}
                style={{ fontSize: 12, padding: '3px 6px' }} autoFocus />
              <input placeholder="Amount" type="number" value={form.amount}
                onChange={e => setF('amount', e.target.value)}
                style={{ fontSize: 12, padding: '3px 6px' }} />
            </div>
            <input placeholder="Stage description" value={form.stage}
              onChange={e => setF('stage', e.target.value)}
              style={{ fontSize: 12, padding: '3px 6px', width: '100%', marginBottom: 6 }} />
            <div style={{ display: 'flex', gap: 4 }}>
              <button className="btn-primary btn-sm" style={{ fontSize: 11 }}
                disabled={!form.stage || !form.amount || addDraw.isPending}
                onClick={() => addDraw.mutate({
                  stage: form.stage, amount: parseFloat(form.amount), draw_number: parseInt(form.draw_number),
                })}>Add</button>
              <button className="btn-secondary btn-sm" style={{ fontSize: 11 }}
                onClick={() => setAdding(false)}>✕</button>
            </div>
          </div>
        )}

        {draws.length === 0 && !adding && (
          <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>No draws scheduled.</span>
        )}
      </div>
    </div>
  )
}

function ActivityLog({ planId, inline }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['plan-activity', String(planId)],
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

  const content = isLoading ? (
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
  )

  if (inline) return content
  return (
    <div className="card" style={{ marginTop: 16 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--gray-600)',
        marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        Activity
      </div>
      {content}
    </div>
  )
}
