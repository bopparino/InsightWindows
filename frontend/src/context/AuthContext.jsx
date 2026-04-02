import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { authApi } from '../api/client'

const AuthContext = createContext(null)

const INACTIVITY_MS  = 30 * 60 * 1000   // 30 minutes
const WARNING_MS     =      60 * 1000   // warn 60 s before logout
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')) } catch { return null }
  })
  const [loading, setLoading]       = useState(true)
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown]   = useState(60)

  const idleTimer    = useRef(null)
  const warnTimer    = useRef(null)
  const countdownRef = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    authApi.me()
      .then(u => { setUser(u); localStorage.setItem('user', JSON.stringify(u)) })
      .catch(() => { localStorage.removeItem('token'); localStorage.removeItem('user'); setUser(null) })
      .finally(() => setLoading(false))
  }, [])

  function login(token, userData) {
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }

  const logout = useCallback((reason) => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    setUser(null)
    setShowWarning(false)
    clearTimeout(idleTimer.current)
    clearTimeout(warnTimer.current)
    clearInterval(countdownRef.current)
    if (reason === 'idle') {
      window.location.href = '/login?reason=expired'
    }
  }, [])

  function refreshUser(updated) {
    const merged = { ...user, ...updated }
    localStorage.setItem('user', JSON.stringify(merged))
    setUser(merged)
  }

  // Reset idle timer on any activity
  const resetTimer = useCallback(() => {
    if (!localStorage.getItem('token')) return
    setShowWarning(false)
    clearTimeout(idleTimer.current)
    clearTimeout(warnTimer.current)
    clearInterval(countdownRef.current)

    // Show warning 60s before timeout
    warnTimer.current = setTimeout(() => {
      setShowWarning(true)
      setCountdown(60)
      countdownRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            clearInterval(countdownRef.current)
            return 0
          }
          return c - 1
        })
      }, 1000)
    }, INACTIVITY_MS - WARNING_MS)

    idleTimer.current = setTimeout(() => {
      logout('idle')
    }, INACTIVITY_MS)
  }, [logout])

  // Attach/detach activity listeners when user logs in/out
  useEffect(() => {
    if (!user) {
      clearTimeout(idleTimer.current)
      clearTimeout(warnTimer.current)
      clearInterval(countdownRef.current)
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
      return
    }
    resetTimer()
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))
    return () => {
      clearTimeout(idleTimer.current)
      clearTimeout(warnTimer.current)
      clearInterval(countdownRef.current)
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [user, resetTimer])

  return (
    <AuthContext.Provider value={{ user, login, logout, refreshUser, loading }}>
      {children}
      {showWarning && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999,
        }}>
          <div style={{
            background: 'var(--card-bg)', borderRadius: 14,
            border: '1px solid var(--gray-200)',
            padding: '32px 36px', maxWidth: 400, width: '90%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)', textAlign: 'center',
          }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⏱</div>
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8, color: 'var(--gray-900)' }}>
              Still there?
            </div>
            <div style={{ fontSize: 14, color: 'var(--gray-500)', marginBottom: 20, lineHeight: 1.5 }}>
              You've been inactive for a while. You'll be logged out in{' '}
              <strong style={{ color: 'var(--blue-mid)' }}>{countdown}s</strong> to keep things secure.
            </div>
            <button
              onClick={resetTimer}
              style={{
                background: 'var(--blue-mid)', color: 'white',
                border: 'none', borderRadius: 8, padding: '10px 28px',
                fontSize: 14, fontWeight: 600, cursor: 'pointer', width: '100%',
              }}>
              Keep me logged in
            </button>
            <button
              onClick={() => logout()}
              style={{
                marginTop: 10, background: 'none', border: 'none',
                color: 'var(--gray-400)', fontSize: 13, cursor: 'pointer',
              }}>
              Log out now
            </button>
          </div>
        </div>
      )}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
