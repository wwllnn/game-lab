import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import GameList from '../../components/GameList'
import type { GameName } from '../catalog'
import GameStatus from '../../components/GameStatus'
import Fireworks from '../../components/Fireworks'
import {
  addRandomTile,
  canMove,
  GOALS,
  hasWon,
  moveBoard,
  newBoard,
  rotateOuterRing,
  swapTiles,
  teleportTile,
  type Board,
  type Direction,
  type Goal,
  type Position,
  type RotationDirection,
  type TileSlide,
} from './rules'
import './Merge2048.css'

type Status = 'playing' | 'won' | 'lost'
type PowerUp = 'teleport' | 'swap' | 'rotate'
type TurnSnapshot = {
  description: string
  board: Board
  score: number
  moves: number
  continued: boolean
  teleportUsed: boolean
  swapUsed: boolean
  rotateUsed: boolean
}
type Animation = {
  turn: number
  sliding: boolean
  slides: TileSlide[]
  merged: Position[]
  spawned: Position | null
  powerUpTiles: Position[]
}

const SLIDE_DURATION = 70

function slideDistance(cells: number): string {
  if (cells === 0) return '0px'

  const gap = cells > 0 ? ' + var(--grid-gap)' : ' - var(--grid-gap)'
  return `calc(${cells * 100}%${gap.repeat(Math.abs(cells))})`
}

function readBest(goal: Goal): number {
  const saved = Number(localStorage.getItem(`fieldnotes-2048-best-${goal}`))
  const previous2048Best = goal === 2048 ? Number(localStorage.getItem('fieldnotes-2048-best')) : 0

  return Math.max(
    Number.isFinite(saved) ? saved : 0,
    Number.isFinite(previous2048Best) ? previous2048Best : 0,
  )
}

function samePosition(first: Position | null, row: number, col: number): boolean {
  return first?.row === row && first.col === col
}

function Merge2048({ onSelectGame }: { onSelectGame: (game: GameName) => void }) {
  const [goal, setGoal] = useState<Goal>(2048)
  const [board, setBoard] = useState(newBoard)
  const [score, setScore] = useState(0)
  const [best, setBest] = useState(() => readBest(2048))
  const [moves, setMoves] = useState(0)
  const [status, setStatus] = useState<Status>('playing')
  const [continued, setContinued] = useState(false)
  const [animation, setAnimation] = useState<Animation>({
    turn: 0,
    sliding: false,
    slides: [],
    merged: [],
    spawned: null,
    powerUpTiles: [],
  })
  const [powerUp, setPowerUp] = useState<PowerUp | null>(null)
  const [selectedTile, setSelectedTile] = useState<Position | null>(null)
  const [teleportUsed, setTeleportUsed] = useState(false)
  const [swapUsed, setSwapUsed] = useState(false)
  const [rotateUsed, setRotateUsed] = useState(false)
  const [history, setHistory] = useState<TurnSnapshot[]>([])
  const [showHowTo, setShowHowTo] = useState(false)
  const [resultReady, setResultReady] = useState(false)
  const [resultDismissed, setResultDismissed] = useState(false)
  const [announcement, setAnnouncement] = useState('New game ready. Use arrow keys or swipe.')
  const touchStart = useRef<{ x: number; y: number } | null>(null)

  const showResult = status !== 'playing' && resultReady && !resultDismissed
  const teleportMode = powerUp === 'teleport'
  const swapMode = powerUp === 'swap'
  const rotateMode = powerUp === 'rotate'
  let powerUpLabel = 'Rotate ring'
  if (teleportMode) powerUpLabel = 'Teleport'
  else if (swapMode) powerUpLabel = 'Swap'
  let powerUpHint = 'Choose a numbered tile. Press Escape to cancel.'
  if (selectedTile && teleportMode) powerUpHint = 'Now choose an empty space. Press Escape to cancel.'
  else if (selectedTile && swapMode) powerUpHint = 'Choose a tile with a different number. Press Escape to cancel.'
  else if (rotateMode) powerUpHint = 'Choose a direction. Press Escape to cancel.'

  let controlsLabel = 'ARROW KEYS OR SWIPE'
  if (rotateMode) controlsLabel = 'CHOOSE A ROTATION DIRECTION'
  else if (teleportMode) controlsLabel = 'SELECT A TILE, THEN AN EMPTY SPACE'
  else if (swapMode) controlsLabel = 'SELECT TWO NUMBERED TILES'

  const move = useCallback(
    (direction: Direction) => {
      if (status !== 'playing' || showHowTo || animation.sliding || powerUp) return

      const moved = moveBoard(board, direction)
      if (!moved.changed) return

      const { board: nextBoard, spawned } = addRandomTile(moved.board)
      const nextScore = score + moved.points
      const sliding = !window.matchMedia('(prefers-reduced-motion: reduce)').matches

      setHistory((previous) => [...previous, {
        description: `Move ${direction}${moved.points > 0 ? ` · +${moved.points} points` : ''}`,
        board, score, moves, continued, teleportUsed, swapUsed, rotateUsed,
      }])
      setBoard(nextBoard)
      setScore(nextScore)
      setBest((previous) => Math.max(previous, nextScore))
      setMoves((previous) => previous + 1)
      setAnimation((previous) => ({
        turn: previous.turn + 1,
        sliding,
        slides: sliding ? moved.slides : [],
        merged: moved.merged,
        spawned,
        powerUpTiles: [],
      }))

      if (!continued && hasWon(nextBoard, goal)) {
        setStatus('won')
        setAnnouncement(`You reached ${goal}!`)
      } else if (!canMove(nextBoard)) {
        setStatus('lost')
        setAnnouncement('No moves left. Game over.')
      } else {
        setAnnouncement(`Moved ${direction}. Score ${nextScore}.`)
      }
    },
    [animation.sliding, board, continued, goal, moves, score, showHowTo, status, powerUp, teleportUsed, swapUsed, rotateUsed],
  )

  useEffect(() => {
    if (!animation.sliding) return

    const timer = window.setTimeout(() => {
      setAnimation((previous) => ({ ...previous, sliding: false, slides: [] }))
    }, SLIDE_DURATION)

    return () => window.clearTimeout(timer)
  }, [animation.sliding, animation.turn])

  useEffect(() => {
    localStorage.setItem(`fieldnotes-2048-best-${goal}`, String(best))
  }, [best, goal])

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof HTMLElement && event.target.closest('input, textarea')) return

      const keys: Record<string, Direction> = {
        ArrowUp: 'up',
        ArrowDown: 'down',
        ArrowLeft: 'left',
        ArrowRight: 'right',
        w: 'up',
        s: 'down',
        a: 'left',
        d: 'right',
      }
      const direction = keys[event.key]
      if (!direction) return

      event.preventDefault()
      move(direction)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [move])

  useEffect(() => {
    if (status === 'playing') return
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 500
    const timer = window.setTimeout(() => setResultReady(true), delay)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!showHowTo && !showResult && !powerUp) return

    function onEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (showHowTo) setShowHowTo(false)
      else if (showResult) setResultDismissed(true)
      else {
        setPowerUp(null)
        setSelectedTile(null)
        setAnnouncement('Power-up cancelled.')
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [showHowTo, showResult, powerUp])

  function newGame(nextGoal: Goal = goal) {
    setGoal(nextGoal)
    setBoard(newBoard())
    setScore(0)
    setBest(readBest(nextGoal))
    setMoves(0)
    setStatus('playing')
    setContinued(false)
    setAnimation({ turn: 0, sliding: false, slides: [], merged: [], spawned: null, powerUpTiles: [] })
    setPowerUp(null)
    setSelectedTile(null)
    setTeleportUsed(false)
    setSwapUsed(false)
    setRotateUsed(false)
    setHistory([])
    setResultReady(false)
    setResultDismissed(false)
    setAnnouncement('New game ready. Use arrow keys or swipe.')
  }

  function keepPlaying() {
    setContinued(true)
    setResultReady(false)
    setResultDismissed(false)
    setStatus(canMove(board) ? 'playing' : 'lost')
  }

  function cancelPowerUp() {
    setPowerUp(null)
    setSelectedTile(null)
    setAnnouncement('Power-up cancelled.')
  }

  function undoLastTurn() {
    const previousTurn = history[history.length - 1]
    if (!previousTurn || showHowTo) return

    setBoard(previousTurn.board)
    setScore(previousTurn.score)
    setMoves(previousTurn.moves)
    setContinued(previousTurn.continued)
    setTeleportUsed(previousTurn.teleportUsed)
    setSwapUsed(previousTurn.swapUsed)
    setRotateUsed(previousTurn.rotateUsed)
    setStatus('playing')
    setAnimation({ turn: 0, sliding: false, slides: [], merged: [], spawned: null, powerUpTiles: [] })
    setPowerUp(null)
    setSelectedTile(null)
    setResultReady(false)
    setResultDismissed(false)
    setHistory((previous) => previous.slice(0, -1))
    setAnnouncement('Last move undone. Keep playing.')
  }

  function togglePowerUp(mode: PowerUp) {
    if (status !== 'playing' || showHowTo) return
    if (mode === 'teleport' && teleportUsed) return
    if (mode === 'swap' && swapUsed) return
    if (mode === 'rotate' && rotateUsed) return
    if (powerUp === mode) {
      cancelPowerUp()
      return
    }

    setPowerUp(mode)
    setSelectedTile(null)
    if (mode === 'rotate') {
      setAnnouncement('Rotate ring ready. Choose clockwise or counterclockwise.')
    } else if (mode === 'teleport') {
      setAnnouncement('Teleport ready. Select a numbered tile.')
    } else {
      setAnnouncement('Swap ready. Select a numbered tile.')
    }
  }

  function rotateRing(direction: RotationDirection) {
    if (!rotateMode || rotateUsed || status !== 'playing' || showHowTo || animation.sliding) return

    const rotated = rotateOuterRing(board, direction)
    if (!rotated.changed) {
      setAnnouncement('The outer ring would stay the same. Rotate is still available.')
      return
    }

    const sliding = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setHistory((previous) => [...previous, {
      description: `Rotate ${direction}`,
      board, score, moves, continued, teleportUsed, swapUsed, rotateUsed,
    }])
    setBoard(rotated.board)
    setMoves((previous) => previous + 1)
    setRotateUsed(true)
    setPowerUp(null)
    setSelectedTile(null)
    setAnimation((previous) => ({
      turn: previous.turn + 1,
      sliding,
      slides: sliding ? rotated.slides : [],
      merged: [],
      spawned: null,
      powerUpTiles: [],
    }))

    if (!canMove(rotated.board)) {
      setStatus('lost')
      setAnnouncement('Outer ring rotated. No moves left. Game over.')
    } else {
      setAnnouncement(`Outer ring rotated 90 degrees ${direction}.`)
    }
  }

  function handlePowerUpCell(row: number, col: number) {
    if ((!teleportMode && !swapMode) || status !== 'playing' || showHowTo || animation.sliding) return

    const value = board[row][col]
    if (samePosition(selectedTile, row, col)) {
      setSelectedTile(null)
      setAnnouncement('Selection cleared. Choose a numbered tile.')
      return
    }
    if (value !== 0 && (!selectedTile || teleportMode)) {
      setSelectedTile({ row, col })
      if (teleportMode) {
        setAnnouncement(`Selected ${value} tile. Choose an empty space.`)
      } else {
        setAnnouncement(`Selected ${value} tile. Choose a tile with a different number.`)
      }
      return
    }

    if (!selectedTile) return
    const target = { row, col }
    const nextBoard = teleportMode
      ? teleportTile(board, selectedTile, target)
      : swapTiles(board, selectedTile, target)
    if (!nextBoard) {
      setAnnouncement('Choose a numbered tile with a different value.')
      return
    }

    const selectedValue = board[selectedTile.row][selectedTile.col]
    setHistory((previous) => [...previous, {
      description: teleportMode
        ? `Teleport ${selectedValue} to row ${row + 1}, column ${col + 1}`
        : `Swap ${selectedValue} and ${value}`,
      board, score, moves, continued, teleportUsed, swapUsed, rotateUsed,
    }])
    setBoard(nextBoard)
    setMoves((previous) => previous + 1)
    setAnimation((previous) => ({
      turn: previous.turn + 1,
      sliding: false,
      slides: [],
      merged: [],
      spawned: null,
      powerUpTiles: teleportMode ? [target] : [selectedTile, target],
    }))
    setPowerUp(null)
    setSelectedTile(null)
    if (teleportMode) setTeleportUsed(true)
    else setSwapUsed(true)

    if (!canMove(nextBoard)) {
      setStatus('lost')
      setAnnouncement('Tiles swapped. No moves left. Game over.')
    } else if (teleportMode) {
      setAnnouncement(`Teleported ${nextBoard[row][col]} tile to row ${row + 1}, column ${col + 1}.`)
    } else {
      setAnnouncement('Tiles swapped. Keep playing.')
    }
  }

  function endSwipe(x: number, y: number) {
    if (!touchStart.current) return
    const differenceX = x - touchStart.current.x
    const differenceY = y - touchStart.current.y
    touchStart.current = null

    if (Math.max(Math.abs(differenceX), Math.abs(differenceY)) < 30) return
    if (Math.abs(differenceX) > Math.abs(differenceY)) {
      move(differenceX > 0 ? 'right' : 'left')
    } else {
      move(differenceY > 0 ? 'down' : 'up')
    }
  }

  return (
    <div className="merge-game">
      <main id="top">
        <section className="intro">
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE CLASSICS, REIMAGINED{' '}
            <span className="eyebrow-line" />
          </div>
          <h1>
            2048<span className="title-dot">.</span>
          </h1>
          <p>Slide. Combine. Chase that next big number.</p>
        </section>

        <section className="game-layout merge-layout" aria-label="2048 game">
          <div className="game-column">
            <div className="mode-bar" role="group" aria-label="Choose target tile">
              {GOALS.map((option) => (
                <button
                  className={`mode-button${goal === option ? ' active' : ''}`}
                  onClick={() => newGame(option)}
                  aria-pressed={goal === option}
                  key={option}
                >
                  {option}
                </button>
              ))}
            </div>
            <div className="game-card merge-card">
              <div className="game-card-top">
                <div>
                  <div className="card-kicker">NUMBER GAME · 4 × 4 GRID</div>
                  <h2>
                    {status === 'won'
                      ? `You made ${goal}!`
                      : status === 'lost'
                        ? 'No moves left'
                        : `Build to ${goal}`}
                  </h2>
                </div>
                <button className="new-game" onClick={() => newGame()}>
                  <span aria-hidden="true">↻</span> New game
                </button>
              </div>

              <div className="stats-row merge-stats" aria-label={`${goal} mode stats`}>
                <div className="stat">
                  <div>
                    <span className="stat-label">SCORE</span>
                    <strong>{score}</strong>
                  </div>
                </div>
                <div className="stat merge-best-stat">
                  <div aria-hidden={powerUp !== null}>
                    <span className="stat-label">BEST</span>
                    <strong>{best}</strong>
                  </div>
                  {powerUp && (
                    <div className="merge-teleport-banner" role="region" aria-label={`${powerUpLabel} mode`}>
                      <div>
                        <strong>{powerUpLabel} mode</strong>
                        <p>{powerUpHint}</p>
                        {rotateMode && (
                          <div className="merge-rotate-options" role="group" aria-label="Rotation direction">
                            <button onClick={() => rotateRing('clockwise')}>Clockwise</button>
                            <button onClick={() => rotateRing('counterclockwise')}>Counterclockwise</button>
                          </div>
                        )}
                      </div>
                      <button onClick={cancelPowerUp}>Cancel</button>
                    </div>
                  )}
                </div>
                <div className="stat">
                  <div>
                    <span className="stat-label">MOVES</span>
                    <strong>{moves}</strong>
                  </div>
                </div>
              </div>

              <div className="merge-board-section">
                <div className="board-meta">
                  <GameStatus status={status} wonLabel="GOAL REACHED!" />
                  <span>{controlsLabel}</span>
                </div>

                <div className="merge-board-and-history">
                  <div
                    className="merge-board"
                    role="grid"
                    aria-label={`${goal} mode board`}
                    style={{ '--slide-duration': `${SLIDE_DURATION}ms` } as CSSProperties}
                    onTouchStart={(event) => {
                      const touch = event.touches[0]
                      touchStart.current = { x: touch.clientX, y: touch.clientY }
                    }}
                    onTouchEnd={(event) => {
                      const touch = event.changedTouches[0]
                      endSwipe(touch.clientX, touch.clientY)
                    }}
                  >
                    {board.map((values, row) => (
                      <div className="merge-row" role="row" key={row}>
                        {values.map((value, col) => {
                          const displayedValue = animation.sliding ? 0 : value
                          const spawned = !animation.sliding && samePosition(animation.spawned, row, col)
                          const merged = !animation.sliding && animation.merged.some((position) =>
                            samePosition(position, row, col),
                          )
                          const highlighted = animation.powerUpTiles.some((position) => samePosition(position, row, col))
                          const selected = powerUp !== null && samePosition(selectedTile, row, col)
                          let destination = false
                          if (selectedTile && teleportMode) destination = value === 0
                          else if (selectedTile && swapMode) {
                            destination = value !== 0 && value !== board[selectedTile.row][selectedTile.col]
                          }
  
                          return (
                            <div
                              className={`merge-tile value-${displayedValue}${spawned ? ' spawned' : ''}${merged ? ' merged' : ''}${highlighted ? ' teleported' : ''}${selected ? ' teleport-selected' : ''}${destination ? ' teleport-destination' : ''}`}
                              role="gridcell"
                              aria-label={`Row ${row + 1}, column ${col + 1}: ${value || 'empty'}`}
                              key={`${row}-${col}-${spawned || merged || highlighted ? animation.turn : ''}`}
                            >
                              {(teleportMode || swapMode) && !animation.sliding ? (
                                <button
                                  className="merge-teleport-cell"
                                  onClick={() => handlePowerUpCell(row, col)}
                                  disabled={value === 0 && (swapMode || !selectedTile)}
                                  aria-pressed={selected}
                                  aria-label={
                                    value === 0
                                      ? `Move selected tile to empty row ${row + 1}, column ${col + 1}`
                                      : swapMode && selectedTile && !selected
                                        ? `Swap selected tile with ${value} at row ${row + 1}, column ${col + 1}`
                                      : `Select ${value} tile at row ${row + 1}, column ${col + 1}`
                                  }
                                >
                                  {value || ''}
                                </button>
                              ) : (
                                displayedValue || ''
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                    {animation.sliding && (
                      <div className="merge-sliding-tiles" aria-hidden="true">
                        {animation.slides.map((slide) => {
                          const merging = animation.merged.some((position) =>
                            samePosition(position, slide.to.row, slide.to.col),
                          )
  
                          return (
                            <div
                              className={`merge-tile value-${slide.value}`}
                              style={
                                {
                                  gridRow: slide.from.row + 1,
                                  gridColumn: slide.from.col + 1,
                                  '--slide-x': slideDistance(slide.to.col - slide.from.col),
                                  '--slide-y': slideDistance(slide.to.row - slide.from.row),
                                  '--slide-scale': merging ? 0.8 : 1,
                                } as CSSProperties
                              }
                              key={`${slide.from.row}-${slide.from.col}`}
                            >
                              {slide.value}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                  <section className="merge-history" aria-labelledby="merge-history-title">
                    <div className="merge-history-header">
                      <h3 id="merge-history-title">Recent moves</h3>
                      <button
                        className="merge-teleport-button"
                        onClick={undoLastTurn}
                        disabled={history.length === 0}
                      >
                        Undo
                      </button>
                    </div>
                    <p className="merge-history-hint">Last 10 moves</p>
                    {history.length === 0 ? (
                      <p className="merge-history-empty">Your moves will appear here.</p>
                    ) : (
                      <ol className="merge-history-list" reversed start={moves}>
                        {history.slice(-10).reverse().map((turn) => (
                          <li key={turn.moves}>{turn.description}</li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>

                <div className="merge-powerup">
                  <button
                    className={`merge-teleport-button${teleportMode ? ' active' : ''}`}
                    onClick={() => togglePowerUp('teleport')}
                    disabled={teleportUsed || status !== 'playing'}
                    aria-pressed={teleportMode}
                  >
                    Teleport tile <span>{teleportUsed ? 'USED' : '1 USE'}</span>
                  </button>
                  <button
                    className={`merge-teleport-button${swapMode ? ' active' : ''}`}
                    onClick={() => togglePowerUp('swap')}
                    disabled={swapUsed || status !== 'playing'}
                    aria-pressed={swapMode}
                  >
                    Swap tiles <span>{swapUsed ? 'USED' : '1 USE'}</span>
                  </button>
                  <button
                    className={`merge-teleport-button${rotateMode ? ' active' : ''}`}
                    onClick={() => togglePowerUp('rotate')}
                    disabled={rotateUsed || status !== 'playing'}
                    aria-pressed={rotateMode}
                    title="Choose a direction to rotate the outer ring"
                  >
                    Rotate ring <span>{rotateUsed ? 'USED' : '1 USE'}</span>
                  </button>
                  <p>{powerUp ? powerUpHint : 'One use of each power-up per game.'}</p>
                </div>
                <p className="merge-instruction">Matching tiles combine when they meet.</p>
                <div className="merge-controls" aria-label="Move tiles">
                  <button className="up" onClick={() => move('up')} aria-label="Move up">
                    ↑
                  </button>
                  <button className="left" onClick={() => move('left')} aria-label="Move left">
                    ←
                  </button>
                  <button className="down" onClick={() => move('down')} aria-label="Move down">
                    ↓
                  </button>
                  <button className="right" onClick={() => move('right')} aria-label="Move right">
                    →
                  </button>
                </div>
              </div>

              <div className="merge-card-bottom">
                <button className="control-button" onClick={() => setShowHowTo(true)}>
                  <span aria-hidden="true">ⓘ</span> How to play
                </button>
                <span>REACH {goal} TO WIN</span>
              </div>
            </div>
          </div>

          <aside className="sidebar">
            <div className="tip-card">
              <span className="tip-icon">✳</span>
              <span className="aside-kicker">A QUICK REMINDER</span>
              <h3>
                Plan your
                <br />
                next move.
              </h3>
              <p>Every move slides all tiles. Matching numbers merge into one bigger tile.</p>
              <button onClick={() => setShowHowTo(true)}>
                How to play <span aria-hidden="true">→</span>
              </button>
            </div>
            <GameList activeGame="merge2048" onSelectGame={onSelectGame} />
            <div className="tiny-note">
              <span aria-hidden="true">ⓘ</span>
              <span>Only moves that change the board create a new tile.</span>
            </div>
          </aside>
        </section>

        <section className="how-strip" aria-label="Quick controls">
          <div>
            <span className="how-number">01 /</span>
            <strong>SLIDE</strong>
            <span>Use keys or swipe</span>
          </div>
          <div>
            <span className="how-number">02 /</span>
            <strong>MERGE</strong>
            <span>Match equal numbers</span>
          </div>
          <div>
            <span className="how-number">03 /</span>
            <strong>WIN</strong>
            <span>Reach the {goal} tile</span>
          </div>
        </section>
      </main>

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>

      {showHowTo && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowHowTo(false)
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="merge-how-title">
            <button
              className="modal-close"
              onClick={() => setShowHowTo(false)}
              aria-label="Close instructions"
              autoFocus
            >
              ×
            </button>
            <span className="aside-kicker">THE RULES ARE SIMPLE</span>
            <h2 id="merge-how-title">
              How to play<span className="title-dot">.</span>
            </h2>
            <p>
              Slide every tile in one direction. Equal tiles merge, and a new tile appears after
              each successful move.
            </p>
            <div className="instruction">
              <span>01</span>
              <div>
                <strong>Move</strong>
                <p>Use arrow keys, WASD, swipe, or the on-screen arrows.</p>
              </div>
            </div>
            <div className="instruction">
              <span>02</span>
              <div>
                <strong>Combine</strong>
                <p>Two matching tiles merge once per move, adding their new value to your score.</p>
              </div>
            </div>
            <div className="instruction">
              <span>03</span>
              <div>
                <strong>Reach {goal}</strong>
                <p>Make a {goal} tile to win. You can keep playing afterward.</p>
              </div>
            </div>
            <div className="instruction">
              <span>04</span>
              <div>
                <strong>Teleport</strong>
                <p>Once per game, select a numbered tile and then an empty space. Teleporting does not merge tiles or create a new tile.</p>
              </div>
            </div>
            <div className="instruction">
              <span>05</span>
              <div>
                <strong>Swap</strong>
                <p>Once per game, select two tiles with different numbers to exchange their positions. Swapping does not merge tiles or create a new tile.</p>
              </div>
            </div>
            <div className="instruction">
              <span>06</span>
              <div>
                <strong>Undo</strong>
                <p>Undo as many moves as you like, even after winning or losing. Each undo restores the previous board, score, and move count. Undoing a power-up also restores its use. Your best score is kept.</p>
              </div>
            </div>
            <div className="instruction">
              <span>07</span>
              <div>
                <strong>Rotate ring</strong>
                <p>Once per game, choose clockwise or counterclockwise to rotate the outer ring 90 degrees, moving each side to the next side. The four inner cells stay in place. Rotation does not merge tiles or create a new tile.</p>
              </div>
            </div>
            <button className="modal-play" onClick={() => setShowHowTo(false)}>
              Got it, let’s play <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}

      {showResult && (
        <div className="result-backdrop">
          {status === 'won' && <Fireworks />}
          <section
            className={`result-dialog result-${status}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="merge-result-title"
            aria-describedby="merge-result-description"
          >
            <div className="result-emblem" aria-hidden="true">
              {status === 'won' ? goal : '×'}
            </div>
            <span className="result-kicker">{status === 'won' ? 'GOAL REACHED' : 'GAME OVER'}</span>
            <h2 id="merge-result-title">{status === 'won' ? 'You made it!' : 'No moves left.'}</h2>
            <p id="merge-result-description">
              {status === 'won'
                ? `The ${goal} tile is yours. Keep going or start fresh.`
                : 'Try a new board and beat your best score.'}
            </p>
            <div className="result-stats">
              <div>
                <span>SCORE</span>
                <strong>{score}</strong>
              </div>
              <div>
                <span>BEST</span>
                <strong>{best}</strong>
              </div>
            </div>
            <button
              className="result-primary"
              onClick={status === 'won' ? keepPlaying : () => newGame()}
              autoFocus
            >
              {status === 'won' ? 'Keep playing →' : '↻ Play again'}
            </button>
            <button
              className="result-secondary"
              onClick={status === 'won' ? () => newGame() : () => setResultDismissed(true)}
            >
              {status === 'won' ? 'Start a new game' : 'View board →'}
            </button>
            {history.length > 0 && (
              <button className="result-secondary" onClick={undoLastTurn}>
                Undo last move
              </button>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default Merge2048
