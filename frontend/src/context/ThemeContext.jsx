import { createContext, useContext, useState, useEffect } from 'react'

const ThemeContext = createContext()

export const THEMES = [
  {
    id:          'default',
    label:       'Light',
    description: 'Warm parchment & linen tones',
    tagline:     'Bid Management',
    chartColors: {
      primary:   '#7a5c53',
      secondary: '#4a8c6f',
      bar:       '#9b6b5e',
      donut: {
        draft:      '#c8b8b0',
        proposed:   '#c07828',
        contracted: '#4a8c6f',
        complete:   '#7a5c53',
        lost:       '#c0392b',
      },
      estimators: ['#7a5c53','#4a8c6f','#c07828','#9b6b5e','#5e8a76','#a05840','#3d7a62','#b08060'],
    },
    preview: { bg: '#f5ebe0', card: '#edede9', accent: '#5e4a43', text: '#3d2e2a', border: '#e3d5ca' },
  },
  {
    id:          'dark',
    label:       'Dark',
    description: 'Coffee bean & rosy warmth',
    tagline:     'Bid Management',
    chartColors: {
      primary:   '#b88e80',
      secondary: '#6ab89a',
      bar:       '#87675c',
      donut: {
        draft:      '#5e4f48',
        proposed:   '#d4a070',
        contracted: '#6ab89a',
        complete:   '#b88e80',
        lost:       '#e07060',
      },
      estimators: ['#b88e80','#6ab89a','#d4a070','#87675c','#8ad4b4','#c87860','#4a9878','#e9cfc2'],
    },
    preview: { bg: '#1e1410', card: '#2c1f1a', accent: '#b88e80', text: '#f9dfd2', border: '#5e4f48' },
  },
  {
    id:          'industrial',
    label:       'Industrial',
    description: 'Steel blue & pumpkin spice',
    tagline:     'Bid Management',
    chartColors: {
      primary:   '#004e98',
      secondary: '#2e7d52',
      bar:       '#3a6ea5',
      donut: {
        draft:      '#a0a0a0',
        proposed:   '#ff6700',
        contracted: '#2e7d52',
        complete:   '#004e98',
        lost:       '#c0392b',
      },
      estimators: ['#004e98','#ff6700','#2e7d52','#3a6ea5','#c05200','#1a6e40','#1a3a70','#e05800'],
    },
    preview: { bg: '#ebebeb', card: '#ffffff', accent: '#ff6700', text: '#1a1a1a', border: '#c0c0c0' },
  },
  {
    id:          'harmony',
    label:       'Harmony',
    description: 'Eggshell, teal & burnt peach',
    tagline:     'Bid Management',
    chartColors: {
      primary:   '#3d405b',
      secondary: '#81b29a',
      bar:       '#e07a5f',
      donut: {
        draft:      '#a8a498',
        proposed:   '#f2cc8f',
        contracted: '#81b29a',
        complete:   '#3d405b',
        lost:       '#e07a5f',
      },
      estimators: ['#3d405b','#81b29a','#e07a5f','#c9a86c','#5a7d68','#6a6e9a','#b85c44','#4a9878'],
    },
    preview: { bg: '#f4f1de', card: '#faf9f2', accent: '#e07a5f', text: '#2a2820', border: '#dedad0' },
  },
  {
    id:          'dusk',
    label:       'Dusk',
    description: 'Shadow grey & warm bone',
    tagline:     'Bid Management',
    chartColors: {
      primary:   '#e0ddcf',
      secondary: '#5aaa88',
      bar:       '#a09aa8',
      donut: {
        draft:      '#534b52',
        proposed:   '#c4a850',
        contracted: '#5aaa88',
        complete:   '#e0ddcf',
        lost:       '#c05040',
      },
      estimators: ['#e0ddcf','#5aaa88','#c4a850','#a09aa8','#7ec8a8','#d4b870','#7a7278','#f1f0ea'],
    },
    preview: { bg: '#2d232e', card: '#474448', accent: '#e0ddcf', text: '#f1f0ea', border: '#534b52' },
  },
]

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'default')

  useEffect(() => {
    const el = document.documentElement
    el.classList.remove('theme-dark', 'theme-industrial', 'theme-harmony', 'theme-dusk')
    if (theme !== 'default') el.classList.add(`theme-${theme}`)
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
