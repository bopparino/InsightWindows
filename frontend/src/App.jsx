import { useState, useEffect, useRef, useCallback } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom'
import { search as searchApi } from './api/client'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider, useTheme, THEMES } from './context/ThemeContext'
import logo from './assets/logo.png'
import Dashboard      from './pages/Dashboard'
import PlansList      from './pages/PlansList'
import PlanDetail     from './pages/PlanDetail'
import NewPlan        from './pages/NewPlan'
import Equipment      from './pages/Equipment'
import Projects       from './pages/Projects'
import Builders       from './pages/Builders'
import Settings       from './pages/Settings'
import UserManagement from './pages/UserManagement'
import Files          from './pages/Files'
import KitAdmin       from './pages/KitAdmin'
import PriceBook      from './pages/PriceBook'
import Performance    from './pages/Performance'
import Login          from './pages/Login'
import FeedbackInbox  from './pages/FeedbackInbox'

const ICONS = {
  dashboard:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/></svg>,
  plans:       <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><line x1="5" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="5" y1="11" x2="8" y2="11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  projects:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 13V7l7-5 7 5v6a1 1 0 01-1 1H2a1 1 0 01-1-1z" stroke="currentColor" strokeWidth="1.5"/><rect x="5.5" y="9" width="5" height="5" rx="0.5" stroke="currentColor" strokeWidth="1.5"/></svg>,
  builders:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M1 14c0-3 2.5-5 5-5s5 2 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M11 7l1.5 1.5L15 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  equipment:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  files:       <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 4h6M5 7h6M5 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  users:       <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="5" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M1 13c0-2.5 1.8-4 4-4s4 1.5 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="12" cy="5" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M10 13c0-1.5.8-3 2-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  kitadmin:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><line x1="1" y1="6" x2="15" y2="6" stroke="currentColor" strokeWidth="1.5"/><line x1="5" y1="6" x2="5" y2="13" stroke="currentColor" strokeWidth="1.5"/></svg>,
  pricebook:   <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5"/><path d="M5 5h6M5 8h6M5 11h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M10 10.5l1.5 1.5L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  settings:    <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.5"/><path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M3.2 3.2l1.1 1.1M11.7 11.7l1.1 1.1M3.2 12.8l1.1-1.1M11.7 4.3l1.1-1.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  performance: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 13l3.5-4.5 3 2.5 3.5-5.5L14 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M14 5v4h-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  help:        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5"/><path d="M6 6.5c0-1.1.9-2 2-2s2 .9 2 2c0 .8-.5 1.5-1.2 1.8L8 9v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor"/></svg>,
  chevronLeft: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chevronRight:<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 12l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  signout:     <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 14H3a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M11 11l3-3-3-3M14 8H6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  search:      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
  feedback:    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>,
  plus:        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>,
}

const ROLE_LABELS = {
  admin:             'Admin',
  account_executive: 'Account Executive',
  account_manager:   'Account Manager',
}

// Admin section: admin + account_executive
// Operations section: admin + account_manager
const NAV = [
  { to: '/',            label: 'Dashboard',   icon: 'dashboard',   section: 'admin', roles: ['admin', 'account_executive'] },
  { to: '/performance', label: 'Performance', icon: 'performance', section: 'admin', roles: ['admin', 'account_executive'] },
  { to: '/kit-admin',   label: 'Kit Pricing', icon: 'kitadmin',    section: 'admin', roles: ['admin', 'account_executive'] },
  { to: '/price-book',  label: 'Price Book',  icon: 'pricebook',   section: 'admin', roles: ['admin', 'account_executive', 'account_manager'] },
  { to: '/users',       label: 'Users',       icon: 'users',       section: 'admin', roles: ['admin', 'account_executive'] },
  { to: '/feedback',    label: 'Feedback',    icon: 'feedback',    section: 'admin', roles: ['admin'] },
  { to: '/plans',       label: 'Plans',       icon: 'plans',       section: 'ops',   roles: ['admin', 'account_manager'] },
  { to: '/projects',    label: 'Projects',    icon: 'projects',    section: 'ops',   roles: ['admin', 'account_manager'] },
  { to: '/builders',    label: 'Builders',    icon: 'builders',    section: 'ops',   roles: ['admin', 'account_manager'] },
  { to: '/equipment',   label: 'Equipment',   icon: 'equipment',   section: 'ops',   roles: ['admin', 'account_manager'] },
  { to: '/files',       label: 'Files',       icon: 'files',       section: 'ops',   roles: ['admin', 'account_manager'] },
]

const SECTION_LABELS = { admin: 'Admin', ops: 'Operations' }

const HELP_CONTENT = [
  {
    section: 'Admin',
    items: [
      {
        label: 'Dashboard',
        icon: 'dashboard',
        desc: 'High-level view of bid activity, open plans, and key metrics.',
        how: 'The Dashboard updates automatically as plans and projects are created — there\'s nothing to configure. Use it to monitor open bids, recent activity, and estimator output at a glance.',
        tips: [
          'Data refreshes each time you navigate to the page.',
          'Click a metric card to jump to the related section.',
        ],
      },
      {
        label: 'Performance',
        icon: 'performance',
        desc: 'Track estimator win rates, quote volume, and conversion trends over time.',
        how: 'Use the date range and estimator filters at the top of the page to slice the data. All metrics are derived from submitted and awarded plans.',
        tips: [
          'Compare periods using the date range picker.',
          'Hover chart points for exact values.',
          'Export data with the download button in the top-right.',
        ],
      },
      {
        label: 'Kit Pricing',
        icon: 'kitadmin',
        desc: 'Define reusable pricing kits with line items and labor rates used in plans.',
        how: 'Click Add Kit, give it a name, then add line items (parts, labor, materials) with quantities and unit costs. When building a plan, the estimator selects a kit and the cost breakdown is auto-populated.',
        tips: [
          'Duplicate a kit to quickly create tier variations (e.g., Standard vs. Premium).',
          'Editing a kit does not retroactively change existing plans — only new plans using the kit will reflect changes.',
          'Mark a kit inactive to hide it from the plan builder without deleting it.',
        ],
      },
      {
        label: 'Users',
        icon: 'users',
        desc: 'Create and manage user accounts, roles, and access permissions.',
        how: 'Click Invite User, enter the person\'s full name and email, and assign a role. They\'ll receive an email with a link to set their password and log in.',
        tips: [
          'Account Executives see Admin metrics only (Dashboard, Performance, Kit Pricing, Users).',
          'Account Managers handle day-to-day operations (Plans, Projects, Builders, Equipment, Files).',
          'Admins have full access to all sections.',
          'Deactivating a user immediately revokes their access without deleting their data.',
        ],
      },
    ],
  },
  {
    section: 'Operations',
    items: [
      {
        label: 'Plans',
        icon: 'plans',
        desc: 'Create, configure, and generate HVAC bid plans and PDF quotes.',
        how: 'Click New Plan, select a project and builder, then configure systems, equipment, and labor. When ready, click Generate Quote to produce a PDF quote and a separate field sheet.',
        tips: [
          'Duplicate a plan to reuse the configuration for a similar lot type or builder.',
          'Use the Kit Calculator to auto-populate line items from a saved pricing kit.',
          'Field sheets can be printed separately from the customer-facing quote.',
          'Plans auto-save as you make changes — no manual save needed.',
        ],
      },
      {
        label: 'Projects',
        icon: 'projects',
        desc: 'Track active job sites and group multiple plans under a single project.',
        how: 'Click New Project and fill in the address, subdivision, and builder. Projects act as a container — a single subdivision may have several plans for different lot types or configurations.',
        tips: [
          'A project can have multiple plans (e.g., different floor plans in the same neighborhood).',
          'Archiving a project hides it from active views but preserves all plans and data.',
          'Project status updates are reflected on the Dashboard metrics.',
        ],
      },
      {
        label: 'Builders',
        icon: 'builders',
        desc: 'Manage builder and contractor accounts referenced in bids.',
        how: 'Click Add Builder, enter the company name, primary contact, and any notes. Builders are selected when creating a new project or plan and appear on the generated quote.',
        tips: [
          'Add builder-specific pricing notes or preferences to their profile.',
          'Marking a builder inactive hides them from all dropdowns without losing history.',
          'Each plan and project is associated with exactly one builder.',
        ],
      },
      {
        label: 'Equipment',
        icon: 'equipment',
        desc: 'Browse manufacturer equipment catalog data used when building plans.',
        how: 'Equipment is imported from Excel files using the Import button at the top of the page. Select a manufacturer and model series to view specs and pricing tiers. Once imported, equipment is available for selection when configuring systems in a plan.',
        tips: [
          'Source data comes from the Equipment History XLS files (Carrier, Goodman, Lennox, etc.).',
          'Use the search bar to filter by model number, SEER rating, or tonnage.',
          'Re-importing a manufacturer file updates existing records with the latest pricing.',
        ],
      },
      {
        label: 'Files',
        icon: 'files',
        desc: 'Upload and manage documents and attachments for plans and projects.',
        how: 'Use the Files page to upload documents, or navigate to a specific plan to attach files directly to it. Supported formats include PDF, images, and Excel files.',
        tips: [
          'Generated quotes and field sheets appear here automatically after generation.',
          'Use descriptive filenames — there is no rename function after upload.',
          'Files can be downloaded individually or as a zip archive.',
        ],
      },
    ],
  },
]

// Simple fuzzy match: all query chars must appear in order within text
function fuzzyMatch(query, text) {
  if (!query) return true
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  let qi = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) qi++
  }
  return qi === q.length
}

// ─── Mobile hook ──────────────────────────────────────────────────────────────

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = e => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return isMobile
}

function RequireAuth({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center' }}><span className="spinner" /></div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

// ─── Help Modal ────────────────────────────────────────────────────────────────

function HelpModal({ onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card-bg, #fff)', borderRadius: 12, padding: '28px 32px',
        width: 540, maxWidth: '92vw', maxHeight: '82vh', overflowY: 'auto',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)', color: 'var(--text, #111)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 700 }}>Navigation Guide</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, lineHeight: 1, color: 'var(--text-muted, #999)', padding: '0 4px',
          }}>×</button>
        </div>

        {HELP_CONTENT.map(({ section, items }) => (
          <div key={section} style={{ marginBottom: 32 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
              color: 'var(--text-muted, #999)', marginBottom: 16, paddingBottom: 8,
              borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
            }}>
              {section}
            </div>

            {items.map(({ label, icon, desc, how, tips }) => (
              <div key={label} style={{
                marginBottom: 22, paddingBottom: 22,
                borderBottom: '1px solid var(--border, rgba(0,0,0,0.05))',
              }}>
                {/* Title row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ color: 'var(--accent, #4f8ef7)', display: 'flex' }}>
                    {ICONS[icon]}
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
                </div>

                {/* Short desc */}
                <p style={{ margin: '0 0 10px 24px', fontSize: 13, color: 'var(--text-muted, #666)', lineHeight: 1.5 }}>
                  {desc}
                </p>

                {/* How to */}
                <div style={{
                  margin: '0 0 10px 24px', padding: '10px 12px',
                  background: 'var(--body-bg, #f7f7f7)', borderRadius: 8,
                  borderLeft: '3px solid var(--accent, #4f8ef7)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase',
                    color: 'var(--accent, #4f8ef7)', marginBottom: 4 }}>How to use</div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--text, #333)' }}>{how}</p>
                </div>

                {/* Tips */}
                <ul style={{ margin: '0 0 0 24px', paddingLeft: 16 }}>
                  {tips.map((tip, i) => (
                    <li key={i} style={{ fontSize: 12, color: 'var(--text-muted, #777)', lineHeight: 1.6, marginBottom: 2 }}>
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}

        {/* Keyboard shortcut hint */}
        <div style={{
          marginTop: 8, padding: '10px 14px', borderRadius: 8,
          background: 'var(--body-bg, #f7f7f7)',
          fontSize: 12, color: 'var(--text-muted, #888)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ display: 'flex' }}>{ICONS.search}</span>
          Press <kbd style={{ padding: '1px 5px', borderRadius: 4, border: '1px solid var(--border, rgba(0,0,0,0.15))', fontSize: 11 }}>Ctrl K</kbd> anywhere to open the command palette and quickly navigate the app.
        </div>
      </div>
    </div>
  )
}

// ─── Feedback Modal ────────────────────────────────────────────────────────────

function FeedbackModal({ onClose }) {
  const [type, setType] = useState('bug')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState(null) // null | 'sending' | 'sent' | 'error'

  async function handleSubmit(e) {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    setStatus('sending')
    try {
      const token = localStorage.getItem('token')
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type, subject: subject.trim(), message: message.trim() }),
      })
      if (!res.ok) throw new Error()
      setStatus('sent')
      setTimeout(onClose, 1500)
    } catch {
      setStatus('error')
    }
  }

  const inputStyle = {
    width: '100%', boxSizing: 'border-box', padding: '8px 10px',
    borderRadius: 7, border: '1px solid var(--border, rgba(0,0,0,0.15))',
    background: 'var(--body-bg)', color: 'var(--text)', fontSize: 13,
    fontFamily: 'inherit', outline: 'none',
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
      zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--card-bg, #fff)', borderRadius: 12, padding: '28px 32px',
        width: 460, maxWidth: '92vw',
        boxShadow: '0 24px 80px rgba(0,0,0,0.3)', color: 'var(--text, #111)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Send Feedback</h2>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 22, lineHeight: 1, color: 'var(--text-muted, #999)', padding: '0 4px',
          }}>×</button>
        </div>

        {status === 'sent' ? (
          <div style={{ textAlign: 'center', padding: '24px 0', fontSize: 14, color: 'var(--status-contracted-text, #1a7c4a)' }}>
            ✓ Feedback submitted — thanks!
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-muted)' }}>TYPE</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[['bug', 'Bug'], ['idea', 'Idea'], ['feedback', 'Other']].map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setType(val)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 13, cursor: 'pointer', fontWeight: type === val ? 600 : 400,
                    border: `1px solid ${type === val ? 'var(--accent)' : 'var(--gray-200)'}`,
                    background: type === val ? 'var(--blue-light)' : 'var(--body-bg)',
                    color: type === val ? 'var(--accent)' : 'var(--gray-400)',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-muted)' }}>SUBJECT</label>
              <input
                style={inputStyle} value={subject} onChange={e => setSubject(e.target.value)}
                placeholder="Brief summary…" maxLength={200} required
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 5, color: 'var(--text-muted)' }}>DETAILS</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 100 }}
                value={message} onChange={e => setMessage(e.target.value)}
                placeholder="Describe the issue or idea in detail…" required
              />
            </div>

            {status === 'error' && (
              <p style={{ fontSize: 12, color: 'var(--status-lost-text, #b91c1c)', marginBottom: 12 }}>
                Something went wrong — please try again.
              </p>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button type="button" onClick={onClose} style={{
                padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--text-muted)',
              }}>Cancel</button>
              <button type="submit" disabled={status === 'sending'} style={{
                padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: 600, background: 'var(--accent)', color: '#fff',
                opacity: status === 'sending' ? 0.7 : 1,
              }}>
                {status === 'sending' ? 'Sending…' : 'Submit'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ─── Command Palette ───────────────────────────────────────────────────────────

const TYPE_ICON = { plan: 'plans', project: 'projects', builder: 'builders', equipment: 'equipment' }
const TYPE_LABEL = { plan: 'Plans', project: 'Projects', builder: 'Builders', equipment: 'Equipment' }

function CommandPalette({ onClose, onOpenHelp }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [dbResults, setDbResults] = useState([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)
  const itemRefs = useRef([])

  useEffect(() => { inputRef.current?.focus() }, [])

  // Debounced real-time DB search
  useEffect(() => {
    const q = query.trim()
    if (q.length < 1) { setDbResults([]); setLoading(false); return }
    setLoading(true)
    const timer = setTimeout(() => {
      searchApi.query(q)
        .then(data => setDbResults(data.map(r => ({
          id:     `db-${r.type}-${r.id}`,
          label:  r.label,
          sub:    r.sub,
          icon:   TYPE_ICON[r.type] || 'files',
          group:  TYPE_LABEL[r.type] || r.type,
          action() { navigate(r.url); onClose() },
        }))))
        .catch(() => setDbResults([]))
        .finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [query])

  // Static nav + action items
  const navItems = NAV
    .filter(n => n.roles.includes(user?.role))
    .map(n => ({
      id: `nav-${n.to}`,
      label: n.label,
      icon: n.icon,
      group: 'Navigate',
      hint: n.to,
      action() { navigate(n.to); onClose() },
    }))

  const actionItems = [
    ['admin', 'account_manager'].includes(user?.role) && {
      id: 'new-plan', label: 'New Plan', icon: 'plus', group: 'Actions', hint: 'Plans → New',
      action() { navigate('/plans/new'); onClose() },
    },
    { id: 'settings', label: 'Settings', icon: 'settings', group: 'Actions', hint: '',
      action() { navigate('/settings'); onClose() } },
    { id: 'help', label: 'Help & Guide', icon: 'help', group: 'Actions', hint: '',
      action() { onOpenHelp(); onClose() } },
    { id: 'signout', label: 'Sign Out', icon: 'signout', group: 'Actions', hint: '',
      action() { logout(); navigate('/login'); onClose() } },
  ].filter(Boolean)

  const q = query.trim()
  const filtered = q.length >= 1
    ? [
        // DB results first when searching
        ...dbResults,
        // Then matching nav/action items
        ...[...navItems, ...actionItems].filter(item => fuzzyMatch(q, item.label)),
      ]
    : [...navItems, ...actionItems]

  useEffect(() => { setActiveIdx(0) }, [query, dbResults])

  useEffect(() => {
    itemRefs.current[activeIdx]?.scrollIntoView({ block: 'nearest' })
  }, [activeIdx])

  // Build rows with group headers
  const rows = []
  let lastGroup = null
  filtered.forEach((item, idx) => {
    if (item.group !== lastGroup) {
      rows.push({ type: 'header', label: item.group })
      lastGroup = item.group
    }
    rows.push({ type: 'item', ...item, flatIdx: idx })
  })

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); filtered[activeIdx]?.action() }
    else if (e.key === 'Escape') { onClose() }
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      zIndex: 2000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      paddingTop: '15vh',
    }}>
      <div
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          background: 'var(--card-bg, #fff)', borderRadius: 12,
          width: 560, maxWidth: '90vw',
          boxShadow: '0 24px 80px rgba(0,0,0,0.35)',
          overflow: 'hidden', color: 'var(--text, #111)',
        }}
      >
        {/* Search bar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '13px 16px',
          borderBottom: '1px solid var(--border, rgba(0,0,0,0.08))',
        }}>
          <span style={{ color: 'var(--text-muted, #bbb)', display: 'flex', flexShrink: 0 }}>
            {loading ? <span style={{ width: 16, height: 16, border: '2px solid var(--accent,#4f8ef7)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.6s linear infinite' }} /> : ICONS.search}
          </span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search plans, projects, builders, equipment…"
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 15, background: 'transparent', color: 'var(--text, #111)' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted, #bbb)', fontSize: 20, lineHeight: 1, padding: 0, flexShrink: 0,
            }}>×</button>
          )}
          <kbd style={{
            fontSize: 11, padding: '2px 7px', borderRadius: 5, flexShrink: 0,
            background: 'var(--body-bg, #f3f3f3)',
            border: '1px solid var(--border, rgba(0,0,0,0.12))',
            color: 'var(--text-muted, #999)',
          }}>Esc</kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: 380, overflowY: 'auto', padding: '6px 0 8px' }}>
          {filtered.length === 0 && !loading ? (
            <div style={{ padding: '28px 16px', textAlign: 'center', color: 'var(--text-muted, #999)', fontSize: 14 }}>
              {q.length >= 2 ? `No results for "${q}"` : 'Start typing to search…'}
            </div>
          ) : rows.map((row) => {
            if (row.type === 'header') {
              return (
                <div key={`h-${row.label}`} style={{
                  padding: '10px 16px 3px', fontSize: 10, fontWeight: 700,
                  letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--text-muted, #bbb)',
                }}>
                  {row.label}
                </div>
              )
            }
            const isActive = row.flatIdx === activeIdx
            return (
              <div
                key={row.id}
                ref={el => itemRefs.current[row.flatIdx] = el}
                onClick={row.action}
                onMouseEnter={() => setActiveIdx(row.flatIdx)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '9px 16px', cursor: 'pointer',
                  background: isActive ? 'var(--accent, #4f8ef7)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--text, #111)',
                  transition: 'background 0.1s',
                }}
              >
                <span style={{ display: 'flex', flexShrink: 0, opacity: isActive ? 1 : 0.55 }}>
                  {ICONS[row.icon]}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{row.label}</span>
                  {row.sub && (
                    <span style={{ fontSize: 12, opacity: 0.6, marginLeft: 8 }}>{row.sub}</span>
                  )}
                </span>
                {row.hint && <span style={{ fontSize: 11, opacity: 0.5, flexShrink: 0 }}>{row.hint}</span>}
                {isActive && (
                  <kbd style={{
                    fontSize: 10, padding: '1px 5px', borderRadius: 4, flexShrink: 0,
                    background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', color: '#fff',
                  }}>↵</kbd>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: '1px solid var(--border, rgba(0,0,0,0.07))',
          padding: '7px 16px', display: 'flex', gap: 16,
          fontSize: 11, color: 'var(--text-muted, #bbb)',
        }}>
          <span><kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid currentColor' }}>↑</kbd> <kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid currentColor' }}>↓</kbd> navigate</span>
          <span><kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid currentColor' }}>↵</kbd> select</span>
          <span><kbd style={{ fontSize: 10, padding: '1px 4px', borderRadius: 3, border: '1px solid currentColor' }}>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────

function Sidebar({ onOpenHelp, onOpenFeedback, isMobile = false, mobileOpen = false, onMobileClose }) {
  const { user, logout } = useAuth()
  const { theme } = useTheme()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(() =>
    localStorage.getItem('sidebarCollapsed') === 'true'
  )

  const visibleNav = NAV.filter(n => n.roles.includes(user?.role))
  const adminItems = visibleNav.filter(n => n.section === 'admin')
  const opsItems   = visibleNav.filter(n => n.section === 'ops')

  function toggleCollapse() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('sidebarCollapsed', String(next))
  }

  function handleLogout() {
    logout()
    navigate('/login')
  }

  const w = collapsed ? 60 : 220
  const iconWrap = { width: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }

  const navItemStyle = (isActive) => ({
    display: 'flex', alignItems: 'center',
    gap: (collapsed && !isMobile) ? 0 : 12,
    justifyContent: (collapsed && !isMobile) ? 'center' : 'flex-start',
    minHeight: isMobile ? 44 : 'auto',
    padding: isMobile ? '0 12px' : '9px 12px',
    borderRadius: isMobile ? 10 : 8, marginBottom: 2,
    textDecoration: 'none', fontSize: isMobile ? 15 : 14,
    fontWeight: isActive ? 600 : 400,
    color: isActive ? 'white' : 'rgba(255,255,255,0.6)',
    background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
    transition: 'all 0.15s',
    WebkitTapHighlightColor: 'transparent',
  })

  function renderSection(items, sectionKey) {
    if (!items.length) return null
    return (
      <div style={{ marginBottom: 4 }}>
        {(!collapsed || isMobile) && (
          <div style={{
            padding: '10px 12px 4px', fontSize: 10, fontWeight: 700,
            color: 'rgba(255,255,255,0.35)', letterSpacing: '0.09em', textTransform: 'uppercase',
          }}>
            {SECTION_LABELS[sectionKey]}
          </div>
        )}
        {items.map(({ to, label, icon }) => (
          <NavLink key={to} to={to} end={to === '/'}
            title={collapsed && !isMobile ? label : undefined}
            onClick={isMobile ? onMobileClose : undefined}
            style={({ isActive }) => navItemStyle(isActive)}
          >
            <span style={iconWrap}>{ICONS[icon]}</span>
            {(!collapsed || isMobile) && label}
          </NavLink>
        ))}
      </div>
    )
  }

  if (isMobile) {
    return (
      <>
        {/* Backdrop */}
        {mobileOpen && (
          <div
            onClick={onMobileClose}
            style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.45)',
              zIndex: 999,
            }}
          />
        )}
        {/* Drawer */}
        <aside style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 280, background: 'var(--sidebar-bg)',
          display: 'flex', flexDirection: 'column',
          zIndex: 1000,
          boxShadow: '4px 0 24px rgba(0,0,0,0.35)',
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.28s cubic-bezier(0.4,0,0.2,1)',
          overflow: 'hidden',
        }}>
          {/* Header — safe area top */}
          <div style={{
            paddingTop: 'max(env(safe-area-inset-top), 16px)',
            paddingLeft: 'max(env(safe-area-inset-left), 20px)',
            paddingRight: 20,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <img src={logo} alt="Metcalfe" style={{
              height: 68, width: 'auto', objectFit: 'contain',
              filter: 'brightness(0) invert(1)',
            }} />
            {/* 44×44 close button */}
            <button onClick={onMobileClose} style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.7)', borderRadius: 10,
              width: 44, height: 44, fontSize: 22, lineHeight: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>×</button>
          </div>

          {/* Nav */}
          <nav style={{ padding: '8px 12px', flex: 1, overflowY: 'auto' }}>
            {renderSection(adminItems, 'admin')}
            {adminItems.length > 0 && opsItems.length > 0 && (
              <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: '6px 4px' }} />
            )}
            {renderSection(opsItems, 'ops')}
          </nav>

          {/* Footer — safe area bottom */}
          <div style={{
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '8px 12px',
            paddingBottom: 'max(env(safe-area-inset-bottom), 12px)',
          }}>
            <NavLink to="/settings" onClick={onMobileClose}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 12,
                minHeight: 44, padding: '0 12px', borderRadius: 10, marginBottom: 2,
                textDecoration: 'none', fontSize: 14,
                color: isActive ? 'white' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
              })}
            >
              <span style={{ width: 20, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{ICONS.settings}</span>
              Settings
            </NavLink>

            {/* User row */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', marginBottom: 6,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0,
              }}>{user?.initials || '?'}</div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.full_name}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>
                  {ROLE_LABELS[user?.role] || user?.role}
                </div>
              </div>
            </div>

            {/* Sign out — full-width 44pt button */}
            <button onClick={handleLogout} style={{
              width: '100%', minHeight: 44,
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.55)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
              fontSize: 14, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ display: 'flex' }}>{ICONS.signout}</span>
              Sign out
            </button>
          </div>
        </aside>
      </>
    )
  }

  return (
    <aside style={{
      width: w, flexShrink: 0, background: 'var(--sidebar-bg)',
      display: 'flex', flexDirection: 'column',
      position: 'sticky', top: 0, height: '100vh',
      boxShadow: '2px 0 8px rgba(0,0,0,0.15)',
      transition: 'width 0.2s ease',
      overflow: 'hidden',
    }}>

      {/* Header */}
      <div style={{
        padding: collapsed ? '20px 10px' : '20px 16px 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        display: 'flex', alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        minHeight: 68, boxSizing: 'border-box',
      }}>
        {!collapsed && (
          <div style={{ overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
            <img
              src={logo}
              alt="Metcalfe Heating & Air Conditioning"
              style={{ height: 88, width: 'auto', maxWidth: 240, objectFit: 'contain',
                filter: 'brightness(0) invert(1)', display: 'block' }}
            />
          </div>
        )}
        <button onClick={toggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.45)', padding: 4, borderRadius: 4,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.45)'}
        >
          {collapsed ? ICONS.chevronRight : ICONS.chevronLeft}
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '12px 10px', flex: 1, overflowY: 'auto' }}>
        {renderSection(adminItems, 'admin')}
        {adminItems.length > 0 && opsItems.length > 0 && (
          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)', margin: collapsed ? '8px 6px' : '8px 4px' }} />
        )}
        {renderSection(opsItems, 'ops')}
      </nav>

      {/* Footer */}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', padding: '8px 10px' }}>

        {/* Feedback */}
        <button onClick={onOpenFeedback} title="Send Feedback"
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '8px 12px', marginBottom: 2,
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <span style={iconWrap}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </span>
          {!collapsed && <span style={{ fontSize: 13 }}>Feedback</span>}
        </button>

        {/* Help */}
        <button onClick={onOpenHelp} title="Help"
          style={{
            width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', borderRadius: 8, padding: '8px 12px', marginBottom: 2,
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'white'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          <span style={iconWrap}>{ICONS.help}</span>
          {!collapsed && <span style={{ fontSize: 13 }}>Help</span>}
        </button>

        {/* Settings */}
        <NavLink to="/settings" title={collapsed ? 'Settings' : undefined}
          style={({ isActive }) => ({
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '8px 12px', borderRadius: 8, marginBottom: 2,
            textDecoration: 'none', fontSize: 13,
            color: isActive ? 'white' : 'rgba(255,255,255,0.5)',
            background: isActive ? 'rgba(255,255,255,0.15)' : 'transparent',
            transition: 'all 0.15s',
          })}
        >
          <span style={iconWrap}>{ICONS.settings}</span>
          {!collapsed && 'Settings'}
        </NavLink>

        {/* User profile */}
        <div
          title={collapsed ? `${user?.full_name} · ${ROLE_LABELS[user?.role] || user?.role}` : undefined}
          style={{
            display: 'flex', alignItems: 'center',
            gap: collapsed ? 0 : 10, justifyContent: collapsed ? 'center' : 'flex-start',
            padding: '8px 12px', marginBottom: 4,
          }}
        >
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0,
          }}>
            {user?.initials || '?'}
          </div>
          {!collapsed && (
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'white',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.full_name}
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)' }}>
                {ROLE_LABELS[user?.role] || user?.role}
              </div>
            </div>
          )}
        </div>

        {/* Sign out */}
        <button onClick={handleLogout} title={collapsed ? 'Sign out' : undefined}
          style={{
            width: '100%', background: 'none', color: 'rgba(255,255,255,0.4)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8,
            padding: '6px 12px', fontSize: 12, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 6, transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.4)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)' }}
        >
          <span style={iconWrap}>{ICONS.signout}</span>
          {!collapsed && 'Sign out'}
        </button>
      </div>
    </aside>
  )
}

// ─── App Layout ────────────────────────────────────────────────────────────────

function AppLayout() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const isAccountManager = user?.role === 'account_manager'
  const [showHelp, setShowHelp] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [showPalette, setShowPalette] = useState(false)
  const [navOpen, setNavOpen] = useState(false)

  // Close drawer when switching to desktop
  useEffect(() => { if (!isMobile) setNavOpen(false) }, [isMobile])

  useEffect(() => {
    function handleKey(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowPalette(p => !p)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--body-bg)' }}>
      <Sidebar
        onOpenHelp={() => setShowHelp(true)}
        onOpenFeedback={() => setShowFeedback(true)}
        isMobile={isMobile}
        mobileOpen={navOpen}
        onMobileClose={() => setNavOpen(false)}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
        {/* Mobile top bar */}
        {isMobile && (
          <div style={{
            position: 'sticky', top: 0, zIndex: 100,
            background: 'var(--sidebar-bg)',
            display: 'flex', alignItems: 'center', gap: 8,
            // Safe-area-inset-top clears Dynamic Island / notch
            paddingTop: 'max(env(safe-area-inset-top), 12px)',
            paddingBottom: 10,
            paddingLeft: 'max(env(safe-area-inset-left), 14px)',
            paddingRight: 'max(env(safe-area-inset-right), 14px)',
            boxShadow: '0 2px 12px rgba(0,0,0,0.3)',
          }}>
            {/* Hamburger — 44×44 touch target */}
            <button
              onClick={() => setNavOpen(true)}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.9)',
                width: 44, height: 44, borderRadius: 10,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M2.5 5h15M2.5 10h15M2.5 15h15" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"/>
              </svg>
            </button>
            <img src={logo} alt="Metcalfe" style={{
              height: 40, width: 'auto', objectFit: 'contain',
              filter: 'brightness(0) invert(1)', flexShrink: 0,
            }} />
          </div>
        )}
        <main style={{
          flex: 1, width: '100%', boxSizing: 'border-box',
          padding: isMobile
            ? 'var(--mobile-pad)'
            : '32px 40px',
          paddingBottom: isMobile
            ? 'max(calc(env(safe-area-inset-bottom) + 16px), 24px)'
            : undefined,
          paddingLeft: isMobile
            ? 'max(calc(env(safe-area-inset-left) + 14px), 14px)'
            : undefined,
          paddingRight: isMobile
            ? 'max(calc(env(safe-area-inset-right) + 14px), 14px)'
            : undefined,
        }}>
          <Routes>
            <Route path="/"            element={isAccountManager ? <Navigate to="/plans" replace /> : <Dashboard />} />
            <Route path="/plans"       element={<PlansList />} />
            <Route path="/plans/new"   element={<NewPlan />} />
            <Route path="/plans/:id"   element={<PlanDetail />} />
            <Route path="/projects"    element={<Projects />} />
            <Route path="/builders"    element={<Builders />} />
            <Route path="/equipment"   element={<Equipment />} />
            <Route path="/settings"    element={<Settings />} />
            <Route path="/users"       element={<UserManagement />} />
            <Route path="/kit-admin"   element={<KitAdmin />} />
            <Route path="/price-book"  element={<PriceBook />} />
            <Route path="/files"       element={<Files />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/feedback"    element={<FeedbackInbox />} />
          </Routes>
        </main>
      </div>

      {showHelp     && <HelpModal onClose={() => setShowHelp(false)} />}
      {showFeedback && <FeedbackModal onClose={() => setShowFeedback(false)} />}
      {showPalette  && <CommandPalette onClose={() => setShowPalette(false)} onOpenHelp={() => { setShowHelp(true) }} />}
    </div>
  )
}

// ─── Root ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*" element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        } />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  )
}
