'use client'

import * as React from 'react'

export type ThemeProviderProps = {
  children?: React.ReactNode
  attribute?: string
  defaultTheme?: string
  storageKey?: string
  enableSystem?: boolean
  value?: any
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  // Minimal no-op ThemeProvider used as a fallback when `next-themes` is
  // not installed. This allows the app to build until dependencies are
  // installed locally. It intentionally does not implement theming.
  return <>{children}</>
}

export default ThemeProvider
