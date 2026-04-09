/**
 * PriceBook — read-only reference view of all kit pricing.
 *
 * Shows all categories A–W with every variant's bid price, per-foot rate,
 * and component count. Filterable by name. No editing — use Kit Pricing for that.
 */
import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { kit } from '../api/client'

function fmt(n) { return n > 0 ? `$${Number(n).toFixed(2)}` : '—' }

const CATEGORY_GROUPS = [
  { label: 'Ductwork',    codes: ['A','B'] },
  { label: 'Venting',     codes: ['C','D','E','F','G'] },
  { label: 'Mechanical',  codes: ['H','I','J','K','L'] },
  { label: 'IAQ',         codes: ['M','N','O','V','W'] },
  { label: 'Fresh Air',   codes: ['R'] },
  { label: 'Accessories', codes: ['P','Q','S','T','U'] },
]

export default function PriceBook() {
  const [search, setSearch] = useState('')

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['kit-variants'],
    queryFn:  kit.variants,
  })

  // Filter categories/variants by search term
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return categories
    return categories
      .map(cat => ({
        ...cat,
        variants: cat.variants.filter(v =>
          v.variant_name.toLowerCase().includes(q) ||
          v.variant_code.toLowerCase().includes(q) ||
          cat.name.toLowerCase().includes(q)
        ),
      }))
      .filter(cat => cat.variants.length > 0)
  }, [categories, search])

  const totalVariants = categories.reduce((s, c) => s + c.variants.length, 0)
  const filteredVariants = filtered.reduce((s, c) => s + c.variants.length, 0)

  const TH = ({ children, right, w }) => (
    <th style={{
      padding: '6px 10px',
      textAlign: right ? 'right' : 'left',
      fontSize: 10, fontWeight: 700, textTransform: 'uppercase',
      letterSpacing: '0.06em', color: 'var(--gray-400)',
      background: 'var(--gray-50)', borderBottom: '1px solid var(--gray-200)',
      whiteSpace: 'nowrap', width: w,
    }}>{children}</th>
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Price Book</h1>
          <div style={{ fontSize: 13, color: 'var(--gray-400)', marginTop: 2 }}>
            {isLoading ? 'Loading…' : `${categories.length} categories · ${totalVariants} variants`}
            {search && ` · ${filteredVariants} matching`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input
            type="search"
            placeholder="Filter by name or code…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: 240, fontSize: 13, padding: '6px 10px' }}
          />
        </div>
      </div>

      {isLoading && <div style={{ textAlign: 'center', padding: 60 }}><span className="spinner" /></div>}

      {!isLoading && CATEGORY_GROUPS.map(group => {
        const groupCats = filtered.filter(c => group.codes.includes(c.code))
        if (groupCats.length === 0) return null

        return (
          <div key={group.label} style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--gray-400)',
              marginBottom: 8, paddingBottom: 4,
              borderBottom: '1px solid var(--gray-100)',
            }}>
              {group.label}
            </div>

            {groupCats.map(cat => (
              <div key={cat.code} className="card" style={{ marginBottom: 8, padding: 0, overflow: 'hidden' }}>
                {/* Category header */}
                <div style={{
                  padding: '8px 14px',
                  background: 'var(--gray-50)',
                  borderBottom: '1px solid var(--gray-200)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: 24, height: 24, borderRadius: 5,
                    background: 'var(--blue)', color: 'white',
                    fontSize: 11, fontWeight: 700, flexShrink: 0,
                  }}>{cat.code}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--gray-800)' }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--gray-400)' }}>
                    {cat.variants.length} variant{cat.variants.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Variants table */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>
                      <TH w={100}>Code</TH>
                      <TH>Description</TH>
                      <TH right w={110}>Bid Price</TH>
                      <TH right w={110}>Per Foot</TH>
                      <TH right w={80}>Parts</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {cat.variants.map((v, idx) => (
                      <tr key={v.id} style={{
                        borderBottom: idx < cat.variants.length - 1 ? '1px solid var(--gray-100)' : 'none',
                      }}>
                        <td style={{ padding: '7px 10px', fontFamily: 'monospace', fontSize: 11, color: 'var(--gray-500)' }}>
                          {v.variant_code}
                        </td>
                        <td style={{ padding: '7px 10px', color: 'var(--gray-800)' }}>
                          {v.variant_name}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--gray-900)' }}>
                          {fmt(v.per_kit)}
                          {v.per_foot > 0 && (
                            <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--gray-400)', marginLeft: 2 }}>kit</span>
                          )}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: v.per_foot > 0 ? 'var(--gray-700)' : 'var(--gray-300)' }}>
                          {v.per_foot > 0 ? `$${v.per_foot.toFixed(2)}/ft` : '—'}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'right', color: 'var(--gray-400)', fontSize: 12 }}>
                          {v.component_count != null
                            ? (v.component_count > 0 ? v.component_count : <span style={{ color: 'var(--gray-200)' }}>—</span>)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )
      })}

      {!isLoading && filtered.length === 0 && (
        <div className="empty-state">
          <p>No variants match "{search}"</p>
        </div>
      )}
    </div>
  )
}
