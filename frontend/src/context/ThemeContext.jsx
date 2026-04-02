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
    id:          'arcadia',
    label:       'Arcadia',
    description: 'Stone, mauve & muted rose',
    tagline:     'Still Waters',
    chartColors: {
      primary:   '#c08898',
      secondary: '#6a9870',
      bar:       '#a07080',
      donut: {
        draft:      '#5a5558',
        proposed:   '#c0a050',
        contracted: '#6a9870',
        complete:   '#c08898',
        lost:       '#c04030',
      },
      estimators: ['#c08898','#6a9870','#c0a050','#a07080','#806d71','#5a8860','#d3d0c6','#9a6878'],
    },
    preview: { bg: '#30302e', card: '#414143', accent: '#c08898', text: '#d3d0c6', border: '#4a4548', sidebar: '#252523' },
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
      'theme-sunstone', 'theme-arcadia', 'theme-midnight', 'theme-ashen', 'theme-eldenring')
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
