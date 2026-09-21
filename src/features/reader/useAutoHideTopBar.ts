import { useEffect, useState } from 'react'

const DIRECTION_THRESHOLD_PX = 6
const ALWAYS_VISIBLE_ABOVE_PX = 40

/** The top bar comes back when scrolling up, and gets out of the way going down. */
export function useAutoHideTopBar(): boolean {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0

    const onScroll = () => {
      if (frame !== 0) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const y = window.scrollY
        const delta = y - lastY
        if (Math.abs(delta) < DIRECTION_THRESHOLD_PX) return
        setVisible(y < ALWAYS_VISIBLE_ABOVE_PX || delta < 0)
        lastY = y
      })
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (frame !== 0) window.cancelAnimationFrame(frame)
    }
  }, [])

  return visible
}
