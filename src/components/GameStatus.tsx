type GameStatusProps = {
  status: 'ready' | 'playing' | 'won' | 'lost'
  wonLabel?: string
  lostLabel?: string
}

export default function GameStatus({ status, wonLabel = 'GAME COMPLETE', lostLabel = 'GAME OVER' }: GameStatusProps) {
  const label = status === 'playing' ? 'GAME IN PROGRESS'
    : status === 'ready' ? 'READY WHEN YOU ARE'
      : status === 'won' ? wonLabel : lostLabel

  return <span><span className={`status-pulse ${status}`} aria-hidden="true" />{label}</span>
}
