import { useState, useEffect, Fragment } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projects, builders } from '../api/client'
import SearchSelect from '../components/SearchSelect'
import Pagination from '../components/Pagination'
import PageAlert from '../components/PageAlert'
import ConfirmModal from '../components/ConfirmModal'

const PAGE_SIZE = 50

function ProjectForm({ initial = { code: '', name: '', builder_id: '' }, onSave, onCancel, saving, builderOptions }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ background: 'var(--blue-light)', border: '1px solid var(--blue-mid)',
      borderRadius: 8, padding: 16 }}>
      <div className="form-row form-row-2" style={{ marginBottom: 12 }}>
        <div>
          <label>Project code *</label>
          <input placeholder="e.g. RP0732" value={form.code}
            onChange={e => set('code', e.target.value)} />
        </div>
        <div>
          <label>Project name *</label>
          <input placeholder="e.g. PARADISE CHURCH" value={form.name}
            onChange={e => set('name', e.target.value)} />
        </div>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label>Builder *</label>
        <SearchSelect
          options={builderOptions}
          value={form.builder_id}
          onChange={v => set('builder_id', v)}
          placeholder="Search or select builder..."
        />
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn-primary btn-sm"
          disabled={!form.code || !form.name || !form.builder_id || saving}
          onClick={() => onSave(form)}>
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button className="btn-secondary btn-sm" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

export default function Projects() {
  const qc = useQueryClient()
  const [searchParams] = useSearchParams()
  const [search, setSearch] = useState(() => searchParams.get('q') || '')
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [pageAlert, setPageAlert] = useState(null)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(new Set())
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { setPage(1) }, [search])

  const { data: projectList = [], isLoading } = useQuery({
    queryKey: ['projects'], queryFn: projects.list,
  })
  const { data: builderList = [] } = useQuery({
    queryKey: ['builders'], queryFn: builders.list,
  })

  const builderOptions = builderList.map(b => ({
    id: b.id, label: b.name, sublabel: b.code,
  }))

  const filtered = projectList.filter(p =>
    !search ||
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.code.toLowerCase().includes(search.toLowerCase()) ||
    p.builder_name.toLowerCase().includes(search.toLowerCase())
  )
  const totalPages  = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated   = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const toggleOne   = (id) => setSelected(s => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll   = () => setSelected(s => s.size === paginated.length ? new Set() : new Set(paginated.map(p => p.id)))
  const allSelected = paginated.length > 0 && paginated.every(p => selected.has(p.id))

  const createProject = useMutation({
    mutationFn: (data) => projects.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setShowNew(false)
      setError('')
    },
    onError: (e) => setError(e.response?.data?.detail || 'Failed to create project'),
  })

  const updateProject = useMutation({
    mutationFn: ({ id, data }) => projects.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setEditingId(null)
    },
    onError: (e) => setPageAlert({ msg: e.response?.data?.detail || 'Failed to update project', type: 'error' }),
  })

  const deleteProject = useMutation({
    mutationFn: (id) => projects.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }) },
    onError: (e) => setPageAlert({ msg: e.response?.data?.detail || 'Could not delete project', type: 'error' }),
  })

  const bulkDelete = useMutation({
    mutationFn: () => projects.bulkDelete([...selected]),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['projects'] }); setSelected(new Set())
      if (res.skipped_with_plans?.length)
        setPageAlert({ msg: `Skipped (have plans): ${res.skipped_with_plans.join(', ')}`, type: 'info' })
    },
    onError: (e) => setPageAlert({ msg: e.response?.data?.detail || 'Bulk delete failed', type: 'error' }),
  })

  return (
    <div>
      <PageAlert msg={pageAlert?.msg} type={pageAlert?.type} ttl={6000}
        onClose={() => setPageAlert(null)} />
      <div className="page-header">
        <div>
          <h1 className="page-title">Projects</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {projectList.length} project{projectList.length !== 1 ? 's' : ''} on file
          </div>
        </div>
        <button className="btn-primary"
          onClick={() => { setShowNew(s => !s); setEditingId(null) }}>
          {showNew ? 'Cancel' : '+ New Project'}
        </button>
      </div>

      {/* New project form */}
      {showNew && (
        <div style={{ marginBottom: 20 }}>
          {error && <div className="error-msg" style={{ marginBottom: 10 }}>{error}</div>}
          <ProjectForm
            builderOptions={builderOptions}
            onSave={(data) => createProject.mutate({
              code: data.code,
              name: data.name,
              builder_id: parseInt(data.builder_id),
            })}
            onCancel={() => { setShowNew(false); setError('') }}
            saving={createProject.isPending}
          />
        </div>
      )}

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          placeholder="Search projects, codes, builders..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 360 }}
        />
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12,
          background: 'var(--blue-light)', border: '1px solid var(--blue-mid)',
          borderRadius: 'var(--radius)', padding: '8px 14px' }}>
          <span style={{ fontSize: 13, color: 'var(--blue)', fontWeight: 600 }}>
            {selected.size} selected
          </span>
          <button onClick={() => setConfirm({ title: `Delete ${selected.size} project(s)?`, message: 'Projects with existing plans will be skipped. This cannot be undone.', confirmLabel: 'Delete', onConfirm: () => bulkDelete.mutate() })}
            disabled={bulkDelete.isPending}
            style={{ fontSize: 12, padding: '3px 10px', borderRadius: 6,
              background: 'var(--card-bg)', border: '1px solid var(--status-lost-border)',
              color: 'var(--danger)', cursor: 'pointer' }}>
            Delete selected
          </button>
          <button onClick={() => setSelected(new Set())}
            style={{ marginLeft: 'auto', fontSize: 12, background: 'none', border: 'none',
              color: 'var(--gray-400)', cursor: 'pointer' }}>
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <span className="spinner" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search ? 'No projects match your search.' : 'No projects yet.'}</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 12, width: 36 }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                <th>Code</th>
                <th>Project name</th>
                <th>Builder</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <Fragment key={p.id}>
                  <tr key={p.id}
                    style={{ background: editingId === p.id || selected.has(p.id) ? 'var(--blue-light)' : undefined }}>
                    <td style={{ paddingLeft: 12 }}>
                      <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggleOne(p.id)} style={{ cursor: 'pointer' }} />
                    </td>
                    <td style={{ fontFamily: 'monospace',
                      fontSize: 13, color: 'var(--blue-mid)', fontWeight: 600 }}>
                      {p.code}
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                      {p.builder_name}
                      <span style={{ color: 'var(--gray-400)', marginLeft: 6, fontSize: 12 }}>
                        ({p.builder_code})
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 16, whiteSpace: 'nowrap' }}>
                      <button className="btn-secondary btn-sm"
                        onClick={() => setEditingId(editingId === p.id ? null : p.id)}
                        style={{ marginRight: 6 }}>
                        {editingId === p.id ? 'Cancel' : 'Edit'}
                      </button>
                      <button className="btn-danger btn-sm"
                        onClick={() => setConfirm({ title: `Delete "${p.name}"?`, message: `Project code: ${p.code}\n\nCannot be deleted if plans reference this project.`, confirmLabel: 'Delete', onConfirm: () => deleteProject.mutate(p.id) })}>
                        Delete
                      </button>
                    </td>
                  </tr>
                  {editingId === p.id && (
                    <tr key={`${p.id}-edit`}>
                      <td colSpan={5} style={{ padding: '0 16px 16px' }}>
                        <ProjectForm
                          builderOptions={builderOptions}
                          initial={{
                            code: p.code,
                            name: p.name,
                            builder_id: String(p.builder_id),
                          }}
                          onSave={(data) => updateProject.mutate({
                            id: p.id,
                            data: {
                              code: data.code,
                              name: data.name,
                              builder_id: parseInt(data.builder_id),
                            },
                          })}
                          onCancel={() => setEditingId(null)}
                          saving={updateProject.isPending}
                        />
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Pagination page={page} totalPages={totalPages} total={filtered.length}
        pageSize={PAGE_SIZE} onChange={setPage} />
      {confirm && <ConfirmModal {...confirm} onCancel={() => setConfirm(null)} />}
    </div>
  )
}
