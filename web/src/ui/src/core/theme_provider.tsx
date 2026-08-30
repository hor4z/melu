import React, { createContext, useContext, useEffect, useState } from "react"

export type ColorScheme = "light" | "dark"
export type Direction = "ltr" | "rtl"

interface ThemeContextValue {
  scheme: ColorScheme
  setScheme: (s: ColorScheme) => void
  toggle: () => void
  direction: Direction
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error("useTheme must be used within <ThemeProvider>")
  return ctx
}

export interface ThemeProviderProps {
  children: React.ReactNode
  defaultScheme?: ColorScheme
  direction?: Direction
}

/**
 * Controls the color scheme (drives every `light-dark()` token) and text
 * direction on the document root.
 */
export function ThemeProvider({ children, defaultScheme = "dark", direction = "ltr" }: ThemeProviderProps) {
  const [scheme, setScheme] = useState<ColorScheme>(defaultScheme)

  useEffect(() => {
    document.documentElement.style.colorScheme = scheme
    document.documentElement.dir = direction
  }, [scheme, direction])

  return (
    <ThemeContext.Provider value={{ scheme, setScheme, toggle: () => setScheme((s) => (s === "dark" ? "light" : "dark")), direction }}>
      {children}
    </ThemeContext.Provider>
  )
}

ThemeProvider.displayName = "ThemeProvider"
