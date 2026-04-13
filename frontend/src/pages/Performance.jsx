import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ResponsiveContainer,
  BarChart, Bar, Cell, XAxis, YAxis, Tooltip, Legend,
  AreaChart, Area,
} from 'recharts'
import { plans as plansApi } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useTheme, THEMES } from '../context/ThemeContext'

const mono = "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace"
const tacticalLabel = { fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gray-400)' }

// ── Formatters ────────────────────────────────────────────────
function currency(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + Number(n).toFixed(0)
}

// ── Date range helpers ───────────────────────────────────────
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
  const pctVal = Math.round(rate * 100)
  const color = pctVal >= 60 ? 'var(--status-contracted-text)' : pctVal >= 40 ? 'var(--status-proposed-text)' : 'var(--status-lost-text)'
  const bg    = pctVal >= 60 ? 'var(--status-contracted-bg)'   : pctVal >= 40 ? 'var(--status-proposed-bg)'   : 'var(--status-lost-bg)'
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: '3px 10px',
      borderRadius: 6, background: bg, color, fontFamily: mono,
    }}>{pctVal}%</span>
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
          <td style={{ padding: '12px 18px', fontWeight: 700, color: 'var(--gray-400)',
            fontSize: 12, fontFamily: mono, width: 32 }}>
            #{rank}
          </td>
        )}
        <td style={{ padding: '12px 18px' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{e.estimator_name}</div>
          <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 1, fontFamily: mono }}>{e.estimator_initials}</div>
        </td>
        <td style={{ padding: '12px 12px', textAlign: 'center', fontWeight: 600,
          fontSize: 14, fontFamily: mono, color: e.total_plans > 0 ? 'var(--gray-800)' : 'var(--gray-300)' }}>
          {e.total_plans}
        </td>
        <td style={{ padding: '12px 12px', textAlign: 'right', fontSize: 13,
          color: 'var(--gray-500)', fontFamily: mono }}>
          {currency(e.pipeline)}
        </td>
        <td style={{ padding: '12px 12px', textAlign: 'right', fontWeight: 700,
          fontSize: 14, fontFamily: mono }}>
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
                    borderRadius: 10, padding: '10px 16px', minWidth: 110,
                  }}>
                    <div style={{ ...tacticalLabel, color: STATUS_META[k].color, marginBottom: 6 }}>
                      {STATUS_META[k].label}
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--gray-800)',
                      fontFamily: mono, lineHeight: 1 }}>
                      {s.count}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--gray-500)', marginTop: 4,
                      fontFamily: mono }}>
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

// ── Chart tooltip ─────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const total = payload.reduce((s, p) => s + (p.value || 0), 0)
  return (
    <div style={{
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid var(--gray-200)',
      borderRadius: 10, padding: '12px 16px', fontSize: 13,
      boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: 'var(--gray-800)', fontSize: 12 }}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{ display: 'flex', justifyContent: 'space-between',
          gap: 24, marginBottom: 3, alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.color || p.fill }} />
            <span style={{ color: 'var(--gray-600)', fontSize: 12 }}>{p.name}</span>
          </span>
          <span style={{ fontWeight: 600, fontFamily: mono, fontSize: 12 }}>{currency(p.value)}</span>
        </div>
      ))}
      {payload.length > 1 && (
        <div style={{ borderTop: '1px solid var(--gray-200)', marginTop: 8, paddingTop: 8,
          display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 12 }}>
          <span>Total</span><span style={{ fontFamily: mono }}>{currency(total)}</span>
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

  const grandTotal = useMemo(() => ({
    contracted_revenue: summary.reduce((s, e) => s + e.contracted_revenue, 0),
    pipeline:           summary.reduce((s, e) => s + e.pipeline, 0),
    total_plans:        summary.reduce((s, e) => s + e.total_plans, 0),
  }), [summary])

  const thStyle = {
    padding: '10px 12px', ...tacticalLabel,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.03em' }}>
            {isAccountManager ? 'My Performance' : 'Sales Performance'}
          </h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 4 }}>
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
                  background: range === r.id ? 'var(--gray-900)' : 'transparent',
                  border: 'none', borderRadius: 6,
                  padding: '6px 14px', fontSize: 11, fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  color: range === r.id ? '#FFFFFF' : 'var(--gray-400)',
                  cursor: 'pointer', transition: 'all 0.15s',
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
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--gray-100)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ ...tacticalLabel, fontSize: 11, color: 'var(--gray-600)' }}>
                {isAccountManager ? 'Your Summary' : 'Account Manager Summary'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                Click a row to expand
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--gray-50)' }}>
                  {!isAccountManager && (
                    <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 18, width: 32 }}>#</th>
                  )}
                  <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 18 }}>Estimator</th>
                  <th style={{ ...thStyle, textAlign: 'center' }}>Plans</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Pipeline</th>
                  <th style={{ ...thStyle, textAlign: 'right' }}>Contracted</th>
                  <th style={{ ...thStyle, textAlign: 'center', paddingRight: 18 }}>Win Rate</th>
                  <th style={{ ...thStyle, width: 28 }} />
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
              {!isAccountManager && summary.length > 1 && (
                <tfoot>
                  <tr style={{ background: 'var(--gray-50)',
                    borderTop: '2px solid var(--gray-200)' }}>
                    <td style={{ padding: '12px 18px' }} />
                    <td style={{ padding: '12px 18px', fontWeight: 700, fontSize: 13 }}>
                      Total — {summary.length} estimators
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'center',
                      fontWeight: 700, fontSize: 14, fontFamily: mono }}>
                      {grandTotal.total_plans}
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'right',
                      fontSize: 13, color: 'var(--gray-500)', fontWeight: 600, fontFamily: mono }}>
                      {currency(grandTotal.pipeline)}
                    </td>
                    <td style={{ padding: '12px 12px', textAlign: 'right',
                      fontWeight: 700, fontSize: 15, fontFamily: mono }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

              {/* Panel 1 — Horizontal ranked bar */}
              <div className="card">
                <div style={{ ...tacticalLabel, fontSize: 11, color: 'var(--gray-600)', marginBottom: 4 }}>
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
                    <XAxis type="number" tickFormatter={v => currency(v)}
                      tick={{ fontSize: 11, fill: 'var(--gray-400)', fontFamily: mono }}
                      axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={90}
                      tick={{ fontSize: 12, fill: 'var(--gray-700)' }}
                      axisLine={false} tickLine={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="revenue" radius={[0, 6, 6, 0]} maxBarSize={28}>
                      {[...summary]
                        .sort((a, b) => b.contracted_revenue - a.contracted_revenue)
                        .map((e, i) => (
                          <Cell
                            key={e.estimator_initials}
                            fill={i === 0
                              ? (chartColors.primary || 'var(--accent)')
                              : 'var(--gray-300)'}
                          />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Panel 2 — Monthly trend (area chart) */}
              <div className="card">
                <div style={{ ...tacticalLabel, fontSize: 11, color: 'var(--gray-600)', marginBottom: 4 }}>
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
                    <AreaChart data={monthlyChart} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                      <defs>
                        {estimatorInits.map((init, i) => (
                          <linearGradient key={init} id={`perf-grad-${init}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={ESTIMATOR_COLORS[i % ESTIMATOR_COLORS.length]} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={ESTIMATOR_COLORS[i % ESTIMATOR_COLORS.length]} stopOpacity={0.02} />
                          </linearGradient>
                        ))}
                      </defs>
                      <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--gray-400)' }}
                        axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={v => currency(v)}
                        tick={{ fontSize: 11, fill: 'var(--gray-400)', fontFamily: mono }}
                        axisLine={false} tickLine={false} width={56} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                      {estimatorInits.map((init, i) => (
                        <Area
                          key={init}
                          type="monotone"
                          dataKey={init}
                          name={summary.find(e => e.estimator_initials === init)?.estimator_name || init}
                          stroke={ESTIMATOR_COLORS[i % ESTIMATOR_COLORS.length]}
                          fill={`url(#perf-grad-${init})`}
                          strokeWidth={2}
                          dot={{ r: 3, strokeWidth: 0 }}
                          activeDot={{ r: 5 }}
                          connectNulls
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>

            </div>
          )}

          {/* ── Status breakdown cards ── */}
          <div className="card">
            <div style={{ ...tacticalLabel, fontSize: 11, color: 'var(--gray-600)', marginBottom: 16 }}>
              Pipeline Breakdown
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
              {STATUSES.map(k => {
                const count = summary.reduce((s, e) => s + (e.by_status[k]?.count || 0), 0)
                const total = summary.reduce((s, e) => s + (e.by_status[k]?.total || 0), 0)
                const meta  = STATUS_META[k]
                return (
                  <div key={k} style={{
                    background: meta.bg,
                    border: `1px solid ${meta.color}30`,
                    borderRadius: 10, padding: '16px 18px',
                  }}>
                    <div style={{ ...tacticalLabel, color: meta.color, marginBottom: 8 }}>
                      {meta.label}
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--gray-800)',
                      fontFamily: mono, lineHeight: 1 }}>
                      {count}
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--gray-500)', marginTop: 6,
                      fontFamily: mono }}>
                      {currency(total)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Builder breakdown ── */}
          {byBuilder.length > 0 && (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ ...tacticalLabel, fontSize: 11, color: 'var(--gray-600)' }}>Builder Breakdown</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
                  Ranked by contracted revenue
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 18, width: 32 }}>#</th>
                    <th style={{ ...thStyle, textAlign: 'left' }}>Builder</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Plans</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Pipeline</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Contracted</th>
                    <th style={{ ...thStyle, textAlign: 'right', paddingRight: 18 }}>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {byBuilder.map((b, i) => (
                    <tr key={b.builder_name} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '11px 18px', fontWeight: 700, color: 'var(--gray-400)',
                        fontSize: 12, fontFamily: mono, width: 32 }}>#{i + 1}</td>
                      <td style={{ padding: '11px 12px', fontWeight: 600, fontSize: 14 }}>
                        {b.builder_name}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'center', color: 'var(--gray-600)',
                        fontFamily: mono }}>
                        {b.total_plans}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: 'var(--gray-500)',
                        fontSize: 13, fontFamily: mono }}>
                        {currency(b.pipeline)}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700,
                        fontSize: 14, fontFamily: mono }}>
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
              <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid var(--gray-100)' }}>
                <div style={{ ...tacticalLabel, fontSize: 11, color: 'var(--gray-600)' }}>House Type Breakdown</div>
                <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 4 }}>
                  Ranked by number of plans
                </div>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--gray-50)' }}>
                    <th style={{ ...thStyle, textAlign: 'left', paddingLeft: 18 }}>House Type</th>
                    <th style={{ ...thStyle, textAlign: 'center' }}>Plans</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Avg Bid</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Pipeline</th>
                    <th style={{ ...thStyle, textAlign: 'right' }}>Contracted</th>
                    <th style={{ ...thStyle, textAlign: 'right', paddingRight: 18 }}>Win Rate</th>
                  </tr>
                </thead>
                <tbody>
                  {byHouseType.map(ht => (
                    <tr key={ht.house_type} style={{ borderBottom: '1px solid var(--gray-100)' }}>
                      <td style={{ padding: '11px 18px', fontWeight: 600, fontSize: 14 }}>
                        {ht.house_type}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'center', color: 'var(--gray-600)',
                        fontFamily: mono }}>
                        {ht.total_plans}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: 'var(--gray-500)',
                        fontSize: 13, fontFamily: mono }}>
                        {ht.avg_bid > 0 ? currency(ht.avg_bid) : '—'}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', color: 'var(--gray-500)',
                        fontSize: 13, fontFamily: mono }}>
                        {currency(ht.pipeline)}
                      </td>
                      <td style={{ padding: '11px 12px', textAlign: 'right', fontWeight: 700,
                        fontSize: 14, fontFamily: mono }}>
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
