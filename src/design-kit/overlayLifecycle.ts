import { useEffect, useRef, useState } from 'react'
import { usePrefersReducedMotion } from './motion'

const EXIT_MS = 220

/** Keeps overlay mounted through exit animation when `open` becomes false. */
export function useOverlayLifecycle(open: boolean): { mounted: boolean; exiting: boolean } {
  const reduced = usePrefersReducedMotion()
  const [mounted, setMounted] = useState(open)
  const [exiting, setExiting] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(() => {
    if (timer.current) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    if (open) {
      setMounted(true)
      setExiting(false)
      return
    }
    if (!mounted) return
    if (reduced) {
      setMounted(false)
      setExiting(false)
      return
    }
    setExiting(true)
    timer.current = window.setTimeout(() => {
      setMounted(false)
      setExiting(false)
      timer.current = null
    }, EXIT_MS)
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [open, mounted, reduced])

  return { mounted, exiting }
}
