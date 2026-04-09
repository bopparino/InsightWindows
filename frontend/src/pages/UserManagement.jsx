import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/client'

const ROLES       = ['admin', 'account_executive', 'account_manager']
const ROLE_LABELS = {
  admin:             'Admin',
  account_executive: 'Account Executive',
  account_manager:   'Account Manager',
}
const ROLE_COLORS = {
  admin:             { bg: 'rgba(139,92,246,0.12)', text: 'var(--blue-mid)', border: 'rgba(139,92,246,0.25)' },
  account_executive: { bg: 'var(--blue-light)',     text: 'var(--blue-mid)', border: 'var(--blue-mid)'      },
  account_manager:   { bg: 'rgba(52,211,153,0.12)', text: 'var(--blue-mid)', border: 'rgba(52,211,153,0.3)' },
}

function RoleBadge({ role }) {
  const c = ROLE_COLORS[role] || ROLE_COLORS.account_manager
  return (
    <span style={{ fontSize: 12, padding: '2px 10px', borderRadius: 99,
      fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {ROLE_LABELS[role] || role}
    </span>
  )
}

function EditUserModal({ user, onClose, onSave }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    full_name: user.full_name || '',
    initials:  user.initials  || '',
    email:     user.email     || '',
    role:      user.role      || 'account_manager',
  })
  const [pwForm, setPwForm]   = useState({ password: '' })
  const [msg, setMsg]         = useState('')
  const [error, setError]     = useState('')
  const [tab, setTab]         = useState('profile')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const updateUser = useMutation({
    mutationFn: () => authApi.updateUser(user.id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setMsg('Saved.')
      setError('')
      setTimeout(() => setMsg(''), 2500)
    },
    onError: (e) => setError(e.response?.data?.detail || 'Failed to save'),
  })

  const resetPw = useMutation({
    mutationFn: () => authApi.resetPassword(user.id, pwForm.password),
    onSuccess: () => {
      setMsg('Password reset.')
      setPwForm({ password: '' })
      setTimeout(() => setMsg(''), 2500)
    },
    onError: (e) => setError(e.response?.data?.detail || 'Failed'),
  })

  const TAB_STYLE = (active) => ({
    background: 'none', border: 'none', borderRadius: 0,
    padding: '8px 16px', fontSize: 14, cursor: 'pointer',
    fontWeight: active ? 600 : 400,
    color: active ? 'var(--blue)' : 'var(--gray-400)',
    borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
    marginBottom: -2,
  })

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={onClose}>
      <div style={{ background: 'white', borderRadius: 12, width: 480,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '18px 24px', background: 'var(--blue)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 2 }}>
              Edit User
            </div>
            <div style={{ color: 'white', fontWeight: 600, fontSize: 16 }}>
              {user.full_name}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)',
            color: 'white', border: 'none', borderRadius: 6,
            padding: '6px 12px', fontSize: 18, cursor: 'pointer' }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--gray-200)',
          padding: '0 24px' }}>
          <button style={TAB_STYLE(tab === 'profile')} onClick={() => setTab('profile')}>
            Profile
          </button>
          <button style={TAB_STYLE(tab === 'password')} onClick={() => setTab('password')}>
            Reset Password
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {msg   && <div style={{ background: 'var(--status-contracted-bg)', border: '1px solid var(--status-contracted-border)',
            color: 'var(--success)', padding: '8px 14px', borderRadius: 8,
            fontSize: 13, marginBottom: 14 }}>{msg}</div>}
          {error && <div className="error-msg">{error}</div>}

          {tab === 'profile' && (
            <>
              <div className="form-row form-row-2" style={{ marginBottom: 12 }}>
                <div>
                  <label>Full name</label>
                  <input value={form.full_name}
                    onChange={e => set('full_name', e.target.value)} />
                </div>
                <div>
                  <label>Initials</label>
                  <input maxLength={3} value={form.initials}
                    onChange={e => set('initials', e.target.value.toUpperCase())}
                    style={{ textTransform: 'uppercase' }} />
                </div>
              </div>
              <div style={{ marginBottom: 12 }}>
                <label>Email</label>
                <input type="email" value={form.email}
                  onChange={e => set('email', e.target.value)} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label>Role</label>
                <select value={form.role} onChange={e => set('role', e.target.value)}>
                  {ROLES.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary"
                  disabled={updateUser.isPending}
                  onClick={() => updateUser.mutate()}>
                  {updateUser.isPending ? 'Saving...' : 'Save changes'}
                </button>
                <button className="btn-secondary" onClick={onClose}>Cancel</button>
              </div>
            </>
          )}

          {tab === 'password' && (
            <>
              <p style={{ fontSize: 13, color: 'var(--gray-600)', marginBottom: 16 }}>
                Set a new password for <strong>{user.full_name}</strong>. They should
                change it themselves after logging in.
              </p>
              <div style={{ marginBottom: 20 }}>
                <label>New password</label>
                <input type="password" placeholder="Min. 8 characters"
                  value={pwForm.password}
                  onChange={e => setPwForm({ password: e.target.value })} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn-primary"
                  disabled={pwForm.password.length < 8 || resetPw.isPending}
                  onClick={() => resetPw.mutate()}>
                  {resetPw.isPending ? 'Resetting...' : 'Reset password'}
                </button>
                <button className="btn-secondary" onClick={onClose}>Cancel</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function UserManagement() {
  const qc = useQueryClient()
  const [showForm, setShowForm]   = useState(false)
  const [editingUser, setEditing] = useState(null)
  const [form, setForm]           = useState({
    username: '', full_name: '', initials: '',
    email: '', password: '', role: 'account_manager',
  })
  const [error, setError] = useState('')

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'], queryFn: authApi.listUsers,
  })

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const createUser = useMutation({
    mutationFn: () => authApi.createUser(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      setForm({ username:'', full_name:'', initials:'', email:'', password:'', role:'account_manager' })
      setShowForm(false)
      setError('')
    },
    onError: (e) => setError(e.response?.data?.detail || 'Failed to create user'),
  })

  const deactivate = useMutation({
    mutationFn: (id) => authApi.deactivateUser(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
    onError: (e) => alert(e.response?.data?.detail || 'Could not deactivate'),
  })

  const reactivate = useMutation({
    mutationFn: (id) => authApi.updateUser(id, { active: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  })

  const active   = users.filter(u => u.active)
  const inactive = users.filter(u => !u.active)

  return (
    <div>
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditing(null)}
        />
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">User Management</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {active.length} active user{active.length !== 1 ? 's' : ''}
          </div>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(s => !s)}>
          {showForm ? 'Cancel' : '+ New User'}
        </button>
      </div>

      {/* New user form */}
      {showForm && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>New User</div>
          {error && <div className="error-msg">{error}</div>}
          <div className="form-row form-row-2" style={{ marginBottom: 12 }}>
            <div>
              <label>Username *</label>
              <input placeholder="firstname.lastname" value={form.username}
                onChange={e => set('username', e.target.value.toLowerCase())} />
            </div>
            <div>
              <label>Full name *</label>
              <input placeholder="Austin Cantrell" value={form.full_name}
                onChange={e => set('full_name', e.target.value)} />
            </div>
          </div>
          <div className="form-row form-row-3" style={{ marginBottom: 12 }}>
            <div>
              <label>Initials *</label>
              <input maxLength={3} placeholder="AC" value={form.initials}
                onChange={e => set('initials', e.target.value.toUpperCase())}
                style={{ textTransform: 'uppercase' }} />
            </div>
            <div>
              <label>Role *</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label>Email</label>
              <input type="email" placeholder="a@metcalfe.com" value={form.email}
                onChange={e => set('email', e.target.value)} />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Initial password *</label>
            <input type="password" placeholder="Min. 8 characters" value={form.password}
              onChange={e => set('password', e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-primary"
              disabled={!form.username || !form.full_name || !form.initials
                || !form.password || createUser.isPending}
              onClick={() => createUser.mutate()}>
              {createUser.isPending ? 'Creating...' : 'Create user'}
            </button>
            <button className="btn-secondary"
              onClick={() => { setShowForm(false); setError('') }}>Cancel</button>
          </div>
        </div>
      )}

      {/* Active users */}
      <div className="card" style={{ padding: 0, marginBottom: 20 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)',
          fontWeight: 600, fontSize: 15 }}>Active Users</div>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : active.length === 0 ? (
          <div className="empty-state"><p>No active users.</p></div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Name</th>
                <th>Username</th>
                <th style={{ textAlign: 'center' }}>Initials</th>
                <th>Email</th>
                <th style={{ textAlign: 'center' }}>Role</th>
                <th style={{ textAlign: 'right', paddingRight: 20 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {active.map(u => {
                const c = ROLE_COLORS[u.role] || ROLE_COLORS.account_manager
                return (
                  <tr key={u.id}>
                    <td style={{ paddingLeft: 20, fontWeight: 500 }}>{u.full_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)',
                      fontFamily: 'monospace' }}>{u.username}</td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ background: 'var(--blue-light)', color: 'var(--blue)',
                        padding: '2px 10px', borderRadius: 6, fontSize: 13,
                        fontWeight: 700 }}>{u.initials}</span>
                    </td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                      {u.email || '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99,
                        fontWeight: 600, background: c.bg, color: c.text,
                        border: `1px solid ${c.border}` }}>
                        {ROLE_LABELS[u.role]}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 20 }}>
                      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                        <button
                          onClick={() => setEditing(u)}
                          style={{ background: 'var(--blue-light)', color: 'var(--blue)',
                            border: '1px solid var(--blue-mid)', borderRadius: 6,
                            padding: '4px 12px', fontSize: 12, cursor: 'pointer',
                            fontWeight: 500 }}>
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(
                              `Deactivate ${u.full_name}? They won't be able to log in.`
                            )) deactivate.mutate(u.id)
                          }}
                          style={{ background: 'none', color: 'var(--danger)',
                            border: '1px solid var(--status-lost-border)', borderRadius: 6,
                            padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                          Deactivate
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Inactive users */}
      {inactive.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)',
            fontWeight: 600, fontSize: 15, color: 'var(--gray-400)' }}>
            Deactivated Users ({inactive.length})
          </div>
          <table className="table">
            <tbody>
              {inactive.map(u => (
                <tr key={u.id} style={{ opacity: 0.5 }}>
                  <td style={{ paddingLeft: 20, fontWeight: 500 }}>{u.full_name}</td>
                  <td style={{ fontSize: 13, fontFamily: 'monospace',
                    color: 'var(--gray-400)' }}>{u.username}</td>
                  <td><RoleBadge role={u.role} /></td>
                  <td style={{ fontSize: 13, color: 'var(--gray-400)' }}>
                    {u.email || '—'}
                  </td>
                  <td style={{ textAlign: 'right', paddingRight: 20 }}>
                    <button
                      onClick={() => reactivate.mutate(u.id)}
                      style={{ background: 'none', color: 'var(--blue-mid)',
                        border: '1px solid var(--gray-200)', borderRadius: 6,
                        padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}>
                      Reactivate
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
