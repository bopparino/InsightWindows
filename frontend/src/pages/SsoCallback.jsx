/**
 * SsoCallback — landing page after Microsoft Entra SSO redirect.
 *
 * The backend redirects here with ?token=...&user=... after a
 * successful SSO login. We store the token and navigate home.
 *
 * Register this route in App.jsx:
 *   <Route path="/sso-callback" element={<SsoCallback />} />
 */
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { authApi } from '../api/client'

export default function SsoCallback() {
  const [params]   = useSearchParams()
  const { login }  = useAuth()
  const navigate   = useNavigate()

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      navigate('/login?error=sso_failed')
      return
    }

    // Fetch full user profile using the token we just received
    authApi.me(token)
      .then(user => {
        login(token, user)
        navigate('/')
      })
      .catch(() => navigate('/login?error=sso_failed'))
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', background: 'var(--gray-50)',
    }}>
      <div style={{ textAlign: 'center' }}>
        <span className="spinner" />
        <div style={{ marginTop: 16, fontSize: 13, color: 'var(--gray-400)' }}>
          Completing sign-in…
        </div>
      </div>
    </div>
  )
}
