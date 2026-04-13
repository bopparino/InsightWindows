import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'
import { plans } from '../api/client'
import { useTheme, THEMES } from '../context/ThemeContext'

// ── Formatters ────────────────────────────────────────────────

function currency(n) {
  if (n >= 1_000_000) return '$' + (n / 1_000_000).toFixed(2) + 'M'
  if (n >= 1_000)     return '$' + (n / 1_000).toFixed(1) + 'K'
  return '$' + Number(n).toFixed(0)
}

function currencyFull(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2 })
}

function pct(n) { return Number(n).toFixed(1) + '%' }

function timeAgo(dateStr) {
  if (!dateStr) return '—'
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7)  return `${days}d ago`
  if (days < 30) return `${Math.floor(days / 7)}w ago`
  return new Date(dateStr).toLocaleDateString()
}

// ── Date range helpers ────────────────────────────────────────

const DATE_RANGES = [
  { id: 'month',   label: 'This Month' },
  { id: 'quarter', label: 'This Quarter' },
  { id: 'ytd',     label: 'Year to Date' },
  { id: 'all',     label: 'All Time' },
]

function getDateBounds(rangeId) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  if (rangeId === 'month')   return [new Date(y, m, 1),                      null]
  if (rangeId === 'quarter') return [new Date(y, Math.floor(m / 3) * 3, 1),  null]
  if (rangeId === 'ytd')     return [new Date(y, 0, 1),                      null]
  return [null, null]
}

function getPriorBounds(rangeId) {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth()
  const qStart = Math.floor(m / 3) * 3
  if (rangeId === 'month')   return [new Date(y, m - 1, 1),      new Date(y, m, 1)]
  if (rangeId === 'quarter') return [new Date(y, qStart - 3, 1), new Date(y, qStart, 1)]
  if (rangeId === 'ytd')     return [new Date(y - 1, 0, 1),      new Date(y, 0, 1)]
  return [null, null]
}

function applyBounds(data, from, to) {
  return data.filter(p => {
    const d = new Date(p.created_at)
    if (from && d < from) return false
    if (to   && d >= to)  return false
    return true
  })
}

function computeDelta(current, prior) {
  if (prior === null || prior === 0) return null
  return ((current - prior) / prior) * 100
}

// ── Status config ─────────────────────────────────────────────

const STATUS_CONFIG = {
  draft:      { label: 'Draft',      bg: 'var(--status-draft-bg)',      border: 'var(--status-draft-border)',      text: 'var(--status-draft-text)',      accent: 'var(--status-draft-accent)'      },
  proposed:   { label: 'Proposed',   bg: 'var(--status-proposed-bg)',   border: 'var(--status-proposed-border)',   text: 'var(--status-proposed-text)',   accent: 'var(--status-proposed-accent)'   },
  contracted: { label: 'Contracted', bg: 'var(--status-contracted-bg)', border: 'var(--status-contracted-border)', text: 'var(--status-contracted-text)', accent: 'var(--status-contracted-accent)' },
  complete:   { label: 'Complete',   bg: 'var(--status-complete-bg)',   border: 'var(--status-complete-border)',   text: 'var(--status-complete-text)',   accent: 'var(--status-complete-accent)'   },
  lost:       { label: 'Lost',       bg: 'var(--status-lost-bg)',       border: 'var(--status-lost-border)',       text: 'var(--status-lost-text)',       accent: 'var(--status-lost-accent)'       },
}

// Donut colors come from theme — see ThemeContext chartColors.donut
const DEFAULT_DONUT_COLORS = {
  draft:      '#94a3b8',
  proposed:   '#d97706',
  contracted: '#16a34a',
  complete:   '#2563eb',
  lost:       '#dc2626',
}

// ── Chart data builders ───────────────────────────────────────

function lastNMonths(n) {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d   = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    result.push({ key, label })
  }
  return result
}

function buildTrendData(allPlans, months) {
  const map = {}
  for (const { key } of months) map[key] = { count: 0, value: 0, secured: 0 }
  for (const p of allPlans) {
    const d   = new Date(p.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) continue
    map[key].count++
    map[key].value   += p.total_bid || 0
    if (p.status === 'contracted' || p.status === 'complete')
      map[key].secured += p.total_bid || 0
  }
  return months.map(({ key, label }) => ({
    label,
    'New Bids':  Math.round(map[key].value / 1000),
    'Secured':   Math.round(map[key].secured / 1000),
    count:       map[key].count,
  }))
}

function buildDonutData(groups, donutColors) {
  return Object.entries(groups)
    .filter(([, g]) => g.count > 0)
    .map(([s, g]) => ({
      name:  s.charAt(0).toUpperCase() + s.slice(1),
      value: g.count,
      color: (donutColors || DEFAULT_DONUT_COLORS)[s] || '#94a3b8',
    }))
}

function buildBuilderData(filtered, top = 10) {
  const map = {}
  for (const p of filtered) {
    if (!p.builder_name || !p.total_bid) continue
    map[p.builder_name] = map[p.builder_name] || { name: p.builder_name, value: 0, count: 0 }
    map[p.builder_name].value += p.total_bid
    map[p.builder_name].count++
  }
  return Object.values(map)
    .sort((a, b) => b.value - a.value)
    .slice(0, top)
    .map(b => ({ ...b, value: Math.round(b.value / 1000) }))
}

// ── Recharts custom tooltip ───────────────────────────────────

function ChartTooltip({ active, payload, label, suffix = 'K' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
      borderRadius: 8, padding: '10px 14px', boxShadow: 'var(--shadow-md)',
      fontSize: 12,
    }}>
      <div style={{ fontWeight: 700, color: 'var(--gray-800)', marginBottom: 6 }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--gray-600)', marginTop: 3 }}>
          <span style={{ width: 8, height: 8, borderRadius: 2, background: entry.color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: 'var(--gray-400)' }}>{entry.name}:</span>
          <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
            ${Number(entry.value).toLocaleString()}{suffix}
          </span>
        </div>
      ))}
    </div>
  )
}

function DonutTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { name, value } = payload[0]
  return (
    <div style={{
      background: 'var(--card-bg)', border: '1px solid var(--gray-200)',
      borderRadius: 8, padding: '8px 12px', boxShadow: 'var(--shadow-md)',
      fontSize: 12,
    }}>
      <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>{name}: {value} plans</span>
    </div>
  )
}

// ── Metric tile ───────────────────────────────────────────────

function MetricTile({ label, value, sub, accent = false, large = false, delta = null, noBorder = false }) {
  return (
    <div style={{
      padding: large ? '20px 24px' : '16px 20px',
      borderRight: noBorder ? 'none' : '1px solid var(--gray-100)',
      minWidth: 0,
    }}>
      <div style={{
        fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
        letterSpacing: '0.07em', color: 'var(--gray-400)', marginBottom: 8,
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <div style={{
          fontSize: large ? 30 : 22, fontWeight: 800,
          letterSpacing: '-0.03em', lineHeight: 1,
          color: accent ? 'var(--success)' : 'var(--gray-800)',
        }}>
          {value}
        </div>
        {delta !== null && (
          <div style={{
            fontSize: 12, fontWeight: 700, lineHeight: 1,
            color: delta >= 0 ? 'var(--success)' : 'var(--danger)',
          }}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(1)}%
          </div>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--gray-400)', marginTop: 5 }}>
          {sub}
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function Dashboard() {
  const [range, setRange] = useState('all')
  const { theme } = useTheme()
  const themeInfo  = THEMES.find(t => t.id === theme)
  const C = themeInfo?.chartColors || { primary: '#2563a8', secondary: '#16a34a', bar: '#2563a8' }
  const DONUT_COLORS = C.donut || DEFAULT_DONUT_COLORS

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plans.list(),
    refetchOnWindowFocus: true,
  })

  const MONTHS = useMemo(() => lastNMonths(18), [])

  // Current period
  const [from, to]   = getDateBounds(range)
  const filtered     = applyBounds(data, from, to)

  // Prior period (for % change)
  const [pFrom, pTo] = getPriorBounds(range)
  const prior        = pFrom ? applyBounds(data, pFrom, pTo) : null

  // Status groups
  const statuses = ['draft', 'proposed', 'contracted', 'complete', 'lost']
  const groups = statuses.reduce((acc, s) => {
    const g = filtered.filter(p => p.status === s)
    acc[s] = { count: g.length, total: g.reduce((sum, p) => sum + (p.total_bid || 0), 0), plans: g }
    return acc
  }, {})

  const priorGroups = prior ? statuses.reduce((acc, s) => {
    const g = prior.filter(p => p.status === s)
    acc[s] = { count: g.length, total: g.reduce((sum, p) => sum + (p.total_bid || 0), 0) }
    return acc
  }, {}) : null

  // Financial metrics
  const openPipeline   = groups.proposed.plans.reduce((s, p) => s + (p.total_bid || 0), 0)
  const totalPipeline  = filtered.reduce((s, p) => s + (p.total_bid || 0), 0)
  const securedRevenue = [...groups.contracted.plans, ...groups.complete.plans]
                           .reduce((s, p) => s + (p.total_bid || 0), 0)
  const biddedCount    = groups.proposed.count + groups.contracted.count + groups.complete.count + groups.lost.count
  const wonCount       = groups.contracted.count + groups.complete.count
  const winRate        = biddedCount > 0 ? (wonCount / biddedCount) * 100 : null
  const avgBidValue    = biddedCount > 0
    ? (openPipeline + securedRevenue + groups.lost.plans.reduce((s, p) => s + (p.total_bid || 0), 0)) / biddedCount
    : 0

  // Prior metrics for deltas
  const priorOpenPipeline = prior ? (priorGroups?.proposed?.total || 0) : null
  const priorTotal    = prior ? prior.reduce((s, p) => s + (p.total_bid || 0), 0) : null
  const priorSecured  = prior ? [...(priorGroups.contracted.plans || []), ...(priorGroups.complete?.plans || [])]
                          .reduce((s, p) => s + (p.total_bid || 0), 0) : null
  const priorBidded   = prior ? (priorGroups.proposed.count + priorGroups.contracted.count + priorGroups.complete.count + priorGroups.lost.count) : null
  const priorWon      = prior ? (priorGroups.contracted.count + priorGroups.complete.count) : null
  const priorWinRate  = priorBidded > 0 ? (priorWon / priorBidded) * 100 : null
  const priorAvg      = priorBidded > 0
    ? ((priorGroups?.proposed?.total || 0) + (priorSecured || 0) + (priorGroups?.lost?.total || 0)) / priorBidded
    : null

  // Chart data
  const trendData   = useMemo(() => buildTrendData(data, MONTHS), [data, MONTHS])
  const donutData   = useMemo(() => buildDonutData(groups, DONUT_COLORS), [filtered, DONUT_COLORS])
  const builderData = useMemo(() => buildBuilderData(filtered), [filtered])

  // Recent plans
  const recent = [...filtered]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)

  const rangeLabel = DATE_RANGES.find(r => r.id === range)?.label
  const showDelta  = range !== 'all'

  return (
    <div>
      {/* Page header */}
      <div className="page-header" style={{ alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {isLoading ? '—' : `${filtered.length} plans · ${rangeLabel}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{
            display: 'flex', background: 'var(--gray-100)',
            borderRadius: 8, padding: 3, gap: 2,
          }}>
            {DATE_RANGES.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)} style={{
                padding: '5px 12px', fontSize: 12, fontWeight: range === r.id ? 700 : 400,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: range === r.id ? 'var(--card-bg)' : 'transparent',
                color: range === r.id ? 'var(--gray-800)' : 'var(--gray-400)',
                boxShadow: range === r.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                transition: 'all 0.15s',
              }}>
                {r.label}
              </button>
            ))}
          </div>
          <Link to="/plans/new">
            <button className="btn-primary">+ New Plan</button>
          </Link>
        </div>
      </div>

      {isError && (
        <div className="error-msg" style={{ marginBottom: 20 }}>
          Could not load plan data. Check that the server is running.
        </div>
      )}

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '8px 20px', background: 'var(--gray-200)', height: 34 }} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[...Array(4)].map((_, i) => (
                <div key={i} style={{ padding: '20px 24px', borderRight: i < 3 ? '1px solid var(--gray-100)' : 'none' }}>
                  <div style={{ height: 10, width: 80, background: 'var(--gray-100)', borderRadius: 4, marginBottom: 12 }} />
                  <div style={{ height: 24, width: 100, background: 'var(--gray-100)', borderRadius: 4 }} />
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
            <div className="card" style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="spinner" />
            </div>
            <div className="card" style={{ height: 240, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="spinner" />
            </div>
          </div>
        </div>
      )}

      {/* ── Metric tiles ─────────────────────────────────── */}
      <div style={{ display: isLoading ? 'none' : undefined }}>
      <div className="card" style={{ padding: 0, marginBottom: 24, overflow: 'hidden' }}>
        <div style={{
          padding: '8px 20px', background: 'var(--blue)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.75)',
            textTransform: 'uppercase', letterSpacing: '0.07em' }}>
            Financial Summary
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{rangeLabel}</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
          <MetricTile
            label="Open Pipeline"
            value={isLoading ? '—' : currency(openPipeline)}
            sub={`${groups.proposed.count} proposed`}
            delta={showDelta ? computeDelta(openPipeline, priorOpenPipeline) : null}
            large
          />
          <MetricTile
            label="Secured Revenue"
            value={isLoading ? '—' : currency(securedRevenue)}
            sub={`${wonCount} contracted / complete`}
            delta={showDelta ? computeDelta(securedRevenue, priorSecured) : null}
            accent
            large
          />
          <MetricTile
            label="Win Rate"
            value={isLoading || winRate === null ? '—' : pct(winRate)}
            sub="Won vs. all bids sent"
            delta={showDelta && winRate !== null && priorWinRate !== null ? computeDelta(winRate, priorWinRate) : null}
            large
          />
          <MetricTile
            label="Avg Bid Value"
            value={isLoading || avgBidValue === 0 ? '—' : currency(avgBidValue)}
            sub="Per plan in period"
            delta={showDelta ? computeDelta(avgBidValue, priorAvg) : null}
            large
            noBorder
          />
        </div>
      </div>

      {/* ── Charts row ───────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 20 }}>

        {/* Line chart — revenue trend */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Revenue Trend (18 months)</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Values in $K</div>
          </div>
          <div style={{ padding: '12px 8px 8px 0' }}>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trendData} margin={{ top: 4, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={2}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v}K`}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Line
                  type="monotone" dataKey="New Bids"
                  stroke={C.primary} strokeWidth={2}
                  dot={false} activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone" dataKey="Secured"
                  stroke={C.secondary} strokeWidth={2}
                  dot={false} activeDot={{ r: 4 }}
                  strokeDasharray="4 2"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Donut chart — status breakdown */}
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Status Mix</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)', marginTop: 2 }}>{rangeLabel}</div>
          </div>
          <div style={{ padding: '8px 0', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            {isLoading || filtered.length === 0 ? (
              <div style={{ height: 200, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: 'var(--gray-400)', fontSize: 13 }}>
                {isLoading ? <span className="spinner" /> : 'No data'}
              </div>
            ) : (
              <>
                <ResponsiveContainer width="100%" height={160}>
                  <PieChart>
                    <Pie
                      data={donutData} dataKey="value"
                      cx="50%" cy="50%"
                      innerRadius={45} outerRadius={72}
                      paddingAngle={2}
                    >
                      {donutData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip content={<DonutTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 20px 12px' }}>
                  {donutData.map((d, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: d.color, display: 'inline-block', flexShrink: 0 }} />
                        <span style={{ color: 'var(--gray-600)' }}>{d.name}</span>
                      </div>
                      <span style={{ fontWeight: 600, color: 'var(--gray-800)' }}>
                        {d.value} <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>
                          ({((d.value / filtered.length) * 100).toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Builder bar chart ────────────────────────────── */}
      {builderData.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Top Builders by Bid Value</div>
            <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>Values in $K · {rangeLabel}</div>
          </div>
          <div style={{ padding: '12px 8px 8px 0' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={builderData} margin={{ top: 4, right: 20, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                  tickLine={false}
                  axisLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `$${v}K`}
                  width={52}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Bid Value" fill={C.bar} radius={[3, 3, 0, 0]}>
                  {builderData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.primary : i < 3 ? C.bar : C.secondary} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Status cards ─────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12, marginBottom: 20 }}>
        {statuses.map(status => {
          const cfg = STATUS_CONFIG[status]
          const g   = groups[status]
          return (
            <Link key={status} to={`/plans?status=${status}`} style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--card-bg)', border: `1px solid ${cfg.border}`,
                borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)',
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'var(--shadow)' }}
              >
                <div style={{ background: cfg.bg, padding: '10px 14px',
                  borderBottom: `1px solid ${cfg.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
                    letterSpacing: '0.07em', color: cfg.text }}>
                    {cfg.label}
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: cfg.accent, lineHeight: 1 }}>
                    {isLoading ? '—' : g.count}
                  </div>
                </div>
                <div style={{ padding: '10px 14px' }}>
                  <div style={{ fontSize: 10, color: 'var(--gray-400)', marginBottom: 2 }}>Total value</div>
                  <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em',
                    color: isLoading || g.total === 0 ? 'var(--gray-300)' : 'var(--gray-800)' }}>
                    {isLoading ? '—' : currency(g.total)}
                  </div>
                  {g.count > 0 && g.total > 0 && (
                    <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 2 }}>
                      avg {currency(g.total / g.count)}
                    </div>
                  )}
                </div>
              </div>
            </Link>
          )
        })}
      </div>

      {/* ── Pipeline lists ───────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {['proposed', 'contracted'].map(status => {
          const cfg   = STATUS_CONFIG[status]
          const group = groups[status]
          return (
            <div key={status} className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '12px 18px', background: cfg.bg,
                borderBottom: `1px solid ${cfg.border}`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: cfg.text }}>{cfg.label}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: cfg.accent }}>
                  {currencyFull(group.total)}
                </div>
              </div>
              <div style={{ padding: '6px 0' }}>
                {group.plans.length === 0 ? (
                  <div style={{ padding: '14px 18px', fontSize: 13, color: 'var(--gray-400)' }}>
                    No {status} plans{range !== 'all' ? ' in this period' : ''}
                  </div>
                ) : (
                  group.plans.slice(0, 5).map(p => (
                    <Link key={p.id} to={`/plans/${p.id}`}
                      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '7px 18px', textDecoration: 'none', color: 'var(--gray-800)',
                        borderBottom: '1px solid var(--gray-100)', transition: 'background 0.1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--blue-mid)' }}>
                          {p.plan_number}
                        </span>
                        <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 8 }}>
                          {p.builder_name}
                        </span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>
                          {p.total_bid > 0 ? currency(p.total_bid) : '—'}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--gray-400)' }}>
                          {timeAgo(p.created_at)}
                        </div>
                      </div>
                    </Link>
                  ))
                )}
                {group.plans.length > 5 && (
                  <div style={{ padding: '8px 18px' }}>
                    <Link to={`/plans?status=${status}`} style={{ fontSize: 12, color: 'var(--blue-mid)' }}>
                      +{group.plans.length - 5} more →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Recent plans table ───────────────────────────── */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--gray-100)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {range === 'all' ? 'Last 10 plans' : `Plans — ${rangeLabel}`}
          </div>
          <Link to="/plans" style={{ fontSize: 13, color: 'var(--blue-mid)' }}>View all →</Link>
        </div>

        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><span className="spinner" /></div>
        ) : recent.length === 0 ? (
          <div className="empty-state">
            <p>No plans {range !== 'all' ? 'in this period' : 'yet'}.</p>
            {range === 'all' && (
              <Link to="/plans/new">
                <button className="btn-primary btn-sm" style={{ marginTop: 12 }}>Create your first plan</button>
              </Link>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{ paddingLeft: 20 }}>Plan #</th>
                <th>Builder</th>
                <th>Project</th>
                <th>House type</th>
                <th style={{ textAlign: 'right' }}>Total bid</th>
                <th style={{ textAlign: 'center' }}>Status</th>
                <th style={{ textAlign: 'right', paddingRight: 20 }}>Created</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(p => {
                const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft
                return (
                  <tr key={p.id}>
                    <td style={{ paddingLeft: 20 }}>
                      <Link to={`/plans/${p.id}`} style={{ fontWeight: 600, color: 'var(--blue-mid)' }}>
                        {p.plan_number}
                      </Link>
                    </td>
                    <td style={{ fontSize: 13 }}>{p.builder_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{p.project_name}</td>
                    <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{p.house_type || '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13 }}>
                      {p.total_bid > 0 ? currencyFull(p.total_bid) : '—'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 99,
                        fontWeight: 500, background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}` }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', paddingRight: 20, fontSize: 13, color: 'var(--gray-400)' }}>
                      {timeAgo(p.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
    </div>
  )
}
