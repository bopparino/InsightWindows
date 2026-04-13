import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const THEMES = [
  // ── 1. Pearl — soft light, easy on the eyes ──────────────────
  {
    id:    'pearl',
    label: 'Pearl',
    description: 'Soft off-white, easy on the eyes',
    chartColors: {
      primary:   '#2563eb',
      secondary: '#059669',
      bar:       '#3b82f6',
      donut: {
        draft:      '#94a3b8',
        proposed:   '#d97706',
        contracted: '#059669',
        complete:   '#2563eb',
        lost:       '#dc2626',
      },
      estimators: ['#2563eb','#059669','#7c3aed','#d97706','#0891b2','#dc2626','#64748b','#0f172a'],
    },
    preview: {
      bg:      '#f8fafc',
      card:    '#ffffff',
      accent:  '#2563eb',
      text:    '#1e293b',
      border:  '#e2e8f0',
      sidebar: '#1e293b',
    },
  },

  // ── 2. Graphite — dark neutral, not AMOLED ───────────────────
  {
    id:    'graphite',
    label: 'Graphite',
    description: 'Dark neutral, easy night reading',
    chartColors: {
      primary:   '#60a5fa',
      secondary: '#34d399',
      bar:       '#818cf8',
      donut: {
        draft:      '#71717a',
        proposed:   '#fbbf24',
        contracted: '#34d399',
        complete:   '#60a5fa',
        lost:       '#f87171',
      },
      estimators: ['#60a5fa','#34d399','#a78bfa','#fbbf24','#38bdf8','#f87171','#a1a1aa','#e4e4e7'],
    },
    preview: {
      bg:      '#18181b',
      card:    '#27272a',
      accent:  '#60a5fa',
      text:    '#fafafa',
      border:  '#3f3f46',
      sidebar: '#09090b',
    },
  },

  // ── 3. Metcalfe — brand navy & red ───────────────────────────
  {
    id:    'metcalfe',
    label: 'Metcalfe',
    description: 'Navy & red brand colors',
    chartColors: {
      primary:   '#0c1653',
      secondary: '#1a7a3a',
      bar:       '#1e2d80',
      donut: {
        draft:      '#9cadd0',
        proposed:   '#c07800',
        contracted: '#1a7a3a',
        complete:   '#0c1653',
        lost:       '#dc1005',
      },
      estimators: ['#0c1653','#1a7a3a','#1e2d80','#dc1005','#3a5aaa','#2a8a4a','#6882b0','#9a2010'],
    },
    preview: {
      bg:      '#f4f6fc',
      card:    '#ffffff',
      accent:  '#0c1653',
      text:    '#0c1653',
      border:  '#cdd4e8',
      sidebar: '#0c1653',
    },
  },

  // ── 4. Emerald — fresh green, thematic for bids/contracts ────
  {
    id:    'emerald',
    label: 'Emerald',
    description: 'Fresh green, energetic',
    chartColors: {
      primary:   '#059669',
      secondary: '#0891b2',
      bar:       '#10b981',
      donut: {
        draft:      '#9dd4b3',
        proposed:   '#d97706',
        contracted: '#059669',
        complete:   '#064e3b',
        lost:       '#dc2626',
      },
      estimators: ['#059669','#064e3b','#0891b2','#d97706','#10b981','#6ee7b7','#065f46','#a7f3d0'],
    },
    preview: {
      bg:      '#f0fdf4',
      card:    '#ffffff',
      accent:  '#059669',
      text:    '#14532d',
      border:  '#a7f3d0',
      sidebar: '#064e3b',
    },
  },

  // ── 5. Indigo — modern SaaS, precise and clean ───────────────
  {
    id:    'indigo',
    label: 'Indigo',
    description: 'Modern SaaS, precise and clean',
    chartColors: {
      primary:   '#4f46e5',
      secondary: '#0891b2',
      bar:       '#6366f1',
      donut: {
        draft:      '#a5b4fc',
        proposed:   '#d97706',
        contracted: '#059669',
        complete:   '#4f46e5',
        lost:       '#dc2626',
      },
      estimators: ['#4f46e5','#6366f1','#7c3aed','#0891b2','#059669','#d97706','#818cf8','#1e1b4b'],
    },
    preview: {
      bg:      '#eef2ff',
      card:    '#ffffff',
      accent:  '#4f46e5',
      text:    '#1e1b4b',
      border:  '#c7d2fe',
      sidebar: '#1e1b4b',
    },
  },

  // ── 6. Nordic Frost — glass-inspired, cool high-tech ─────────
  {
    id:    'nordic',
    label: 'Nordic Frost',
    description: 'Glass-inspired, cool and professional',
    chartColors: {
      primary:   '#38bdf8',
      secondary: '#818cf8',
      bar:       '#0ea5e9',
      donut: {
        draft:      '#94a3b8',
        proposed:   '#fbbf24',
        contracted: '#2dd4bf',
        complete:   '#38bdf8',
        lost:       '#f43f5e',
      },
      estimators: ['#38bdf8','#818cf8','#2dd4bf','#fbbf24','#f43f5e','#a78bfa','#6ee7b7','#93c5fd'],
    },
    preview: {
      bg:      '#0f172a',
      card:    '#1e293b',
      accent:  '#38bdf8',
      text:    '#f1f5f9',
      border:  'rgba(255,255,255,0.08)',
      sidebar: '#020617',
    },
  },

  // ── 7. Slate & Sulfur — fintech high-contrast ─────────────────
  {
    id:    'fintech',
    label: 'Slate & Sulfur',
    description: 'High-contrast fintech aesthetic',
    chartColors: {
      primary:   '#000000',
      secondary: '#10b981',
      bar:       '#18181b',
      donut: {
        draft:      '#e4e4e7',
        proposed:   '#facc15',
        contracted: '#10b981',
        complete:   '#000000',
        lost:       '#ef4444',
      },
      estimators: ['#18181b','#10b981','#facc15','#6366f1','#ec4899','#0ea5e9','#8b5cf6','#71717a'],
    },
    preview: {
      bg:      '#f4f4f5',
      card:    '#ffffff',
      accent:  '#18181b',
      text:    '#18181b',
      border:  '#e4e4e7',
      sidebar: '#18181b',
    },
  },

  // ── 8. Clay & Rose — warm earthy, human ──────────────────────
  {
    id:    'clay',
    label: 'Clay & Rose',
    description: 'Warm tones for a human touch',
    chartColors: {
      primary:   '#e11d48',
      secondary: '#44403c',
      bar:       '#fb7185',
      donut: {
        draft:      '#d6d3d1',
        proposed:   '#d97706',
        contracted: '#166534',
        complete:   '#e11d48',
        lost:       '#7f1d1d',
      },
      estimators: ['#e11d48','#44403c','#d97706','#166534','#a8a29e','#be123c','#92400e','#78716c'],
    },
    preview: {
      bg:      '#fafaf9',
      card:    '#ffffff',
      accent:  '#e11d48',
      text:    '#1c1917',
      border:  '#e7e5e4',
      sidebar: '#1c1917',
    },
  },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    const valid = THEMES.map(t => t.id)
    return valid.includes(saved) ? saved : 'pearl'
  })

  useEffect(() => {
    const el = document.documentElement
    el.classList.remove(...THEMES.map(t => `theme-${t.id}`),
      // Remove any legacy theme classes
      'theme-mono', 'theme-warm', 'theme-dark', 'theme-sunstone', 'theme-arcadia',
      'theme-midnight', 'theme-ashen', 'theme-eldenring', 'theme-industrial',
      'theme-harmony', 'theme-dusk')
    el.classList.add(`theme-${theme}`)
  }, [theme])

  function applyTheme(t) {
    setTheme(t)
    localStorage.setItem('theme', t)
  }

  return (
    <ThemeContext.Provider value={{ theme, applyTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
