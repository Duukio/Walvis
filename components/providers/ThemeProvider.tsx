'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type ThemeContextType = {
  theme: string
  setTheme: (theme: string) => void
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  setTheme: () => {},
})

export const useTheme = () => useContext(ThemeContext)

export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const [theme, setThemeState] = useState('dark')

  useEffect(() => {
    const loadTheme = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('theme')
        .eq('id', user.id)
        .single()

      if (data?.theme) applyTheme(data.theme)
    }

    loadTheme()
  }, [])

  const applyTheme = (t: string) => {
    setThemeState(t)
    const root = document.documentElement
    if (t === 'light') {
      root.classList.add('light')
      root.classList.remove('dark')
    } else {
      root.classList.remove('light')
      root.classList.add('dark')
    }
  }

  const setTheme = (t: string) => {
    applyTheme(t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}