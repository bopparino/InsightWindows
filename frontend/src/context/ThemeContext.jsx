import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const THEMES = [
  // ── Light → Dark order ──────────────────────────────────────
  {
    id:          'sunstone',
    label:       'Sunstone',
    description: 'Warm cream & golden amber',
    tagline:     'Bid Management',
    chartColors: {
      primary:   '#b06a10',
      secondary: '#3a7d52',
      bar:       '#c87820',
      donut: {
        draft:      '#c8b89a',
        proposed:   '#d4820a',
        contracted: '#3a7d52',
        complete:   '#8a4a10',
        lost:       '#c0392b',
      },
      estimators: ['#b06a10','#3a7d52','#d4820a','#c87820','#2a6a42','#904a08','#1a5e38','#e09830'],
    },
    preview: { bg: '#fff8ee', card: '#ffffff', accent: '#c87820', text: '#1a0e00', border: '#f0d8b0', sidebar: '#7a3e08' },
  },
  {
    id:          'ashen',
    label:       'Ashen',
    description: 'Ember, ash & bonfire glow',
    tagline:     'Praise the Sun',
    chartColors: {
      primary:   '#c87941',
      secondary: '#7ab87a',
      bar:       '#e09050',
      donut: {
        draft:      '#4a4540',
        proposed:   '#c8a830',
        contracted: '#7ab87a',
        complete:   '#c87941',
        lost:       '#c03020',
      },
      estimators: ['#c87941','#7ab87a','#c8a830','#e09050','#a85c28','#5a9860','#d4b050','#f0a060'],
    },
    preview: { bg: '#1a1714', card: '#242019', accent: '#c87941', text: '#d4c9b0', border: '#3a3530', sidebar: '#0d0c0a' },
  },
  {
    id:          'eldenring',
    label:       'Elden Ring',
    description: 'Erdtree gold & the night sky',
    tagline:     'Guided by Grace',
    chartColors: {
      primary:   '#c9a227',
      secondary: '#5a9860',
      bar:       '#e0b840',
      donut: {
        draft:      '#383050',
        proposed:   '#c9a227',
        contracted: '#5a9860',
        complete:   '#e0b840',
        lost:       '#b02818',
      },
      estimators: ['#c9a227','#5a9860','#e0b840','#7ac87a','#a07818','#3a7850','#d4c060','#f0e090'],
    },
    preview: { bg: '#0e0c18', card: '#1a1628', accent: '#c9a227', text: '#e8dcc0', border: '#252038', sidebar: '#060510' },
  },
  {
    id:          'midnight',
    label:       'Midnight',
    description: 'Pure black & arctic white',
    tagline:     'Bid Management',
    chartColors: {
      primary:   '#60a5fa',
      secondary: '#34d399',
      bar:       '#818cf8',
      donut: {
        draft:      '#4b5563',
        proposed:   '#fbbf24',
        contracted: '#34d399',
        complete:   '#60a5fa',
        lost:       '#f87171',
      },
      estimators: ['#60a5fa','#34d399','#fbbf24','#818cf8','#a78bfa','#38bdf8','#f472b6','#fb923c'],
    },
    preview: { bg: '#000000', card: '#111111', accent: '#60a5fa', text: '#ffffff', border: '#222222', sidebar: '#000000' },
  },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    const valid = THEMES.map(t => t.id)
    return valid.includes(saved) ? saved : 'sunstone'
  })

  useEffect(() => {
    const el = document.documentElement
    el.classList.remove('theme-dark', 'theme-industrial', 'theme-harmony', 'theme-dusk',
      'theme-sunstone', 'theme-midnight', 'theme-ashen', 'theme-eldenring')
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
