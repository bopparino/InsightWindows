import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi, companyApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme, THEMES } from '../context/ThemeContext'
import { useToast } from '../context/ToastContext'

const ROLE_LABELS = {
  admin:             'Administrator',
  account_executive: 'Account Executive',
  account_manager:   'Account Manager',
}
const ROLE_COLORS = {
  admin:             { bg: 'var(--status-complete-bg)',    text: 'var(--status-complete-text)',    border: 'var(--status-complete-border)'    },
  account_executive: { bg: 'var(--blue-light)',            text: 'var(--blue-mid)',                border: 'var(--gray-300)'                  },
  account_manager:   { bg: 'var(--status-contracted-bg)',  text: 'var(--status-contracted-text)',  border: 'var(--status-contracted-border)'  },
}

// Mini theme preview card rendered inside the selector
function ThemePreviewCard({ t, active, onSelect }) {
  const p = t.preview
  return (
    <button
      onClick={() => onSelect(t.id)}
      style={{
        flex: 1, minWidth: 0, textAlign: 'left', cursor: 'pointer',
        padding: 0, border: 'none', background: 'none', borderRadius: 10,
        outline: active ? `2px solid var(--blue-mid)` : '2px solid transparent',
        outlineOffset: 2, transition: 'outline-color 0.15s',
      }}>
      {/* Mini mockup */}
      <div style={{
        borderRadius: 8, overflow: 'hidden', border: `1px solid ${p.border}`,
        boxShadow: active ? '0 0 0 0px transparent' : '0 1px 4px rgba(0,0,0,0.08)',
        marginBottom: 8,
      }}>
        {/* Fake sidebar + content */}
        <div style={{ display: 'flex', height: 68, background: p.bg }}>
          {/* Sidebar stub */}
          <div style={{
            width: 28, background: p.sidebar || '#1a1a1a',
            display: 'flex', flexDirection: 'column',
            gap: 3, padding: '6px 4px',
          }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{
                height: 3, borderRadius: 2,
                background: i === 1 ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.25)',
              }} />
            ))}
          </div>
          {/* Content area */}
          <div style={{ flex: 1, padding: '6px 7px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Title bar */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
              <div style={{
                height: 5, width: 38, borderRadius: 3,
                background: p.text, opacity: 0.9,
              }} />
              <div style={{
                height: 9, width: 22, borderRadius: 3,
                background: p.accent, opacity: 0.9,
              }} />
            </div>
            {/* Card stub */}
            <div style={{
              flex: 1, borderRadius: 4,
              background: p.card,
              border: `1px solid ${p.border}`,
              backdropFilter: 'none',
          boxShadow: 'none',
              display: 'flex', alignItems: 'center', gap: 3, padding: '0 5px',
            }}>
              {[38, 55, 28, 44].map((w, i) => (
                <div key={i} style={{
                  height: 3, width: w, borderRadius: 2,
                  background: i === 0 ? p.accent : p.text,
                  opacity: i === 0 ? 0.85 : 0.2,
                  flexShrink: 0,
                }} />
              ))}
            </div>
            {/* Row stubs */}
            <div style={{ display: 'flex', gap: 3 }}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  height: 3, flex: 1, borderRadius: 2,
                  background: p.text, opacity: 0.12,
                }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Label */}
      <div style={{ paddingLeft: 2 }}>
        <div style={{
          fontSize: 13, fontWeight: active ? 700 : 500,
          color: active ? 'var(--blue-mid)' : 'var(--gray-800)',
        }}>
          {t.label}
        </div>
      </div>
    </button>
  )
}

function BrandingCard() {
  const qc = useQueryClient()
  const toast = useToast()
  const { data: co, isLoading } = useQuery({ queryKey: ['company'], queryFn: companyApi.get })
  const [form, setForm] = useState(null)

  // Initialise local form once data loads
  if (co && !form) setForm({
    company_name: co.company_name || '',
    phone:        co.phone        || '',
    email:        co.email        || '',
    address:      co.address      || '',
    city:         co.city         || '',
    state:        co.state        || '',
    zip_code:     co.zip_code     || '',
    website:      co.website      || '',
    quote_footer: co.quote_footer || '',
    logo_b64:     co.logo_b64     || '',
  })

  const save = useMutation({
    mutationFn: () => companyApi.update(form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company'] })
      toast.success('Company settings saved')
    },
  })

  function handleLogo(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setForm(f => ({ ...f, logo_b64: ev.target.result }))
    reader.readAsDataURL(file)
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  if (isLoading || !form) return null

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Company Branding</div>
      <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 16 }}>
        Used on all generated quote PDFs and field sheets.
      </div>

      <div className="form-row form-row-2" style={{ marginBottom: 12 }}>
        <div>
          <label>Company name *</label>
          <input value={form.company_name} onChange={e => set('company_name', e.target.value)} />
        </div>
        <div>
          <label>Phone</label>
          <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="301-555-0100" />
        </div>
      </div>

      <div className="form-row form-row-2" style={{ marginBottom: 12 }}>
        <div>
          <label>Email</label>
          <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="info@company.com" />
        </div>
        <div>
          <label>Website</label>
          <input value={form.website} onChange={e => set('website', e.target.value)} placeholder="https://company.com" />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Address</label>
        <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="123 Main St" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 100px', gap: 10, marginBottom: 12 }}>
        <div>
          <label>City</label>
          <input value={form.city} onChange={e => set('city', e.target.value)} />
        </div>
        <div>
          <label>State</label>
          <input value={form.state} maxLength={2} onChange={e => set('state', e.target.value.toUpperCase())} />
        </div>
        <div>
          <label>ZIP</label>
          <input value={form.zip_code} onChange={e => set('zip_code', e.target.value)} />
        </div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label>Quote footer text <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optional — overrides "valid for 30 days" message)</span></label>
        <input value={form.quote_footer} onChange={e => set('quote_footer', e.target.value)}
          placeholder="This proposal is valid for 30 days from the date above." />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label>Logo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {form.logo_b64 && (
            <img src={form.logo_b64} alt="Logo preview"
              style={{ maxHeight: 48, maxWidth: 160, objectFit: 'contain',
                border: '1px solid var(--gray-200)', borderRadius: 4, padding: 4 }} />
          )}
          <div>
            <input type="file" accept="image/*" onChange={handleLogo}
              style={{ fontSize: 13 }} />
            {form.logo_b64 && (
              <button onClick={() => set('logo_b64', '')}
                style={{ marginLeft: 8, fontSize: 12, background: 'none', border: 'none',
                  color: 'var(--danger)', cursor: 'pointer' }}>
                Remove
              </button>
            )}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? 'Saving...' : 'Save branding'}
        </button>
      </div>
    </div>
  )
}

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const { theme, applyTheme } = useTheme()
  const toast = useToast()
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    initials:  user?.initials  || '',
    email:     user?.email     || '',
  })
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
  const [pwError, setPwError] = useState('')

  const updateProfile = useMutation({
    mutationFn: () => authApi.updateMe({
      full_name: profile.full_name,
      initials:  profile.initials,
      email:     profile.email || null,
    }),
    onSuccess: () => {
      refreshUser(profile)
      toast.success('Profile updated')
    },
  })

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword({
      current_password: pw.current_password,
      new_password:     pw.new_password,
    }),
    onSuccess: () => {
      setPw({ current_password: '', new_password: '', confirm: '' })
      setPwError('')
      toast.success('Password changed')
    },
    onError: (e) => setPwError(e.response?.data?.detail || 'Failed to change password'),
  })

  function submitPassword() {
    setPwError('')
    if (pw.new_password.length < 8) { setPwError('New password must be at least 8 characters'); return }
    if (pw.new_password !== pw.confirm) { setPwError('Passwords do not match'); return }
    changePassword.mutate()
  }

  const c = ROLE_COLORS[user?.role] || ROLE_COLORS.account_manager

  return (
    <div style={{ maxWidth: 640 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Account Settings</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {user?.username}
          </div>
        </div>
        <span style={{ fontSize: 13, padding: '4px 14px', borderRadius: 99,
          fontWeight: 600, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
          {ROLE_LABELS[user?.role] || user?.role}
        </span>
      </div>

      {/* Company branding — admin only */}
      {user?.role === 'admin' && <BrandingCard />}

      {/* Appearance */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Appearance</div>
        <div style={{ fontSize: 13, color: 'var(--gray-400)', marginBottom: 20 }}>
          Choose a theme for your view. Your preference is saved locally.
        </div>
        <div style={{ display: 'flex', gap: 16 }}>
          {THEMES.map(t => (
            <ThemePreviewCard
              key={t.id}
              t={t}
              active={theme === t.id}
              onSelect={applyTheme}
            />
          ))}
        </div>
      </div>

      {/* Profile */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Profile</div>

        <div className="form-row form-row-2" style={{ marginBottom: 12 }}>
          <div>
            <label>Full name</label>
            <input value={profile.full_name}
              onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
          </div>
          <div>
            <label>Initials</label>
            <input maxLength={3} value={profile.initials}
              onChange={e => setProfile(p => ({ ...p, initials: e.target.value.toUpperCase() }))}
              style={{ textTransform: 'uppercase' }} />
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 4 }}>
              Used in plan numbers (e.g. AC0010326)
            </div>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Email</label>
          <input type="email" placeholder="your@email.com" value={profile.email}
            onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-primary"
            disabled={updateProfile.isPending}
            onClick={() => updateProfile.mutate()}>
            {updateProfile.isPending ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </div>

      {/* Password */}
      <div className="card">
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>Change Password</div>

        {pwError && <div className="error-msg">{pwError}</div>}

        <div style={{ marginBottom: 12 }}>
          <label>Current password</label>
          <input type="password" value={pw.current_password}
            onChange={e => setPw(p => ({ ...p, current_password: e.target.value }))} />
        </div>
        <div className="form-row form-row-2" style={{ marginBottom: 16 }}>
          <div>
            <label>New password</label>
            <input type="password" placeholder="Min. 8 characters" value={pw.new_password}
              onChange={e => setPw(p => ({ ...p, new_password: e.target.value }))} />
          </div>
          <div>
            <label>Confirm new password</label>
            <input type="password" value={pw.confirm}
              onChange={e => setPw(p => ({ ...p, confirm: e.target.value }))} />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button className="btn-primary"
            disabled={!pw.current_password || !pw.new_password || !pw.confirm || changePassword.isPending}
            onClick={submitPassword}>
            {changePassword.isPending ? 'Changing...' : 'Change password'}
          </button>
        </div>
      </div>
    </div>
  )
}
