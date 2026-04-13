import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, Tooltip, Legend,
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
  draft:      { label: 'DRAFT',      bg: 'var(--status-draft-bg)',      border: 'var(--status-draft-border)',      text: 'var(--status-draft-text)',      accent: 'var(--status-draft-accent)' },
  proposed:   { label: 'PROPOSED',   bg: 'var(--status-proposed-bg)',   border: 'var(--status-proposed-border)',   text: 'var(--status-proposed-text)',   accent: 'var(--status-proposed-accent)' },
  contracted: { label: 'CONTRACTED', bg: 'var(--status-contracted-bg)', border: 'var(--status-contracted-border)', text: 'var(--status-contracted-text)', accent: 'var(--status-contracted-accent)' },
  complete:   { label: 'COMPLETE',   bg: 'var(--status-complete-bg)',   border: 'var(--status-complete-border)',   text: 'var(--status-complete-text)',   accent: 'var(--status-complete-accent)' },
  lost:       { label: 'LOST',       bg: 'var(--status-lost-bg)',       border: 'var(--status-lost-border)',       text: 'var(--status-lost-text)',       accent: 'var(--status-lost-accent)' },
}

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

// ── Custom tooltips ──────────────────────────────────────────

function ChartTooltip({ active, payload, label, suffix = 'K' }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 10, padding: '12px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1), 0 2px 6px rgba(0,0,0,0.04)',
      fontSize: 12, backdropFilter: 'blur(8px)',
    }}>
      <div style={{ fontWeight: 600, color: 'var(--gray-900)', marginBottom: 8,
        fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: entry.color, display: 'inline-block', flexShrink: 0 }} />
          <span style={{ color: 'var(--gray-400)', fontSize: 11 }}>{entry.name}</span>
          <span style={{ fontWeight: 700, color: 'var(--gray-900)', marginLeft: 'auto',
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
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
      background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)',
      borderRadius: 10, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
      fontSize: 12,
    }}>
      <span style={{ fontWeight: 600, color: 'var(--gray-900)' }}>{name}:</span>{' '}
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>{value}</span>
      <span style={{ color: 'var(--gray-400)' }}> plans</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function Dashboard() {
  const [range, setRange] = useState('all')
  const { theme } = useTheme()
  const themeInfo  = THEMES.find(t => t.id === theme)
  const C = themeInfo?.chartColors || { primary: '#FF8C00', secondary: '#10B981', bar: '#FFB347' }
  const DONUT_COLORS = C.donut || DEFAULT_DONUT_COLORS

  const { data = [], isLoading, isError } = useQuery({
    queryKey: ['plans'],
    queryFn: () => plans.list(),
    refetchOnWindowFocus: true,
  })

  const MONTHS = useMemo(() => lastNMonths(18), [])

  const [from, to]   = getDateBounds(range)
  const filtered     = applyBounds(data, from, to)
  const [pFrom, pTo] = getPriorBounds(range)
  const prior        = pFrom ? applyBounds(data, pFrom, pTo) : null

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

  const openPipeline   = groups.proposed.plans.reduce((s, p) => s + (p.total_bid || 0), 0)
  const securedRevenue = [...groups.contracted.plans, ...groups.complete.plans]
                           .reduce((s, p) => s + (p.total_bid || 0), 0)
  const biddedCount    = groups.proposed.count + groups.contracted.count + groups.complete.count + groups.lost.count
  const wonCount       = groups.contracted.count + groups.complete.count
  const winRate        = biddedCount > 0 ? (wonCount / biddedCount) * 100 : null
  const avgBidValue    = biddedCount > 0
    ? (openPipeline + securedRevenue + groups.lost.plans.reduce((s, p) => s + (p.total_bid || 0), 0)) / biddedCount
    : 0

  const priorOpenPipeline = prior ? (priorGroups?.proposed?.total || 0) : null
  const priorSecured  = prior ? [...(priorGroups.contracted.plans || []), ...(priorGroups.complete?.plans || [])]
                          .reduce((s, p) => s + (p.total_bid || 0), 0) : null
  const priorBidded   = prior ? (priorGroups.proposed.count + priorGroups.contracted.count + priorGroups.complete.count + priorGroups.lost.count) : null
  const priorWon      = prior ? (priorGroups.contracted.count + priorGroups.complete.count) : null
  const priorWinRate  = priorBidded > 0 ? (priorWon / priorBidded) * 100 : null
  const priorAvg      = priorBidded > 0
    ? ((priorGroups?.proposed?.total || 0) + (priorSecured || 0) + (priorGroups?.lost?.total || 0)) / priorBidded
    : null

  const trendData   = useMemo(() => buildTrendData(data, MONTHS), [data, MONTHS])
  const donutData   = useMemo(() => buildDonutData(groups, DONUT_COLORS), [filtered, DONUT_COLORS])
  const builderData = useMemo(() => buildBuilderData(filtered), [filtered])

  const recent = [...filtered]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 10)

  const rangeLabel = DATE_RANGES.find(r => r.id === range)?.label
  const showDelta  = range !== 'all'

  const mono = "'JetBrains Mono', 'SF Mono', monospace"

  // ── Metric card component ──────────────────────────────────
  function Metric({ label, value, sub, delta, accent }) {
    return (
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 12,
        padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 6,
        minWidth: 0,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
          letterSpacing: '0.1em', color: 'var(--gray-400)',
        }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <div style={{
            fontSize: 26, fontWeight: 700,
            fontFamily: mono,
            letterSpacing: '-0.03em', lineHeight: 1,
            color: accent ? 'var(--success)' : 'var(--gray-900)',
          }}>{value}</div>
          {delta !== null && (
            <span style={{
              fontSize: 11, fontWeight: 700,
              fontFamily: mono,
              color: delta >= 0 ? 'var(--success)' : 'var(--danger)',
              background: delta >= 0 ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
              padding: '2px 6px', borderRadius: 4,
            }}>
              {delta >= 0 ? '+' : ''}{Math.abs(delta).toFixed(1)}%
            </span>
          )}
        </div>
        <div style={{ fontSize: 11, color: 'var(--gray-400)', letterSpacing: '0.01em' }}>{sub}</div>
      </div>
    )
  }

  // ── Render ─────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── Header ──────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{
            fontSize: 28, fontWeight: 700, color: 'var(--gray-900)',
            letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6,
          }}>Dashboard</h1>
          <div style={{ fontSize: 12, color: 'var(--gray-400)', letterSpacing: '0.02em' }}>
            {isLoading ? 'Loading...' : `${filtered.length} plan${filtered.length !== 1 ? 's' : ''} \u00b7 ${rangeLabel}`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{
            display: 'inline-flex', background: 'var(--card-bg)',
            border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 10, padding: 3, gap: 2,
          }}>
            {DATE_RANGES.map(r => (
              <button key={r.id} onClick={() => setRange(r.id)} style={{
                padding: '6px 14px', fontSize: 11, fontWeight: range === r.id ? 600 : 400,
                borderRadius: 8, border: 'none', cursor: 'pointer',
                background: range === r.id ? 'var(--gray-900)' : 'transparent',
                color: range === r.id ? '#FFFFFF' : 'var(--gray-400)',
                transition: 'all 0.15s', letterSpacing: '0.01em',
              }}>
                {r.label}
              </button>
            ))}
          </div>
          <Link to="/plans/new">
            <button className="btn-primary" style={{ padding: '8px 20px' }}>+ New Plan</button>
          </Link>
        </div>
      </div>

      {isError && (
        <div className="error-msg">Could not load plan data. Check that the server is running.</div>
      )}

      {/* ── Loading skeleton ────────────────────────────────── */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[...Array(4)].map((_, i) => (
            <div key={i} style={{
              background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)',
              borderRadius: 12, padding: '20px 22px',
            }}>
              <div style={{ height: 8, width: 60, background: 'var(--gray-100)', borderRadius: 4, marginBottom: 14 }} />
              <div style={{ height: 22, width: 90, background: 'var(--gray-100)', borderRadius: 4, marginBottom: 8 }} />
              <div style={{ height: 6, width: 70, background: 'var(--gray-100)', borderRadius: 4 }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Metric cards — 4-column bento grid ──────────────── */}
      {!isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          <Metric
            label="Open Pipeline"
            value={currency(openPipeline)}
            sub={`${groups.proposed.count} proposed`}
            delta={showDelta ? computeDelta(openPipeline, priorOpenPipeline) : null}
          />
          <Metric
            label="Secured Revenue"
            value={currency(securedRevenue)}
            sub={`${wonCount} contracted / complete`}
            delta={showDelta ? computeDelta(securedRevenue, priorSecured) : null}
            accent
          />
          <Metric
            label="Win Rate"
            value={winRate === null ? '—' : pct(winRate)}
            sub="Won vs. all bids sent"
            delta={showDelta && winRate !== null && priorWinRate !== null ? computeDelta(winRate, priorWinRate) : null}
          />
          <Metric
            label="Avg Bid Value"
            value={avgBidValue === 0 ? '—' : currency(avgBidValue)}
            sub="Per plan in period"
            delta={showDelta ? computeDelta(avgBidValue, priorAvg) : null}
          />
        </div>
      )}

      {/* ── Charts — 2/3 + 1/3 bento row ────────────────────── */}
      {!isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

          {/* Gradient area chart */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 12, overflow: 'hidden',
          }}>
            <div style={{
              padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              borderBottom: '1px solid rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>Revenue Trend</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--gray-400)' }}>18 months / $K</div>
            </div>
            <div style={{ padding: '16px 12px 12px 0' }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBids" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.primary} stopOpacity={0.15} />
                      <stop offset="100%" stopColor={C.primary} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradSecured" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={C.secondary} stopOpacity={0.12} />
                      <stop offset="100%" stopColor={C.secondary} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                    tickLine={false} axisLine={false} interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => `$${v}K`} width={50}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: 11, paddingTop: 12 }} />
                  <Area
                    type="monotone" dataKey="New Bids"
                    stroke={C.primary} strokeWidth={2}
                    fill="url(#gradBids)"
                    dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                  <Area
                    type="monotone" dataKey="Secured"
                    stroke={C.secondary} strokeWidth={2}
                    fill="url(#gradSecured)"
                    dot={false} activeDot={{ r: 5, strokeWidth: 2, stroke: '#fff' }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Donut chart */}
          <div style={{
            background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)',
            borderRadius: 12, overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              padding: '16px 22px', borderBottom: '1px solid rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>Status Mix</div>
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                textTransform: 'uppercase', color: 'var(--gray-400)', marginTop: 2 }}>{rangeLabel}</div>
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '8px 0' }}>
              {filtered.length === 0 ? (
                <div style={{ color: 'var(--gray-400)', fontSize: 12 }}>No data</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={150}>
                    <PieChart>
                      <Pie
                        data={donutData} dataKey="value"
                        cx="50%" cy="50%"
                        innerRadius={42} outerRadius={65}
                        paddingAngle={3} strokeWidth={0}
                      >
                        {donutData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<DonutTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', padding: '8px 22px 16px' }}>
                    {donutData.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }} />
                          <span style={{ color: 'var(--gray-600)', fontSize: 12 }}>{d.name}</span>
                        </div>
                        <span style={{ fontWeight: 600, fontFamily: mono, fontSize: 12, color: 'var(--gray-900)' }}>
                          {d.value}
                          <span style={{ fontWeight: 400, color: 'var(--gray-400)', marginLeft: 4, fontSize: 10 }}>
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
      )}

      {/* ── Builder chart — full width bento ─────────────────── */}
      {!isLoading && builderData.length > 0 && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>Top Builders by Bid Value</div>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: 'var(--gray-400)' }}>{rangeLabel} / $K</div>
          </div>
          <div style={{ padding: '16px 12px 12px 0' }}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={builderData} margin={{ top: 4, right: 16, left: 0, bottom: 40 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                  tickLine={false} axisLine={false}
                  angle={-35} textAnchor="end" interval={0}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: 'var(--gray-400)' }}
                  tickLine={false} axisLine={false}
                  tickFormatter={v => `$${v}K`} width={50}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="value" name="Bid Value" radius={[4, 4, 0, 0]}>
                  {builderData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? C.primary : i < 3 ? C.bar : 'var(--gray-300)'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Status pipeline — 5-column bento grid ────────────── */}
      {!isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {statuses.map(status => {
            const cfg = STATUS_CONFIG[status]
            const g   = groups[status]
            return (
              <Link key={status} to={`/plans?status=${status}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--card-bg)',
                  border: '1px solid rgba(0,0,0,0.06)',
                  borderRadius: 12, overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  cursor: 'pointer',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)' }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
                >
                  {/* Header strip */}
                  <div style={{
                    padding: '10px 16px', background: cfg.bg,
                    borderBottom: `1px solid ${cfg.border}`,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
                      color: cfg.text,
                    }}>{cfg.label}</div>
                    <div style={{
                      fontSize: 20, fontWeight: 700, fontFamily: mono,
                      color: cfg.accent, lineHeight: 1,
                    }}>{g.count}</div>
                  </div>
                  {/* Body */}
                  <div style={{ padding: '12px 16px' }}>
                    <div style={{
                      fontSize: 14, fontWeight: 700, fontFamily: mono,
                      letterSpacing: '-0.02em',
                      color: g.total === 0 ? 'var(--gray-300)' : 'var(--gray-900)',
                    }}>
                      {currency(g.total)}
                    </div>
                    {g.count > 0 && g.total > 0 && (
                      <div style={{ fontSize: 10, color: 'var(--gray-400)', marginTop: 3 }}>
                        avg {currency(g.total / g.count)}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* ── Pipeline lists — 2-column bento ──────────────────── */}
      {!isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {['proposed', 'contracted'].map(status => {
            const cfg   = STATUS_CONFIG[status]
            const group = groups[status]
            return (
              <div key={status} style={{
                background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)',
                borderRadius: 12, overflow: 'hidden',
              }}>
                <div style={{
                  padding: '14px 20px', background: cfg.bg,
                  borderBottom: `1px solid ${cfg.border}`,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: cfg.text }}>{cfg.label.charAt(0) + cfg.label.slice(1).toLowerCase()}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: mono, color: cfg.accent }}>
                    {currencyFull(group.total)}
                  </div>
                </div>
                <div style={{ padding: '4px 0' }}>
                  {group.plans.length === 0 ? (
                    <div style={{ padding: '16px 20px', fontSize: 12, color: 'var(--gray-400)' }}>
                      No {status} plans{range !== 'all' ? ' in this period' : ''}
                    </div>
                  ) : (
                    group.plans.slice(0, 5).map(p => (
                      <Link key={p.id} to={`/plans/${p.id}`}
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '10px 20px', textDecoration: 'none', color: 'var(--gray-800)',
                          borderBottom: '1px solid rgba(0,0,0,0.03)', transition: 'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--gray-50)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        <div>
                          <span style={{ fontWeight: 600, fontSize: 13, fontFamily: mono, color: 'var(--accent)' }}>
                            {p.plan_number}
                          </span>
                          <span style={{ fontSize: 12, color: 'var(--gray-400)', marginLeft: 10 }}>
                            {p.builder_name}
                          </span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, fontFamily: mono }}>
                            {p.total_bid > 0 ? currency(p.total_bid) : '—'}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--gray-400)' }}>
                            {timeAgo(p.created_at)}
                          </div>
                        </div>
                      </Link>
                    ))
                  )}
                  {group.plans.length > 5 && (
                    <div style={{ padding: '10px 20px' }}>
                      <Link to={`/plans?status=${status}`} style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)' }}>
                        +{group.plans.length - 5} more
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Recent plans table — full width bento ────────────── */}
      {!isLoading && (
        <div style={{
          background: 'var(--card-bg)', border: '1px solid rgba(0,0,0,0.06)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderBottom: '1px solid rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--gray-900)' }}>
              {range === 'all' ? 'Recent Plans' : `Plans \u2014 ${rangeLabel}`}
            </div>
            <Link to="/plans" style={{ fontSize: 11, fontWeight: 600, color: 'var(--accent)', letterSpacing: '0.02em' }}>
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
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
                  <th style={{ paddingLeft: 22 }}>Plan #</th>
                  <th>Builder</th>
                  <th>Project</th>
                  <th>House Type</th>
                  <th style={{ textAlign: 'right' }}>Total Bid</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right', paddingRight: 22 }}>Created</th>
                </tr>
              </thead>
              <tbody>
                {recent.map(p => {
                  const cfg = STATUS_CONFIG[p.status] || STATUS_CONFIG.draft
                  return (
                    <tr key={p.id}>
                      <td style={{ paddingLeft: 22 }}>
                        <Link to={`/plans/${p.id}`} style={{ fontWeight: 600, fontFamily: mono, color: 'var(--accent)', fontSize: 13 }}>
                          {p.plan_number}
                        </Link>
                      </td>
                      <td style={{ fontSize: 13, color: 'var(--gray-800)' }}>{p.builder_name}</td>
                      <td style={{ fontSize: 13, color: 'var(--gray-600)' }}>{p.project_name}</td>
                      <td style={{ fontSize: 13, color: 'var(--gray-400)' }}>{p.house_type || '—'}</td>
                      <td style={{ textAlign: 'right', fontWeight: 600, fontSize: 13, fontFamily: mono }}>
                        {p.total_bid > 0 ? currencyFull(p.total_bid) : '—'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontSize: 10, fontWeight: 600, letterSpacing: '0.04em',
                          padding: '3px 10px', borderRadius: 6,
                          background: cfg.bg, color: cfg.text, border: `1px solid ${cfg.border}`,
                        }}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', paddingRight: 22, fontSize: 12, color: 'var(--gray-400)' }}>
                        {timeAgo(p.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
