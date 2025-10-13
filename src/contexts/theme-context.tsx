'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Theme = 'light' | 'dark'

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  isLoading: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Load theme on mount
  useEffect(() => {
    const loadTheme = async () => {
      try {
        // Check if user is logged in
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          // Load from database
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('theme_preference')
            .eq('id', user.id)
            .single()

          if (profile?.theme_preference) {
            const savedTheme = profile.theme_preference as Theme
            setThemeState(savedTheme)
            applyTheme(savedTheme)
          } else {
            // Use system preference if no saved preference
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            setThemeState(systemTheme)
            applyTheme(systemTheme)
          }
        } else {
          // Not logged in - use localStorage or system preference
          const localTheme = localStorage.getItem('theme') as Theme
          if (localTheme) {
            setThemeState(localTheme)
            applyTheme(localTheme)
          } else {
            const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
            setThemeState(systemTheme)
            applyTheme(systemTheme)
          }
        }
      } catch (error) {
        console.error('Error loading theme:', error)
        // Fallback to system preference
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        setThemeState(systemTheme)
        applyTheme(systemTheme)
      } finally {
        setIsLoading(false)
      }
    }

    loadTheme()
  }, [supabase])

  const applyTheme = (newTheme: Theme) => {
    const root = document.documentElement
    if (newTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme)
    applyTheme(newTheme)
    localStorage.setItem('theme', newTheme)

    // Save to database if user is logged in
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('user_profiles')
          .update({ theme_preference: newTheme })
          .eq('id', user.id)
      }
    } catch (error) {
      console.error('Error saving theme preference:', error)
    }
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isLoading }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
