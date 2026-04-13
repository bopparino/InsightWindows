import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const THEMES = [
  // ── 1. Amber Alabaster — Solar Industrial default ─────────
  {
    id:    'amber',
    label: 'Amber Alabaster',
    description: 'Warm paper tones with safety-orange accents',
    chartColors: {
      primary:   '#FF8C00',
      secondary: '#1A1A1A',
      bar:       '#FFB347',
      donut: {
        draft:      '#D6D3D1',
        proposed:   '#FF8C00',
        contracted: '#10B981',
        complete:   '#1A1A1A',
        lost:       '#EF4444',
      },
      estimators: ['#FF8C00','#1A1A1A','#10B981','#FFB347','#EF4444','#6366F1','#0EA5E9','#A8A29E'],
    },
    preview: {
      bg:      '#F9F9F8',
      card:    '#FFFFFF',
      accent:  '#FF8C00',
      text:    '#1A1A1A',
      border:  '#E7E5E4',
      sidebar: '#1A1A1A',
    },
  },

  // ── 2. Slate & Sulfur — monochrome fintech ────────────────
  {
    id:    'fintech',
    label: 'Slate & Sulfur',
    description: 'High-contrast monochrome precision',
    chartColors: {
      primary:   '#18181B',
      secondary: '#10B981',
      bar:       '#18181B',
      donut: {
        draft:      '#E4E4E7',
        proposed:   '#FACC15',
        contracted: '#10B981',
        complete:   '#18181B',
        lost:       '#EF4444',
      },
      estimators: ['#18181B','#10B981','#FACC15','#6366F1','#EC4899','#0EA5E9','#8B5CF6','#71717A'],
    },
    preview: {
      bg:      '#F4F4F5',
      card:    '#FFFFFF',
      accent:  '#18181B',
      text:    '#18181B',
      border:  '#E4E4E7',
      sidebar: '#18181B',
    },
  },

  // ── 3. Clay & Rose — warm editorial ───────────────────────
  {
    id:    'clay',
    label: 'Clay & Rose',
    description: 'Warm tones for a human touch',
    chartColors: {
      primary:   '#E11D48',
      secondary: '#44403C',
      bar:       '#FB7185',
      donut: {
        draft:      '#D6D3D1',
        proposed:   '#D97706',
        contracted: '#166534',
        complete:   '#E11D48',
        lost:       '#7F1D1D',
      },
      estimators: ['#E11D48','#44403C','#D97706','#166534','#A8A29E','#BE123C','#92400E','#78716C'],
    },
    preview: {
      bg:      '#FAF9F7',
      card:    '#FFFFFF',
      accent:  '#E11D48',
      text:    '#1C1917',
      border:  '#E7E5E4',
      sidebar: '#1C1917',
    },
  },

  // ── 4. Heritage Ledger — traditional green & cream ────────
  {
    id:    'heritage',
    label: 'Heritage Ledger',
    description: 'Traditional green and cream',
    chartColors: {
      primary:   '#14532D',
      secondary: '#78350F',
      bar:       '#166534',
      donut: {
        draft:      '#A1A1AA',
        proposed:   '#CA8A04',
        contracted: '#14532D',
        complete:   '#1E293B',
        lost:       '#991B1B',
      },
      estimators: ['#14532D','#78350F','#CA8A04','#1E293B','#991B1B','#166534','#92400E','#6B7280'],
    },
    preview: {
      bg:      '#FDFBF7',
      card:    '#FFFFFF',
      accent:  '#14532D',
      text:    '#064E3B',
      border:  '#D5D0C8',
      sidebar: '#064E3B',
    },
  },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    const valid = THEMES.map(t => t.id)
    // Migrate old themes to amber default
    return valid.includes(saved) ? saved : 'amber'
  })

  useEffect(() => {
    const el = document.documentElement
    el.classList.remove(...THEMES.map(t => `theme-${t.id}`),
      // Remove any legacy theme classes
      'theme-pearl', 'theme-graphite', 'theme-metcalfe', 'theme-emerald',
      'theme-indigo', 'theme-nordic', 'theme-obsidian', 'theme-blueprint',
      'theme-mono', 'theme-warm', 'theme-dark',
      'theme-sunstone', 'theme-arcadia', 'theme-midnight', 'theme-ashen',
      'theme-eldenring', 'theme-industrial', 'theme-harmony', 'theme-dusk')
    // Only add theme class for non-default themes (amber uses :root defaults)
    if (theme !== 'amber') {
      el.classList.add(`theme-${theme}`)
    }
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
