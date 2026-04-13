import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const THEMES = [
  // ── 1. The Blueprint — crisp, technical, high-contrast white ──
  {
    id:    'blueprint',
    label: 'The Blueprint',
    description: 'Clean, technical, high-contrast white',
    chartColors: {
      primary:   '#0369a1',
      secondary: '#0f172a',
      bar:       '#0ea5e9',
      donut: {
        draft:      '#94a3b8',
        proposed:   '#0369a1',
        contracted: '#15803d',
        complete:   '#1e293b',
        lost:       '#b91c1c',
      },
      estimators: ['#0369a1','#15803d','#0f172a','#0ea5e9','#64748b','#b91c1c','#0891b2','#475569'],
    },
    preview: {
      bg:      '#ffffff',
      card:    '#f8fafc',
      accent:  '#0369a1',
      text:    '#0f172a',
      border:  '#cbd5e1',
      sidebar: '#0f172a',
    },
  },

  // ── 2. Slate & Sulfur — fintech high-contrast ─────────────────
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

  // ── 3. Clay & Rose — warm earthy, human ───────────────────────
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

  // ── 4. Heritage Ledger — traditional green and cream ──────────
  {
    id:    'heritage',
    label: 'Heritage Ledger',
    description: 'Stable, traditional green and cream',
    chartColors: {
      primary:   '#14532d',
      secondary: '#78350f',
      bar:       '#166534',
      donut: {
        draft:      '#a1a1aa',
        proposed:   '#ca8a04',
        contracted: '#14532d',
        complete:   '#1e293b',
        lost:       '#991b1b',
      },
      estimators: ['#14532d','#78350f','#ca8a04','#1e293b','#991b1b','#166534','#92400e','#6b7280'],
    },
    preview: {
      bg:      '#fdfbf7',
      card:    '#ffffff',
      accent:  '#14532d',
      text:    '#064e3b',
      border:  '#d1d5db',
      sidebar: '#064e3b',
    },
  },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    const valid = THEMES.map(t => t.id)
    // Migrate old themes to blueprint default
    return valid.includes(saved) ? saved : 'blueprint'
  })

  useEffect(() => {
    const el = document.documentElement
    el.classList.remove(...THEMES.map(t => `theme-${t.id}`),
      // Remove any legacy theme classes
      'theme-pearl', 'theme-graphite', 'theme-metcalfe', 'theme-emerald',
      'theme-indigo', 'theme-nordic', 'theme-obsidian',
      'theme-mono', 'theme-warm', 'theme-dark',
      'theme-sunstone', 'theme-arcadia', 'theme-midnight', 'theme-ashen',
      'theme-eldenring', 'theme-industrial', 'theme-harmony', 'theme-dusk')
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
