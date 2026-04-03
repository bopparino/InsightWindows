import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { projects, builders } from '../api/client'
import SearchSelect from '../components/SearchSelect'
import Pagination from '../components/Pagination'

const PAGE_SIZE = 50

function ProjectForm({ initial = { code: '', name: '', builder_id: '' }, onSave, onCancel, saving, builderOptions }) {
  const [form, setForm] = useState(initial)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <div style={{ background: 'var(--blue-light)', border: '1px solid #bfdbfe',
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
  const [search, setSearch] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => { setPage(1) }, [search])

  const { data: projectList = [], isLoading, refetch } = useQuery({
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
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated  = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const createProject = useMutation({
    mutationFn: (data) => projects.create(data),
    onSuccess: async () => {
      await refetch()
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
    onError: (e) => alert(e.response?.data?.detail || 'Failed to update project'),
  })

  const deleteProject = useMutation({
    mutationFn: (id) => projects.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); refetch() },
    onError: (e) => alert(e.response?.data?.detail || 'Could not delete project'),
  })

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Projects</h1>
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
                <th style={{ paddingLeft: 20 }}>Code</th>
                <th>Project name</th>
                <th>Builder</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(p => (
                <>
                  <tr key={p.id}
                    style={{ background: editingId === p.id ? 'var(--blue-light)' : undefined }}>
                    <td style={{ paddingLeft: 20, fontFamily: 'monospace',
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
                      <button
                        onClick={() => setEditingId(editingId === p.id ? null : p.id)}
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
                            `Delete project "${p.name}" (${p.code})?\n\nThis will fail if any plans reference it.`
                          )) deleteProject.mutate(p.id)
                        }}
                        style={{ background: 'none', color: 'var(--danger)',
                          border: '1px solid #fecaca', borderRadius: 6,
                          padding: '3px 8px', fontSize: 12, cursor: 'pointer' }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                  {editingId === p.id && (
                    <tr key={`${p.id}-edit`}>
                      <td colSpan={4} style={{ padding: '0 16px 16px' }}>
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
