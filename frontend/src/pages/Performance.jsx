import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line,
} from 'recharts'
import { plans as plansApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme, THEMES } from '../context/ThemeContext'

// ── Formatters ────────────────────────────────────────────────
function currency(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + Number(n).toFixed(0)
}

function pct(n) {
  if (n === null || n === undefined) return '—'
  return (n * 100).toFixed(0) + '%'
}

// ── Date range helpers (same as Dashboard) ───────────────────
const DATE_RANGES = [
  { id: 'month',   label: 'This Month' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'ytd',     label: 'Year to Date' },
  { id: 'all',     label: 'All Time' },
  { id: 'custom',  label: 'Custom' },
]

function getDateBounds(rangeId) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (rangeId === 'month')   return [new Date(y, m, 1), null]
  if (rangeId === 'quarter') return [new Date(y, Math.floor(m / 3) * 3, 1), null]
  if (rangeId === 'ytd')     return [new Date(y, 0, 1), null]
  return [null, null]
}

const DEFAULT_STATUS_COLORS = {
  draft:      '#94a3b8',
  proposed:   '#f59e0b',
  contracted: '#2563a8',
  complete:   '#16a34a',
  lost:       '#dc2626',
}
const STATUSES = ['draft', 'proposed', 'contracted', 'complete', 'lost']
const STATUS_LABELS = { draft: 'Draft', proposed: 'Proposed', contracted: 'Contracted', complete: 'Complete', lost: 'Lost' }
const STATUS_BG = {
  draft:      'var(--status-draft-bg)',
  proposed:   'var(--status-proposed-bg)',
  contracted: 'var(--status-contracted-bg)',
  complete:   'var(--status-complete-bg)',
  lost:       'var(--status-lost-bg)',
}

function buildStatusMeta(colors) {
  return Object.fromEntries(
    STATUSES.map(k => [k, { label: STATUS_LABELS[k], color: colors[k], bg: STATUS_BG[k] }])
  )
}

const DEFAULT_ESTIMATOR_COLORS = [
  '#2563a8', '#16a34a', '#dc2626', '#7c3aed',
  '#f59e0b', '#0891b2', '#be185d', '#65a30d',
]

// ── Win-rate badge ────────────────────────────────────────────
function WinRateBadge({ rate }) {
  if (rate === null || rate === undefined) return <span style={{ color: 'var(--gray-300)' }}>—</span>
  const pct = Math.round(rate * 100)
  const color = pct >= 60 ? '#16a34a' : pct >= 40 ? '#f59e0b' : '#dc2626'
  const bg    = pct >= 60 ? '#f0fdf4'  : pct >= 40 ? '#fffbeb'  : '#fef2f2'
  return (
    <span style={{
      fontSize: 12, fontWeight: 700, padding: '2px 8px',
      borderRadius: 99, background: bg, color,
    }}>{pct}%</span>
  )
}

// ── Status breakdown mini-bar ─────────────────────────────────
function StatusBar({ byStatus, statusColors }) {
  const colors = statusColors || DEFAULT_STATUS_COLORS
  const STATUS_LABELS = { draft: 'Draft', proposed: 'Proposed', contracted: 'Contracted', complete: 'Complete', lost: 'Lost' }
  const total = STATUSES.reduce((s, k) => s + (byStatus[k]?.count || 0), 0)
  if (total === 0) return <span style={{ color: 'var(--gray-300)', fontSize: 12 }}>—</span>
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div style={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', width: 80, flexShrink: 0 }}>
        {STATUSES.map(k => {
          const count = byStatus[k]?.count || 0
          if (!count) return null
          return (
            <div key={k} style={{
              width: `${(count / total) * 100}%`,
              background: colors[k],
            }} title={`${STATUS_LABELS[k]}: ${count}`} />
          )
        })}
      </div>
      <span style={{ fontSize: 11, color: 'var(--gray-400)', whiteSpace: 'nowrap' }}>{total} plans</span>
    </div>
  )
}

// ── Estimator row ─────────────────────────────────────────────
function EstimatorRow({ e, rank, isOnly }) {
  const [expanded, setExpanded] = useState(false)
  const { theme } = useTheme()
  const STATUS_META = buildStatusMeta(
    THEMES.find(t => t.id === theme)?.chartColors?.donut || DEFAULT_STATUS_COLORS
  )

  return (
    <>
      <tr
        onClick={() => setExpanded(x => !x)}
        style={{
          borderBottom: '1px solid var(--gray-100)',
          cursor: 'pointer',
          background: expanded ? 'var(--gray-50)' : 'transparent',
          transition: 'background 0.15s',
        }}
        onMouseEnter={ev => { if (!expanded) ev.currentTarget.style.background = 'var(--gray-50)' }}
        onMouseLeave={ev => { if (!expanded) ev.currentTarget.style.background = 'transparent' }}
      >
        {!isOnly && (
          <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--gray-400)', fontSize: 13, width: 32 }}>
            #{rank}
          </td>
        )}
        <td style={{ padding: '12px 18px' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{e.estimator_name}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1 }}>{e.estimator_initials}</div>
        </td>
        <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600,
          fontSize: 14, color: e.total_plans > 0 ? 'var(--gray-800)' : 'var(--gray-300)' }}>
          {e.total_plans}
        </td>
        <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 13, color: 'var(--gray-500)' }}>
          {currency(e.pipeline)}
        </td>
        <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
          {currency(e.contracted_revenue)}
        </td>
        <td style={{ padding: '12px 18px', textAlign: 'center' }}>
          <WinRateBadge rate={e.win_rate} />
        </td>
        <td style={{ padding: '12px 18px', textAlign: 'center', fontSize: 12, color: 'var(--gray-400)' }}>
          <span style={{
            fontSize: 11, transform: expanded ? 'rotate(180deg)' : 'none',
            display: 'inline-block', transition: 'transform 0.2s',
          }}>▼</span>
        </td>
      </tr>

      {expanded && (
        <tr style={{ borderBottom: '1px solid var(--gray-100)' }}>
          <td colSpan={isOnly ? 6 : 7} style={{ padding: '0 18px 14px', background: 'var(--gray-50)' }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', paddingTop: 4 }}>
              {STATUSES.map(k => {
                const s = e.by_status[k] || { count: 0, total: 0 }
                return (
                  <div key={k} style={{
                    background: STATUS_META[k].bg,
                    border: `1px solid ${STATUS_META[k].color}30`,
                    borderRadius: 8, padding: '8px 14px', minWidth: 110,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 600, color: STATUS_META[k].color,
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
                      {STATUS_META[k].label}
                    </div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--gray-800)' }}>
                      {s.count}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 2 }}>
                      {currency(s.total)}
                    </div>
                  </div>
                )
              })}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

// ── Monthly chart tooltip ─────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
      borderRadius: 8, padding: '10px 14px', fontSize: 13,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: 'var(--gray-800)' }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 24, marginBottom: 2 }}>
          <span style={{ color: p.fill }}>{p.name}</span>
          <span style={{ fontWeight: 600 }}>{currency(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: 6, paddingTop: 6,
          display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <span>Total</span><span>{currency(total)}</span>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────
export default function Performance() {
  const { user } = useAuth()
  const { theme } = useTheme()
  const [range, setRange]         = useState('ytd')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const isAccountManager = user?.role === 'account_manager'

  const [dateFrom, dateTo] = useMemo(() => {
    if (range === 'custom') return [customFrom || undefined, customTo || undefined]
    const [from] = getDateBounds(range)
    return [from ? from.toISOString().split('T')[0] : undefined, undefined]
  }, [range, customFrom, customTo])

  const { data, isLoading, isError } = useQuery({
    queryKey: ['performance', range, range === 'custom' ? `${customFrom}:${customTo}` : null],
    queryFn:  () => plansApi.performance({ date_from: dateFrom, date_to: dateTo }),
    enabled:  range !== 'custom' || !!(customFrom || customTo),
  })

  const summary     = data?.summary      || []
  const monthly     = data?.monthly      || []
  const byBuilder   = data?.by_builder   || []
  const byHouseType = data?.by_house_type || []

  const chartColors      = THEMES.find(t => t.id === theme)?.chartColors || {}
  const ESTIMATOR_COLORS = chartColors.estimators || DEFAULT_ESTIMATOR_COLORS
  const STATUS_COLORS    = chartColors.donut       || DEFAULT_STATUS_COLORS
  const STATUS_META      = buildStatusMeta(STATUS_COLORS)

  // Build monthly chart data: [{month: "Mar 2026", AC: 45000, JB: 32000}, ...]
  const estimatorInits = [...new Set(summary.map(e => e.estimator_initials))]
  const monthlyChart = useMemo(() => {
    const map = {}
    for (const row of monthly) {
      const key = `${String(row.month).padStart(2,'0')}/${row.year}`
      if (!map[key]) map[key] = { _sort: row.year * 100 + row.month, month: key }
      map[key][row.estimator_initials] = (map[key][row.estimator_initials] || 0) + row.total_bid
    }
    return Object.values(map).sort((a, b) => a._sort - b._sort)
  }, [monthly])

  // Totals row
  const grandTotal = useMemo(() => ({
    contracted_revenue: summary.reduce((s, e) => s + e.contracted_revenue, 0),
    pipeline:           summary.reduce((s, e) => s + e.pipeline, 0),
    total_plans:        summary.reduce((s, e) => s + e.total_plans, 0),
  }), [summary])

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            {isAccountManager ? 'My Performance' : 'Sales Performance'}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {isAccountManager
              ? 'Your bid history and win rate'
              : 'Bid history and win rates by estimator'}
          </div>
        </div>

        {/* Date range selector */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
          <div style={{ display: 'flex', gap: 4, background: 'var(--gray-100)',
            borderRadius: 8, padding: 3 }}>
            {DATE_RANGES.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)}
                style={{
                  background: range === r.id ? 'var(--card-bg)' : 'transparent',
                  border: 'none', borderRadius: 6,
                  padding: '5px 12px', fontSize: 12, fontWeight: range === r.id ? 600 : 400,
                  color: range === r.id ? 'var(--gray-800)' : 'var(--gray-400)',
                  cursor: 'pointer', transition: 'all 0.15s',
                  boxShadow: range === r.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                }}>
                {r.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px' }} />
              <span style={{ color: 'var(--gray-400)' }}>to</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                style={{ fontSize: 12, padding: '4px 8px' }} />
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 64 }}><span className="spinner" /></div>
      ) : isError ? (
        <div className="error-msg">Could not load performance data. Check that the server is running.</div>
      ) : summary.length === 0 ? (
        <div className="empty-state"><p>No plans found for this period.</p></div>
      ) : (
        <>
          {/* ── Summary table ── */}
          <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--gray-100)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>
                {isAccountManager ? 'Your Summary' : 'Account Manager Summary'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                Click a row to expand status breakdown
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  {!isAccountManager && (
                    <th style={{ padding: '8px 18px', textAlign: 'left', fontWeight: 600,
                      fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase',
                      letterSpacing: '0.04em', width: 32 }}>#</th>
                  )}
                  <th style={{ padding: '8px 18px', textAlign: 'left', fontWeight: 600,
                    fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase',
                    letterSpacing: '0.04em' }}>Estimator</th>
                  <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 600,
                    fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase',
                    letterSpacing: '0.04em' }}>Plans</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600,
                    fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase',
                    letterSpacing: '0.04em' }}>Pipeline</th>
                  <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600,
                    fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase',
                    letterSpacing: '0.04em' }}>Contracted</th>
                  <th style={{ padding: '8px 18px', textAlign: 'center', fontWeight: 600,
                    fontSize: 11, color: 'var(--gray-400)', textTransform: 'uppercase',
                    letterSpacing: '0.04em' }}>Win Rate</th>
                  <th style={{ padding: '8px 18px', width: 28 }} />
                </tr>
              </thead>
              <tbody>
                {summary.map((e, i) => (
                  <EstimatorRow
                    key={e.estimator_initials}
                    e={e}
                    rank={i + 1}
                    isOnly={isAccountManager}
                  />
                ))}
              </tbody>
              {/* Totals footer (admin/AE only, multiple estimators) */}
              {!isAccountManager && summary.length > 1 && (
                <tfoot>
                  <tr style={{ background: 'var(--gray-50)',
                    borderTop: '2px solid var(--gray-200)' }}>
                    <td style={{ padding: '10px 18px' }} />
                    <td style={{ padding: '10px 18px', fontWeight: 700, fontSize: 13 }}>
                      Total — {summary.length} estimators
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center',
                      fontWeight: 700, fontSize: 14 }}>
                      {grandTotal.total_plans}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right',
                      fontSize: 13, color: 'var(--gray-500)', fontWeight: 600 }}>
                      {currency(grandTotal.pipeline)}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right',
                      fontWeight: 700, fontSize: 15 }}>
                      {currency(grandTotal.contracted_revenue)}
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* ── Two-panel charts ── */}
          {summary.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

              {/* Panel 1 — Horizontal ranked bar */}
              <div className="card">
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                  Contracted Revenue
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 20 }}>
                  Ranked by contracted + complete total
                </div>
                <ResponsiveContainer width="100%" height={Math.max(180, summary.length * 44)}>
                  <BarChart
                    layout="vertical"
                    data={[...summary]
                      .sort((a, b) => b.contracted_revenue - a.contracted_revenue)
                      .map((e) => ({
                        name: e.estimator_name,
                        initials: e.estimator_initials,
                        revenue: e.contracted_revenue,
                      }))}
                    margin={{ top: 0, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" horizontal={false} />
                    <XAxis type="number" tickFormatter={v => currency(v)}
                      tick={{ fontSize: 11, fill: 'var(--gray-400)' }}
                      axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={90}
                      tick={{ fontSize: 12, fill: 'var(--gray-700)' }}
                      axisLine={false} tickLine={false} />
                    <Tooltip
                      formatter={(v) => [currency(v), 'Contracted']}
                      contentStyle={{
                        background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
                        borderRadius: 8, fontSize: 13,
                      }}
                    />
                    <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {[...summary]
                        .sort((a, b) => b.contracted_revenue - a.contracted_revenue)
                        .map((e) => (
                          <Cell
                            key={e.estimator_initials}
                            fill={ESTIMATOR_COLORS[
                              estimatorInits.indexOf(e.estimator_initials) % ESTIMATOR_COLORS.length
                            ]}
                          />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Panel 2 — Monthly trend lines */}
              <div className="card">
                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>
                  Monthly Trend
                </div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginBottom: 20 }}>
                  Contracted revenue over time
                </div>
                {monthlyChart.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 0',
                    color: 'var(--gray-300)', fontSize: 13 }}>
                    No contracted plans in this period
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={Math.max(180, summary.length * 44)}>
                    <LineChart data={monthlyChart} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-200)" vertical={false} />
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--gray-400)' }}
                        axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => currency(v)}
                        tick={{ fontSize: 11, fill: 'var(--gray-400)' }}
                        axisLine={false} tickLine={false} width={56} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      {estimatorInits.map((init, i) => (
                        <Line
                          key={init}
                          type="monotone"
                          dataKey={init}
                          name={summary.find(e => e.estimator_initials === init)?.estimator_name || init}
                          stroke={ESTIMATOR_COLORS[i % ESTIMATOR_COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          )}

          {/* ── Status breakdown cards (all statuses) ── */}
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 16 }}>
              Pipeline Breakdown — All Statuses
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {STATUSES.map(k => {
                const count = summary.reduce((s, e) => s + (e.by_status[k]?.count || 0), 0)
                const total = summary.reduce((s, e) => s + (e.by_status[k]?.total || 0), 0)
                const meta  = STATUS_META[k]
                return (
                  <div key={k} style={{
                    flex: '1 1 140px',
                    background: meta.bg,
                    border: `1px solid ${meta.color}30`,
                    borderRadius: 10, padding: '14px 18px',
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: meta.color,
                      textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--gray-800)',
                      lineHeight: 1 }}>
                      {count}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 4 }}>
                      {currency(total)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Builder breakdown ── */}
          {byBuilder.length > 0 && (
            <div className="card" style={{ marginBottom: 24, padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Builder Breakdown</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                  Ranked by contracted revenue
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    {['#', 'Builder', 'Plans', 'Pipeline', 'Contracted', 'Win Rate'].map((h, i) => (
                      <th key={h} style={{
                        padding: '8px 12px',
                        textAlign: i <= 1 ? 'left' : i === 2 ? 'center' : 'right',
                        fontWeight: 600, fontSize: 11, color: 'var(--gray-400)',
                        textTransform: 'uppercase', letterSpacing: '0.04em',
                        paddingLeft: i === 0 ? 18 : undefined,
                        paddingRight: i === 5 ? 18 : undefined,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byBuilder.map((b, i) => (
                    <tr key={b.builder_name} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '11px 18px', fontWeight: 700, color: 'var(--gray-400)',
                        fontSize: 13, width: 32 }}>#{i + 1}</td>
                      <td style={{ padding: '11px 12px', fontWeight: 600, fontSize: 14 }}>
                        {b.builder_name}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'center', color: 'var(--gray-600)' }}>
                        {b.total_plans}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: 'var(--gray-500)', fontSize: 13 }}>
                        {currency(b.pipeline)}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                        {currency(b.contracted_revenue)}
                      </td>
                      <td style={{ padding: '11px 18px', textAlign: 'right' }}>
                        <WinRateBadge rate={b.win_rate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ── House type breakdown ── */}
          {byHouseType.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 18px 12px', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>House Type Breakdown</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 2 }}>
                  Ranked by number of plans
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    {['House Type', 'Plans', 'Avg Bid', 'Pipeline', 'Contracted', 'Win Rate'].map((h, i) => (
                      <th key={h} style={{
                        padding: '8px 12px', fontWeight: 600, fontSize: 11,
                        color: 'var(--gray-400)', textTransform: 'uppercase', letterSpacing: '0.04em',
                        textAlign: i === 0 ? 'left' : i === 1 ? 'center' : 'right',
                        paddingLeft: i === 0 ? 18 : undefined,
                        paddingRight: i === 5 ? 18 : undefined,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {byHouseType.map(ht => (
                    <tr key={ht.house_type} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '11px 18px', fontWeight: 600, fontSize: 14 }}>
                        {ht.house_type}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'center', color: 'var(--gray-600)' }}>
                        {ht.total_plans}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: 'var(--gray-500)', fontSize: 13 }}>
                        {ht.avg_bid > 0 ? currency(ht.avg_bid) : '—'}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: 'var(--gray-500)', fontSize: 13 }}>
                        {currency(ht.pipeline)}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700, fontSize: 14 }}>
                        {currency(ht.contracted_revenue)}
                      </td>
                      <td style={{ padding: '11px 18px', textAlign: 'right' }}>
                        <WinRateBadge rate={ht.win_rate} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
