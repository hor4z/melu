import { useCallback, useSyncExternalStore } from 'react'

/**
 * The cuts of the theme, in pixels. They are the ones Tailwind uses, written here so the CSS
 * and the JS never say different things about where the phone ends.
 */
export const BREAKPOINTS = { sm: 640, md: 768, lg: 1024, xl: 1280 } as const

/**
 * Answers a media query and re-renders when the answer changes. It reads the real value on
 * the first render, not on an effect afterwards: a layout that depends on this would flash
 * the wrong one for a frame.
 */
export function useMediaQuery(query: string) {
  const subscribe = useCallback((notify: () => void) => {
    const mql = window.matchMedia(query)
    mql.addEventListener('change', notify)
    return () => mql.removeEventListener('change', notify)
  }, [query])
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false)
}

export type Device = 'phone' | 'tablet' | 'desktop'

/**
 * Which of the three the screen is, by width. It is about how much room there is and not about
 * what the device is: a narrow window on a laptop is a `phone` here, and that is the point,
 * because what changes is what fits.
 */
export function useDevice(): Device {
  const wide = useMediaQuery(`(min-width: ${BREAKPOINTS.lg}px)`)
  const medium = useMediaQuery(`(min-width: ${BREAKPOINTS.md}px)`)
  return wide ? 'desktop' : medium ? 'tablet' : 'phone'
}
