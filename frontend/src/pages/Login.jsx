import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { authApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { getMsalInstance, loginRequest } from '../auth/msalConfig'

// Microsoft logo mark (SVG)
function MicrosoftLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1"  y="1"  width="9" height="9" fill="#f25022"/>
      <rect x="11" y="1"  width="9" height="9" fill="#7fba00"/>
      <rect x="1"  y="11" width="9" height="9" fill="#00a4ef"/>
      <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
    </svg>
  )
}

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const [username, setUsername]   = useState('')
  const [password, setPassword]   = useState('')
  const [error, setError]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [msalLoading, setMsalLoading] = useState(false)

  const sessionExpired = searchParams.get('reason') === 'expired'
  const ssoEnabled = !!import.meta.env.VITE_AZURE_CLIENT_ID

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await authApi.login(username, password)
      login(data.access_token, data.user)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.detail || 'Login failed. Check your username and password.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMicrosoftLogin() {
    setError('')
    setMsalLoading(true)
    try {
      const msal = await getMsalInstance()
      if (!msal) return
      const result = await msal.loginPopup(loginRequest)
      const idToken = result.idToken
      const data = await authApi.microsoftLogin(idToken)
      login(data.access_token, data.user)
      navigate('/')
    } catch (err) {
      if (err.name === 'BrowserAuthError' && err.errorCode === 'user_cancelled') {
        // User dismissed the popup — not an error
      } else {
        setError(
          err.response?.data?.detail ||
          err.message ||
          'Microsoft sign-in failed. Try again or use your username and password.'
        )
      }
    } finally {
      setMsalLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--gray-50)',
    }}>
      <div style={{ width: '100%', maxWidth: 400, padding: '0 20px' }}>

        {/* Logo / brand */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontWeight: 800, fontSize: 28, color: 'var(--blue)',
            letterSpacing: '-0.02em' }}>Metcalfe</div>
          <div style={{ fontSize: 14, color: 'var(--gray-400)', marginTop: 4 }}>
            HVAC Bid System
          </div>
        </div>

        <div className="card" style={{ padding: 32 }}>
          <div style={{ fontWeight: 600, fontSize: 18, marginBottom: 24,
            color: 'var(--gray-800)' }}>Sign in</div>

          {sessionExpired && (
            <div style={{
              background: 'var(--status-proposed-bg)',
              border: `1px solid var(--status-proposed-border)`,
              color: 'var(--status-proposed-text)',
              borderRadius: 'var(--radius)', padding: '10px 14px',
              marginBottom: 16, fontSize: 13,
            }}>
              Your session has expired. Please sign in again.
            </div>
          )}
          {error && <div className="error-msg">{error}</div>}

          {/* Microsoft SSO button */}
          {ssoEnabled && (
            <>
              <button
                type="button"
                onClick={handleMicrosoftLogin}
                disabled={msalLoading}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 10,
                  padding: '10px 16px', fontSize: 14, fontWeight: 500,
                  background: 'white', color: '#1a1a1a',
                  border: '1px solid var(--gray-300)', borderRadius: 'var(--radius)',
                  cursor: msalLoading ? 'not-allowed' : 'pointer',
                  opacity: msalLoading ? 0.7 : 1,
                  marginBottom: 16, transition: 'border-color 0.15s',
                }}
                onMouseEnter={e => { if (!msalLoading) e.currentTarget.style.borderColor = '#888' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--gray-300)' }}
              >
                {msalLoading ? (
                  <span className="spinner" style={{ width: 16, height: 16 }} />
                ) : (
                  <MicrosoftLogo />
                )}
                {msalLoading ? 'Signing in...' : 'Sign in with Microsoft'}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
                <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>or</span>
                <div style={{ flex: 1, height: 1, background: 'var(--gray-200)' }} />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label>Username</label>
              <input
                type="text"
                placeholder="your.username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus={!ssoEnabled}
                autoComplete="username"
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label>Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={!username || !password || loading}
              style={{ width: '100%', padding: '10px 16px', fontSize: 15 }}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12,
          color: 'var(--gray-400)' }}>
          Contact your administrator if you need access.
        </div>
      </div>
    </div>
  )
}
