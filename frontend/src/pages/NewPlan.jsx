import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plans, projects, builders } from '../api/client'
import SearchSelect from '../components/SearchSelect'
import { useToast } from '../context/ToastContext'

export default function NewPlan() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const toast = useToast()

  const [form, setForm] = useState({
    project_id: '', house_type: '', number_of_zones: 1, factor: '0.69', notes: '',
  })
  const [copyFromId, setCopyFromId] = useState('')
  const [templateId, setTemplateId] = useState('')
  const [newProject, setNewProject] = useState({
    show: false, code: '', name: '', builder_id: '',
  })
  const [newBuilder, setNewBuilder] = useState({
    show: false, code: '', name: '', contact_name: '', office_phone: '',
    cell_phone: '', email: '', address: '', city: '', state: '', zip_code: '',
  })
  const [error, setError] = useState('')

  const { data: projectList = [] } = useQuery({
    queryKey: ['projects'], queryFn: projects.list,
  })
  const { data: builderList = [] } = useQuery({
    queryKey: ['builders'], queryFn: builders.list,
  })

  const set  = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const setB = (k, v) => setNewBuilder(b => ({ ...b, [k]: v }))

  const { data: plansList = [] } = useQuery({
    queryKey: ['plans', 'all'],
    queryFn: () => plans.list(null),
  })
  const { data: templateList = [] } = useQuery({
    queryKey: ['plans', 'templates'],
    queryFn: plans.templates,
  })
  const planOptions = plansList.map(p => ({
    id: p.id, label: p.plan_number, sublabel: `${p.project_name} · ${p.builder_name}`,
  }))
  const templateOptions = templateList.map(p => ({
    id: p.id, label: p.plan_number, sublabel: `${p.project_name} · ${p.builder_name}`,
  }))

  const createPlan = useMutation({
    mutationFn: (data) => plans.create(data),
    onSuccess: async (data) => {
      const sourceId = templateId || copyFromId
      if (sourceId) {
        try {
          await plans.copyFrom(data.id, parseInt(sourceId))
        } catch (e) {
          setError(
            'Plan was created, but line items could not be copied: ' +
            (e.response?.data?.detail || 'unknown error') +
            ' — you can copy them manually from the plan page.'
          )
          qc.invalidateQueries({ queryKey: ['plans'] })
          navigate(`/plans/${data.id}`)
          return
        }
      }
      qc.invalidateQueries({ queryKey: ['plans'] })
      navigate(`/plans/${data.id}`)
    },
    onError: (e) => setError(e.response?.data?.detail || 'Failed to create plan'),
  })

  const createBuilder = useMutation({
    mutationFn: (data) => builders.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['builders'] })
      setNewBuilder({
        show: false, code: '', name: '', contact_name: '', office_phone: '',
        cell_phone: '', email: '', address: '', city: '', state: '', zip_code: '',
      })
      setError('')
      toast.success('Builder created')
    },
    onError: (e) => setError(e.response?.data?.detail || 'Failed to create builder'),
  })

  const createProject = useMutation({
    mutationFn: (data) => projects.create(data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      setForm(f => ({ ...f, project_id: data.id }))
      setNewProject({ show: false, code: '', name: '', builder_id: '' })
      setError('')
      toast.success('Project created — auto-selected')
    },
    onError: (e) => setError(e.response?.data?.detail || 'Failed to create project'),
  })

  // Options for SearchSelect
  const projectOptions = projectList.map(p => ({
    id: p.id, label: p.name, sublabel: `${p.code} · ${p.builder_name}`,
  }))
  const builderOptions = builderList.map(b => ({
    id: b.id, label: b.name, sublabel: b.code,
  }))

  return (
    <div style={{ maxWidth: 680 }}>
      <div className="page-header">
        <h1 className="page-title">Create a New Plan</h1>
      </div>

      {error && <div className="error-msg">{error}</div>}

      <div className="card">
        {/* Project + house type */}
        <div className="form-row form-row-2">
          <div>
            <label>Project *</label>
            <SearchSelect
              options={projectOptions}
              value={form.project_id}
              onChange={v => set('project_id', v)}
              placeholder="Search or select project..."
            />
            <button className="btn-secondary btn-sm" style={{ marginTop: 6 }}
              onClick={() => setNewProject(p => ({ ...p, show: !p.show }))}>
              {newProject.show ? 'Cancel' : '+ New project'}
            </button>
          </div>
          <div>
            <label>House type</label>
            <input placeholder="e.g. NEWHAVEN, TYPE A"
              value={form.house_type} onChange={e => set('house_type', e.target.value)} />
          </div>
        </div>

        <div className="form-row form-row-2">
          <div>
            <label>Number of zones</label>
            <select value={form.number_of_zones}
              onChange={e => set('number_of_zones', parseInt(e.target.value))}>
              {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label>Factor <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(markup divisor, e.g. 0.69 = 31% margin)</span></label>
            <input type="number" step="0.01" min="0.1" max="1" placeholder="0.69"
              value={form.factor} onChange={e => set('factor', e.target.value)} />
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Notes</label>
          <input placeholder="Optional notes"
            value={form.notes} onChange={e => set('notes', e.target.value)} />
        </div>

        {templateOptions.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <label>Start from template <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optional)</span></label>
            <SearchSelect
              options={templateOptions}
              value={templateId}
              onChange={v => { setTemplateId(v); if (v) setCopyFromId('') }}
              placeholder="Search templates..."
            />
            {templateId && (
              <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
                All house types and line items from this template will be copied into the new plan.
              </div>
            )}
          </div>
        )}

        <div style={{ marginBottom: 4 }}>
          <label>Copy line items from existing plan <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optional)</span></label>
          <SearchSelect
            options={planOptions}
            value={copyFromId}
            onChange={v => { setCopyFromId(v); if (v) setTemplateId('') }}
            placeholder="Search plan number or project..."
          />
          {copyFromId && (
            <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4 }}>
              All house types and line items from the selected plan will be copied into this new plan.
            </div>
          )}
        </div>

        {/* New project form */}
        {newProject.show && (
          <div style={{ background: 'var(--gray-50)', border: '1px solid var(--gray-200)',
            borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>New Project</div>

            <div className="form-row form-row-2">
              <div>
                <label>Project code *</label>
                <input placeholder="e.g. RP0732" value={newProject.code}
                  onChange={e => setNewProject(p => ({ ...p, code: e.target.value }))} />
              </div>
              <div>
                <label>Project name *</label>
                <input placeholder="e.g. PARADISE CHURCH" value={newProject.name}
                  onChange={e => setNewProject(p => ({ ...p, name: e.target.value }))} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Builder *</label>
              <SearchSelect
                options={builderOptions}
                value={newProject.builder_id}
                onChange={v => setNewProject(p => ({ ...p, builder_id: v }))}
                placeholder="Search or select builder..."
              />
              <button className="btn-secondary btn-sm" style={{ marginTop: 6 }}
                onClick={() => setNewBuilder(b => ({ ...b, show: !b.show }))}>
                {newBuilder.show ? 'Cancel' : '+ New builder'}
              </button>
            </div>

            {/* New builder form */}
            {newBuilder.show && (
              <div style={{ background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
                borderRadius: 'var(--radius)', padding: 16, marginBottom: 12 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 12 }}>New Builder</div>

                <div className="form-row form-row-2" style={{ marginBottom: 10 }}>
                  <div>
                    <label>Builder code *</label>
                    <input placeholder="e.g. Q00839" value={newBuilder.code}
                      onChange={e => setB('code', e.target.value)} />
                  </div>
                  <div>
                    <label>Company name *</label>
                    <input placeholder="e.g. PDR Homes" value={newBuilder.name}
                      onChange={e => setB('name', e.target.value)} />
                  </div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--gray-400)', margin: '4px 0 10px' }}>
                  Contact
                </div>
                <div className="form-row form-row-2" style={{ marginBottom: 10 }}>
                  <div>
                    <label>Contact name</label>
                    <input placeholder="e.g. Greg Mason" value={newBuilder.contact_name}
                      onChange={e => setB('contact_name', e.target.value)} />
                  </div>
                  <div>
                    <label>Email</label>
                    <input type="email" placeholder="contact@builder.com"
                      value={newBuilder.email} onChange={e => setB('email', e.target.value)} />
                  </div>
                </div>
                <div className="form-row form-row-2" style={{ marginBottom: 10 }}>
                  <div>
                    <label>Office phone</label>
                    <input placeholder="301-555-0100" value={newBuilder.office_phone}
                      onChange={e => setB('office_phone', e.target.value)} />
                  </div>
                  <div>
                    <label>Cell phone</label>
                    <input placeholder="301-555-0101" value={newBuilder.cell_phone}
                      onChange={e => setB('cell_phone', e.target.value)} />
                  </div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--gray-400)', margin: '4px 0 10px' }}>
                  Address
                </div>
                <div className="form-row" style={{ marginBottom: 10 }}>
                  <div>
                    <label>Street address</label>
                    <input placeholder="7945 Wormans Mill Road"
                      value={newBuilder.address} onChange={e => setB('address', e.target.value)} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px',
                  gap: 10, marginBottom: 14 }}>
                  <div>
                    <label>City</label>
                    <input placeholder="Frederick" value={newBuilder.city}
                      onChange={e => setB('city', e.target.value)} />
                  </div>
                  <div>
                    <label>State</label>
                    <input placeholder="MD" maxLength={2} value={newBuilder.state}
                      onChange={e => setB('state', e.target.value.toUpperCase())} />
                  </div>
                  <div>
                    <label>ZIP</label>
                    <input placeholder="21701" value={newBuilder.zip_code}
                      onChange={e => setB('zip_code', e.target.value)} />
                  </div>
                </div>

                <button className="btn-primary btn-sm"
                  disabled={!newBuilder.code || !newBuilder.name || createBuilder.isPending}
                  onClick={() => createBuilder.mutate({
                    code: newBuilder.code, name: newBuilder.name,
                    contact_name: newBuilder.contact_name, email: newBuilder.email,
                    office_phone: newBuilder.office_phone, cell_phone: newBuilder.cell_phone,
                    address: newBuilder.address, city: newBuilder.city,
                    state: newBuilder.state, zip_code: newBuilder.zip_code,
                  })}>
                  {createBuilder.isPending ? 'Saving...' : 'Save builder'}
                </button>
              </div>
            )}

            <button className="btn-primary btn-sm"
              disabled={!newProject.code || !newProject.name || !newProject.builder_id
                || createProject.isPending}
              onClick={() => createProject.mutate({
                code: newProject.code,
                name: newProject.name,
                builder_id: parseInt(newProject.builder_id),
              })}>
              {createProject.isPending ? 'Saving...' : 'Save project'}
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="btn-primary"
            disabled={!form.project_id || createPlan.isPending}
            onClick={() => createPlan.mutate({
              project_id: parseInt(form.project_id),
              house_type: form.house_type,
              number_of_zones: form.number_of_zones,
              factor: parseFloat(form.factor) || 0.69,
              notes: form.notes,
            })}>
            {createPlan.isPending ? 'Creating...' : 'Create Plan'}
          </button>
          <button className="btn-secondary" onClick={() => navigate('/plans')}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
