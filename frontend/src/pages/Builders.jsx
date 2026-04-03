import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { builders } from '../api/client'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 50

const EMPTY_FORM = {
  code: '', name: '', contact_name: '', office_phone: '',
  cell_phone: '', email: '', address: '', city: '', state: '', zip_code: '',
}

function BuilderForm({ initial = EMPTY_FORM, onSave, onCancel, saving, title }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-mid)',
      borderRadius: 8, padding: 16 }}>
      {title && <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>{title}</div>}

      <div className="form-row form-row-2" style={{ marginBottom: 10 }}>
        <div>
          <label>Builder code *</label>
          <input placeholder="e.g. Q00839" value={form.code}
            onChange={e => set('code', e.target.value)} />
        </div>
        <div>
          <label>Company name *</label>
          <input placeholder="e.g. PDR Homes" value={form.name}
            onChange={e => set('name', e.target.value)} />
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--gray-400)', margin: '6px 0 10px' }}>
        Contact
      </div>
      <div className="form-row form-row-2" style={{ marginBottom: 10 }}>
        <div>
          <label>Contact name</label>
          <input placeholder="e.g. Greg Mason" value={form.contact_name}
            onChange={e => set('contact_name', e.target.value)} />
        </div>
        <div>
          <label>Email</label>
          <input type="email" placeholder="contact@builder.com"
            value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
      </div>
      <div className="form-row form-row-2" style={{ marginBottom: 10 }}>
        <div>
          <label>Office phone</label>
          <input placeholder="301-555-0100" value={form.office_phone}
            onChange={e => set('office_phone', e.target.value)} />
        </div>
        <div>
          <label>Cell phone</label>
          <input placeholder="301-555-0101" value={form.cell_phone}
            onChange={e => set('cell_phone', e.target.value)} />
        </div>
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.06em', color: 'var(--gray-400)', margin: '6px 0 10px' }}>
        Address
      </div>
      <div className="form-row" style={{ marginBottom: 10 }}>
        <div>
          <label>Street address</label>
          <input placeholder="7945 Wormans Mill Road" value={form.address}
            onChange={e => set('address', e.target.value)} />
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px',
        gap: 10, marginBottom: 14 }}>
        <div>
          <label>City</label>
          <input placeholder="Frederick" value={form.city}
            onChange={e => set('city', e.target.value)} />
        </div>
        <div>
          <label>State</label>
          <input placeholder="MD" maxLength={2} value={form.state}
            onChange={e => set('state', e.target.value.toUpperCase())} />
        </div>
        <div>
          <label>ZIP</label>
          <input placeholder="21701" value={form.zip_code}
            onChange={e => set('zip_code', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary btn-sm"
          disabled={!form.code || !form.name || saving}
          onClick={() => onSave(form)}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button className="btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export default function Builders() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search])

  const { data: builderList = [], isLoading, refetch } = useQuery({
    queryKey: ['builders'], queryFn: builders.list,
  })

  const filtered = builderList.filter(b =>
    !search ||
    b.name.toLowerCase().includes(search.toLowerCase()) ||
    b.code.toLowerCase().includes(search.toLowerCase()) ||
    (b.contact_name || '').toLowerCase().includes(search.toLowerCase())
  )
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const createBuilder = useMutation({
    mutationFn: (data) => builders.create(data),
    onSuccess: async () => {
      await refetch()
      qc.invalidateQueries({ queryKey: ['builders'] })
      setShowNew(false)
      setError('')
    },
    onError: (e) => setError(e.response?.data?.detail || 'Failed to create builder'),
  })

  const updateBuilder = useMutation({
    mutationFn: ({ id, data }) => builders.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builders'] })
      setEditingId(null)
    },
    onError: (e) => alert(e.response?.data?.detail || 'Failed to update builder'),
  })

  const deleteBuilder = useMutation({
    mutationFn: (id) => builders.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['builders'] }); refetch() },
    onError: (e) => alert(e.response?.data?.detail || 'Could not delete builder'),
  })

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Builders</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {builderList.length} builder{builderList.length !== 1 ? 's' : ''} on file
          </div>
        </div>
        <button className="btn-primary"
          onClick={() => { setShowNew(s => !s); setEditingId(null) }}>
          {showNew ? 'Cancel' : '+ New Builder'}
        </button>
      </div>

      {/* New builder form */}
      {showNew && (
        <div style={{ marginBottom: 20 }}>
          {error && <div className="error-msg" style={{ marginBottom: 10 }}>{error}</div>}
          <BuilderForm
            title="New Builder"
            onSave={(data) => createBuilder.mutate(data)}
            onCancel={() => { setShowNew(false); setError('') }}
            saving={createBuilder.isPending}
          />
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input placeholder="Search builders, codes, contacts..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }} />
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search ? `No builders match "${search}"` : 'No builders yet.'}</p>
            {!search && (
              <button className="btn-primary btn-sm" style={{ marginTop: 12 }}
                onClick={() => setShowNew(true)}>
                Add your first builder
              </button>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Code</th>
                <th>Company</th>
                <th>Contact</th>
                <th>Phone</th>
                <th>Email</th>
                <th>Location</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(b => (
                <>
                  <tr key={b.id}
                    style={{ background: editingId === b.id ? 'var(--blue-light)' : undefined }}>
                    <td style={{ paddingLeft: 20, fontFamily: 'monospace',
                      fontSize: 13, color: 'var(--blue-mid)', fontWeight: 600 }}>
                      {b.code}
                    </td>
                    <td style={{ fontWeight: 500 }}>{b.name}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                      {b.contact_name || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                      {b.office_phone || b.cell_phone || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                      {b.email || '—'}
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                      {[b.city, b.state].filter(Boolean).join(', ') || '—'}
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 16, whiteSpace: 'nowrap' }}>
                      <button
                        onClick={() => setEditingId(editingId === b.id ? null : b.id)}
                        style={{ background: 'none', color: 'var(--gray-400)',
                          padding: '3px 7px', fontSize: 14, marginRight: 4,
                          border: '1px solid var(--gray-200)', borderRadius: 6,
                          cursor: 'pointer' }}
                        title="Edit">
                        ✎
                      </button>
                      <button
                        onClick={() => {
                          if (window.confirm(
                            `Delete builder "${b.name}" (${b.code})?\n\nThis will fail if any projects reference this builder.`
                          )) deleteBuilder.mutate(b.id)
                        }}
                        style={{ background: 'none', color: 'var(--danger)',
                          border: '1px solid #fecaca', borderRadius: 6,
                          padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                  {editingId === b.id && (
                    <tr key={`${b.id}-edit`}>
                      <td colSpan={7} style={{ padding: '0 16px 16px' }}>
                        <BuilderForm
                          initial={{
                            code: b.code, name: b.name,
                            contact_name: b.contact_name || '',
                            office_phone: b.office_phone || '',
                            cell_phone: b.cell_phone || '',
                            email: b.email || '',
                            address: b.address || '',
                            city: b.city || '',
                            state: b.state || '',
                            zip_code: b.zip_code || '',
                          }}
                          onSave={(data) => updateBuilder.mutate({ id: b.id, data })}
                          onCancel={() => setEditingId(null)}
                          saving={updateBuilder.isPending}
                        />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} total={filtered.length}
        pageSize={PAGE_SIZE} onChange={setPage} />
    </div>
  )
}
