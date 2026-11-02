import { useEffect, useEffectEvent } from 'react'

/** Count actual elapsed seconds while the game and browser tab are active. */
export function useGameClock(active: boolean, onTick: (seconds: number) => void): void {
  const tick = useEffectEvent(onTick)

  useEffect(() => {
    if (!active) return
    let last = Date.now()
    const onVisibility = () => { last = Date.now() }
    const timer = window.setInterval(() => {
      const now = Date.now()
      const seconds = Math.floor((now - last) / 1000)
      if (seconds > 0) {
        if (!document.hidden) tick(seconds)
        last = now
      }
    }, 1000)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [active])
}
