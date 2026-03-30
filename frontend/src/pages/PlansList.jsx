import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useSearchParams } from 'react-router-dom'
import { plans } from '../api/client'
import { useAuth } from '../context/AuthContext'

const STATUSES = ['all', 'draft', 'proposed', 'contracted', 'complete', 'lost']

export default function PlansList() {
  const { user } = useAuth()
  const isElevated = user?.role === 'admin' || user?.role === 'account_executive'
  const [searchParams, setSearchParams] = useSearchParams()
  const [statusFilter, setStatusFilter] = useState(
    searchParams.get('status') || 'all'
  )
  const [search, setSearch] = useState('')
  const [builderFilter, setBuilderFilter] = useState('')
  const [estimatorFilter, setEstimatorFilter] = useState('')

  // Sync status filter to URL
  useEffect(() => {
    const s = searchParams.get('status')
    if (s && STATUSES.includes(s)) setStatusFilter(s)
  }, [searchParams])

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['plans', statusFilter],
    queryFn: () => plans.list(statusFilter === 'all' ? null : statusFilter),
  })

  const builders   = [...new Set(data.map(p => p.builder_name))].sort()
  const estimators = [...new Set(data.map(p => p.estimator_name).filter(Boolean))].sort()

  const filtered = data.filter(p => {
    if (search && !(
      p.plan_number.toLowerCase().includes(search.toLowerCase()) ||
      p.project_name.toLowerCase().includes(search.toLowerCase()) ||
      p.builder_name.toLowerCase().includes(search.toLowerCase()) ||
      (p.house_type || '').toLowerCase().includes(search.toLowerCase())
    )) return false
    if (builderFilter && p.builder_name !== builderFilter) return false
    if (estimatorFilter && p.estimator_name !== estimatorFilter) return false
    return true
  })

  function setStatus(s) {
    setStatusFilter(s)
    if (s === 'all') {
      searchParams.delete('status')
    } else {
      searchParams.set('status', s)
    }
    setSearchParams(searchParams)
  }

  const STATUS_STYLES = {
    draft:      { bg: 'var(--status-draft-bg)',      text: 'var(--status-draft-text)',      border: 'var(--status-draft-border)'      },
    proposed:   { bg: 'var(--status-proposed-bg)',   text: 'var(--status-proposed-text)',   border: 'var(--status-proposed-border)'   },
    contracted: { bg: 'var(--status-contracted-bg)', text: 'var(--status-contracted-text)', border: 'var(--status-contracted-border)' },
    complete:   { bg: 'var(--status-complete-bg)',   text: 'var(--status-complete-text)',   border: 'var(--status-complete-border)'   },
    lost:       { bg: 'var(--status-lost-bg)',       text: 'var(--status-lost-text)',       border: 'var(--status-lost-border)'       },
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Plans</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {filtered.length} plan{filtered.length !== 1 ? 's' : ''}
            {statusFilter !== 'all' ? ` · ${statusFilter}` : ''}
          </div>
        </div>
        <Link to="/plans/new">
          <button className="btn-primary">+ New Plan</button>
        </Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search plans, projects, builders..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 280 }}
        />
        {builders.length > 0 && (
          <select value={builderFilter} onChange={e => setBuilderFilter(e.target.value)}
            style={{ maxWidth: 200 }}>
            <option value="">All builders</option>
            {builders.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        {isElevated && estimators.length > 1 && (
          <select value={estimatorFilter} onChange={e => setEstimatorFilter(e.target.value)}
            style={{ maxWidth: 180 }}>
            <option value="">All account managers</option>
            {estimators.map(e => <option key={e} value={e}>{e}</option>)}
          </select>
        )}
        {(builderFilter || estimatorFilter) && (
          <button
            onClick={() => { setBuilderFilter(''); setEstimatorFilter('') }}
            style={{ fontSize: 12, color: 'var(--gray-400)', background: 'none',
              border: 'none', cursor: 'pointer', padding: '4px 0' }}>
            Clear filters
          </button>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, flexWrap: 'wrap' }}>
        {STATUSES.map(s => (
          <button key={s}
            onClick={() => setStatus(s)}
            style={{
              background: statusFilter === s ? 'var(--blue)' : 'var(--gray-100)',
              color: statusFilter === s ? 'white' : 'var(--gray-600)',
              border: statusFilter === s ? 'none' : '1px solid var(--gray-200)',
              padding: '6px 14px', fontSize: 13, borderRadius: 8,
            }}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      <div className="card" style={{ padding: 0 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <span className="spinner" />
          </div>
        ) : isError ? (
          <div className="error-msg" style={{ margin: 24 }}>
            Could not load plans. Check that the server is running.
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <p>{search ? 'No plans match your search.' : `No ${statusFilter === 'all' ? '' : statusFilter + ' '}plans found.`}</p>
            <Link to="/plans/new">
              <button className="btn-primary btn-sm" style={{ marginTop: 12 }}>
                + New Plan
              </button>
            </Link>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Plan #</th>
                <th>Project</th>
                <th>Builder</th>
                <th>House type</th>
                <th style={{ textAlign: 'center' }}>Zones</th>
                <th style={{ textAlign: 'right' }}>Total bid</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right', paddingRight: 20 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const s = STATUS_STYLES[p.status] || STATUS_STYLES.draft
                return (
                  <tr key={p.id}>
                    <td style={{ paddingLeft: 20 }}>
                      <Link to={`/plans/${p.id}`}
                        style={{ fontWeight: 600, color: 'var(--blue-mid)' }}>
                        {p.plan_number}
                      </Link>
                    </td>
                    <td>
                      {p.project_name}
                      <span style={{ color: 'var(--gray-400)', fontSize: 12,
                        marginLeft: 6 }}>({p.project_code})</span>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.builder_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>
                      {p.house_type || '—'}
                    </td>
                    <td style={{ textAlign: 'center', fontSize: 13 }}>
                      {p.number_of_zones}
                    </td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                      {p.total_bid > 0
                        ? '$' + p.total_bid.toLocaleString('en-US', { minimumFractionDigits: 2 })
                        : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 99,
                        fontWeight: 500, background: s.bg, color: s.text,
                        border: `1px solid ${s.border}` }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 20,
                      fontSize: 13, color: 'var(--gray-400)' }}>
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
