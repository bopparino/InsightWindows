import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { feedbackApi } from '../api/client'

const TYPE_COLORS = {
  bug:      { bg: 'var(--status-lost-bg)',        text: 'var(--status-lost-text)',        label: 'Bug'      },
  idea:     { bg: 'var(--status-proposed-bg)',     text: 'var(--status-proposed-text)',    label: 'Idea'     },
  feedback: { bg: 'var(--status-contracted-bg)',   text: 'var(--status-contracted-text)',  label: 'Feedback' },
}

const STATUS_COLORS = {
  open:     { bg: 'var(--status-proposed-bg)',   text: 'var(--status-proposed-text)'   },
  resolved: { bg: 'var(--status-contracted-bg)', text: 'var(--status-contracted-text)' },
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

function TypePill({ type }) {
  const c = TYPE_COLORS[type] || TYPE_COLORS.feedback
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.text, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>{c.label}</span>
  )
}

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.open
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
      background: c.bg, color: c.text, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>{status}</span>
  )
}

export default function FeedbackInbox() {
  const qc = useQueryClient()
  const [filter, setFilter] = useState('open')
  const [expanded, setExpanded] = useState(null)

  const { data = [], isLoading } = useQuery({
    queryKey: ['feedback'],
    queryFn: feedbackApi.list,
  })

  const { mutate: setStatus } = useMutation({
    mutationFn: ({ id, status }) => feedbackApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['feedback'] }),
  })

  const shown = filter === 'all' ? data : data.filter(f => f.status === filter)
  const openCount = data.filter(f => f.status === 'open').length

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>Feedback Inbox</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-muted)' }}>
            {openCount > 0 ? `${openCount} open item${openCount !== 1 ? 's' : ''}` : 'All caught up'}
          </p>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--body-bg)', borderRadius: 8, padding: 3 }}>
          {[['open', 'Open'], ['resolved', 'Resolved'], ['all', 'All']].map(([val, label]) => (
            <button key={val} onClick={() => setFilter(val)} style={{
              padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer',
              fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
              background: filter === val ? 'var(--gray-900)' : 'transparent',
              color: filter === val ? '#FFFFFF' : 'var(--gray-400)',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}><span className="spinner" /></div>
      ) : shown.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)',
          border: '1px dashed var(--border)', borderRadius: 10,
        }}>
          <div style={{ fontSize: 13 }}>No {filter !== 'all' ? filter : ''} feedback yet.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map(item => {
            const isOpen = expanded === item.id
            return (
              <div key={item.id} style={{
                background: 'var(--card-bg)', border: '1px solid var(--border)',
                borderRadius: 10, overflow: 'hidden',
                boxShadow: isOpen ? '0 4px 16px rgba(0,0,0,0.08)' : 'none',
                transition: 'box-shadow 0.15s',
              }}>
                {/* Row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : item.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    cursor: 'pointer', userSelect: 'none',
                  }}
                >
                  <TypePill type={item.type} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.subject}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      {item.user_name} · {formatDate(item.submitted_at)}
                    </div>
                  </div>
                  <StatusPill status={item.status} />
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"
                    style={{ color: 'var(--text-muted)', flexShrink: 0, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }}>
                    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Expanded detail */}
                {isOpen && (
                  <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                    <p style={{
                      margin: '14px 0 16px', fontSize: 13, lineHeight: 1.7,
                      color: 'var(--text)', whiteSpace: 'pre-wrap',
                    }}>{item.message}</p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {item.status === 'open' ? (
                        <button onClick={() => setStatus({ id: item.id, status: 'resolved' })} style={{
                          padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                          fontSize: 13, fontWeight: 600,
                          background: 'var(--status-contracted-bg)', color: 'var(--status-contracted-text)',
                        }}>Mark Resolved</button>
                      ) : (
                        <button onClick={() => setStatus({ id: item.id, status: 'open' })} style={{
                          padding: '6px 16px', borderRadius: 7, border: '1px solid var(--border)',
                          cursor: 'pointer', fontSize: 13, background: 'none', color: 'var(--text-muted)',
                        }}>Reopen</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
