import { useId, useRef } from 'react'
import { useModalDialog } from '../hooks/useModalDialog'

type HowToPlayProps = {
  description: string
  instructions: { title: string; description: string }[]
  onClose: () => void
}

export default function HowToPlay({ description, instructions, onClose }: HowToPlayProps) {
  const closeButton = useRef<HTMLButtonElement>(null)
  const dialog = useModalDialog(true, closeButton)
  const titleId = useId()

  return (
    <dialog ref={dialog} className="instructions-backdrop" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose() }}
      onMouseDown={event => { if (event.target === event.currentTarget) onClose() }}>
      <div className="modal">
        <button ref={closeButton} className="modal-close" onClick={onClose} aria-label="Close instructions">×</button>
        <span className="aside-kicker">THE RULES ARE SIMPLE</span>
        <h2 id={titleId}>How to play<span className="title-dot">.</span></h2>
        <p>{description}</p>
        {instructions.map((instruction, index) => (
          <div className="instruction" key={instruction.title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <div><strong>{instruction.title}</strong><p>{instruction.description}</p></div>
          </div>
        ))}
        <button className="modal-play" onClick={onClose}>Got it, let’s play <span aria-hidden="true">→</span></button>
      </div>
    </dialog>
  )
}
