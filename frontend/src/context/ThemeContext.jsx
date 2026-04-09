import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const THEMES = [
  {
    id:    'mono',
    label: 'Mono',
    description: 'Clean black on white',
    chartColors: {
      primary:   '#111111',
      secondary: '#2d6a40',
      bar:       '#444444',
      donut: {
        draft:      '#c8c8c8',
        proposed:   '#b07800',
        contracted: '#2d6a40',
        complete:   '#111111',
        lost:       '#c0392b',
      },
      estimators: ['#111','#444','#2d6a40','#777','#999','#333','#666','#222'],
    },
    preview: {
      bg:      '#ffffff',
      card:    '#f8f9fa',
      accent:  '#111111',
      text:    '#111111',
      border:  '#e0e0e0',
      sidebar: '#111111',
    },
  },
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
  {
    id:    'warm',
    label: 'Warm',
    description: 'Earthy tones, no blue light',
    chartColors: {
      primary:   '#a68a64',
      secondary: '#a4ac86',
      bar:       '#936639',
      donut: {
        draft:      '#656d4a',
        proposed:   '#a68a64',
        contracted: '#a4ac86',
        complete:   '#936639',
        lost:       '#7f4f24',
      },
      estimators: ['#a68a64','#a4ac86','#936639','#c2c5aa','#7f4f24','#b6ad90','#656d4a','#582f0e'],
    },
    preview: {
      bg:      '#333d29',
      card:    '#414833',
      accent:  '#a68a64',
      text:    '#f0e8d0',
      border:  '#656d4a',
      sidebar: '#1e2418',
    },
  },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('theme')
    const valid = THEMES.map(t => t.id)
    return valid.includes(saved) ? saved : 'mono'
  })

  useEffect(() => {
    const el = document.documentElement
    el.classList.remove(...THEMES.map(t => `theme-${t.id}`),
      // Remove any old theme classes that may be stored
      'theme-dark', 'theme-sunstone', 'theme-arcadia', 'theme-midnight',
      'theme-ashen', 'theme-eldenring', 'theme-industrial', 'theme-harmony', 'theme-dusk')
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
