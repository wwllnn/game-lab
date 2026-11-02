import { useEffect, useId, useRef, useState } from 'react'
import Fireworks from './Fireworks'
import { useModalDialog } from '../hooks/useModalDialog'

type PuzzleResultProps = {
  description: string
  time: string
  hints: number
  detail: { label: string; value: string }
  onReplay: () => void
}

/** Mounted for a completed puzzle; a new puzzle unmounts and resets the celebration. */
export default function PuzzleResult({ description, time, hints, detail, onReplay }: PuzzleResultProps) {
  const [ready, setReady] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const replayButton = useRef<HTMLButtonElement>(null)
  const dialog = useModalDialog(ready && !dismissed, replayButton)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500
    const timer = window.setTimeout(() => setReady(true), delay)
    return () => window.clearTimeout(timer)
  }, [])

  if (!ready || dismissed) return null

  return (
    <dialog ref={dialog} className="instructions-backdrop puzzle-result-backdrop" aria-labelledby={titleId} aria-describedby={descriptionId}
      onCancel={event => { event.preventDefault(); setDismissed(true) }}
      onMouseDown={event => { if (event.target === event.currentTarget) setDismissed(true) }}>
      <Fireworks />
      <section className="result-dialog result-won">
        <div className="result-emblem" aria-hidden="true">✳</div>
        <span className="result-kicker">PUZZLE COMPLETE</span>
        <h2 id={titleId}>Beautifully solved!</h2>
        <p id={descriptionId}>{description}</p>
        <div className="result-stats">
          <div><span>TIME</span><strong>{time}</strong></div>
          <div><span>HINTS</span><strong>{hints}</strong></div>
          <div><span>{detail.label}</span><strong>{detail.value}</strong></div>
        </div>
        <button ref={replayButton} className="result-primary" onClick={onReplay}>↻ Play again</button>
        <button className="result-secondary" onClick={() => setDismissed(true)}>View board →</button>
      </section>
    </dialog>
  )
}
