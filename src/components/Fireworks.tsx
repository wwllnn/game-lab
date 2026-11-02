import { useState, type CSSProperties } from 'react'

const particlesPerBurst = 14
const introDelays = [0, 0.5, 1, 1.5, 2]
const repeatStartDelay = 3.6

function shuffleNumbers(numbers: number[]): number[] {
  const shuffled = [...numbers]

  for (let index = shuffled.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const current = shuffled[index]
    shuffled[index] = shuffled[randomIndex]
    shuffled[randomIndex] = current
  }

  return shuffled
}

function FireworkBurst({
  className,
  delay,
  repeating = false,
}: {
  className: string
  delay: number
  repeating?: boolean
}) {
  return (
    <div
      className={`firework ${className}`}
      style={{ '--burst-delay': `${delay}s` } as CSSProperties}
    >
      {repeating && <span className="firework-launch" />}
      {Array.from({ length: particlesPerBurst }, (_, particle) => (
        <span
          className="firework-particle"
          key={particle}
          style={{ '--angle': `${particle * (360 / particlesPerBurst)}deg` } as CSSProperties}
        />
      ))}
    </div>
  )
}

function Fireworks() {
  const [introSpots] = useState(() =>
    shuffleNumbers(Array.from({ length: 7 }, (_, index) => index + 1)).slice(0, 5),
  )
  const [burstOrder] = useState(() =>
    shuffleNumbers(Array.from({ length: 7 }, (_, index) => index)),
  )

  return (
    <div className="fireworks" aria-hidden="true">
      {introSpots.map((spot, index) => (
        <FireworkBurst
          className={`intro-firework firework-spot-${spot}`}
          delay={introDelays[index]}
          key={`intro-${spot}`}
        />
      ))}
      {burstOrder.map((delay, burst) => (
        <FireworkBurst
          className={`firework-${burst + 1} firework-spot-${burst + 1}`}
          delay={repeatStartDelay + delay * 0.85}
          repeating
          key={burst}
        />
      ))}
    </div>
  )
}

export default Fireworks
