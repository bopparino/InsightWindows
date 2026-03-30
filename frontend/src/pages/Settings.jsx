import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme, THEMES } from '../context/ThemeContext'

const ROLE_LABELS = {
  admin:             'Administrator',
  account_executive: 'Account Executive',
  account_manager:   'Account Manager',
}
const ROLE_COLORS = {
  admin:             { bg: '#fdf4ff', text: '#6b21a8', border: '#e9d5ff' },
  account_executive: { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' },
  account_manager:   { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
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
            width: 28, background:
              t.id === 'blueprint'  ? '#030D14'
              : t.id === 'cyberpunk'? '#070212'
              : t.id === 'brutal' || t.id === 'mono' ? '#0a0a0a'
              : t.id === 'dark'    ? '#0d1b2e'
              : '#1a3a5c',
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
          boxShadow: t.id === 'brutal' ? `2px 2px 0 ${p.border}` : 'none',
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
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          {t.label}
          {active && (
            <span style={{
              fontSize: 10, background: 'var(--blue-mid)', color: 'white',
              borderRadius: 4, padding: '1px 5px', fontWeight: 600,
            }}>Active</span>
          )}
        </div>
      </div>
    </button>
  )
}

export default function Settings() {
  const { user, refreshUser } = useAuth()
  const { theme, applyTheme } = useTheme()
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    initials:  user?.initials  || '',
    email:     user?.email     || '',
  })
  const [pw, setPw] = useState({ current_password: '', new_password: '', confirm: '' })
  const [profileMsg, setProfileMsg] = useState('')
  const [pwMsg, setPwMsg]           = useState('')
  const [pwError, setPwError]       = useState('')

  const updateProfile = useMutation({
    mutationFn: () => authApi.updateMe({
      full_name: profile.full_name,
      initials:  profile.initials,
      email:     profile.email || null,
    }),
    onSuccess: () => {
      refreshUser(profile)
      setProfileMsg('Profile updated.')
      setTimeout(() => setProfileMsg(''), 3000)
    },
  })

  const changePassword = useMutation({
    mutationFn: () => authApi.changePassword({
      current_password: pw.current_password,
      new_password:     pw.new_password,
    }),
    onSuccess: () => {
      setPw({ current_password: '', new_password: '', confirm: '' })
      setPwMsg('Password changed.')
      setPwError('')
      setTimeout(() => setPwMsg(''), 3000)
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
          {profileMsg && (
            <span style={{ fontSize: 13, color: 'var(--success)' }}>{profileMsg}</span>
          )}
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
          {pwMsg && <span style={{ fontSize: 13, color: 'var(--success)' }}>{pwMsg}</span>}
        </div>
      </div>
    </div>
  )
}
