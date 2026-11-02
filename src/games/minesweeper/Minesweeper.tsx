import { formatTime } from '../../utils/formatTime'
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import {
  chord,
  emptyBoard,
  hasWon,
  makeBoard,
  reveal,
  settings,
  type Board,
  type Difficulty,
  type Status,
} from './game'
import { mineWave, MINE_WAVE_SETTLE_MS, MINE_WAVE_SPREAD_MS } from './mineWave'
import Fireworks from '../../components/Fireworks'
import GameList from '../../components/GameList'
import type { GameName } from '../catalog'
import GameStatus from '../../components/GameStatus'
import './Minesweeper.css'

type Game = { board: Board; status: Status; mode: Difficulty; seconds: number }
type Scores = Partial<Record<Difficulty, number>>
const modes: Difficulty[] = ['beginner', 'intermediate', 'expert']

function newGame(mode: Difficulty): Game {
  const { rows, cols } = settings[mode]
  return { board: emptyBoard(rows, cols), status: 'ready', mode, seconds: 0 }
}

function readScores(): Scores {
  try {
    return JSON.parse(localStorage.getItem('fieldnotes-mines-scores') || '{}') as Scores
  } catch {
    return {}
  }
}

type IconName = 'flag' | 'clock' | 'refresh' | 'trophy' | 'info' | 'arrow' | 'pause' | 'play'
function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, ReactNode> = {
    flag: (
      <>
        <path d="M5 21V4" />
        <path d="M5 5c5-4 9 4 15 0v10c-6 4-10-4-15 0" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3.5 2" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 11a8 8 0 1 0-2.4 6" />
        <path d="M20 4v7h-7" />
      </>
    ),
    trophy: (
      <>
        <path d="M8 21h8M12 17v4M7 3h10v7a5 5 0 0 1-10 0V3ZM7 5H4v3a4 4 0 0 0 4 4M17 5h3v3a4 4 0 0 1-4 4" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7.5h.01" />
      </>
    ),
    arrow: (
      <>
        <path d="M5 12h14m-6-6 6 6-6 6" />
      </>
    ),
    pause: (
      <>
        <path d="M9 5v14M15 5v14" />
      </>
    ),
    play: <path d="m8 5 11 7-11 7V5Z" />,
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  )
}

function ResultDialog({
  game,
  best,
  onReplay,
  onViewBoard,
}: {
  game: Game
  best?: number
  onReplay: () => void
  onViewBoard: () => void
}) {
  const won = game.status === 'won'
  return (
    <div
      className="result-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onViewBoard()
      }}
    >
      {won && <Fireworks />}
      <section
        className={`result-dialog ${won ? 'result-won' : 'result-lost'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="result-title"
        aria-describedby="result-description"
      >
        <div className="result-emblem" aria-hidden="true">
          {won ? <Icon name="trophy" size={26} /> : <span className="mine-shape" />}
        </div>
        <span className="result-kicker">{won ? 'FIELD CLEARED' : 'GAME OVER'}</span>
        <h2 id="result-title">{won ? 'You did it!' : 'A mine got you.'}</h2>
        <p id="result-description">
          {won
            ? 'Every safe square uncovered. That was a clean sweep.'
            : 'Take a look at the field, then give it another go.'}
        </p>
        <div className="result-stats">
          <div>
            <span>TIME</span>
            <strong>{formatTime(game.seconds)}</strong>
          </div>
          <div>
            <span>LEVEL</span>
            <strong>{settings[game.mode].label}</strong>
          </div>
          {won && (
            <div>
              <span>BEST</span>
              <strong>
                {best === undefined
                  ? formatTime(game.seconds)
                  : formatTime(Math.min(best, game.seconds))}
              </strong>
            </div>
          )}
        </div>
        <button className="result-primary" onClick={onReplay} autoFocus>
          <Icon name="refresh" size={17} /> Play again
        </button>
        <button className="result-secondary" onClick={onViewBoard}>
          View board <Icon name="arrow" size={16} />
        </button>
      </section>
    </div>
  )
}

function Minesweeper({ onSelectGame }: { onSelectGame: (game: GameName) => void }) {
  const [game, setGame] = useState<Game>(() => newGame('beginner'))
  const [flagMode, setFlagMode] = useState(false)
  const [paused, setPaused] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const [resultDismissed, setResultDismissed] = useState(false)
  const [lossAnimationDone, setLossAnimationDone] = useState(false)
  const [scores, setScores] = useState<Scores>(readScores)
  const [announcement, setAnnouncement] = useState('New game ready')
  const boardRef = useRef<HTMLDivElement>(null)
  const { rows, cols, mines } = settings[game.mode]
  const flags = game.board.filter((cell) => cell.flagged).length
  const revealed = game.board.filter((cell) => cell.revealed && !cell.mine).length
  const progress = Math.round((revealed / (rows * cols - mines)) * 100)
  const wave = game.status === 'lost' ? mineWave(game.board, cols) : null
  const showResult =
    (game.status === 'won' || (game.status === 'lost' && lossAnimationDone)) && !resultDismissed

  useEffect(() => {
    if (game.status !== 'playing' || paused) return
    const timer = window.setInterval(
      () =>
        setGame((current) =>
          current.status === 'playing' ? { ...current, seconds: current.seconds + 1 } : current,
        ),
      1000,
    )
    return () => window.clearInterval(timer)
  }, [game.status, paused])
  useEffect(() => {
    localStorage.setItem('fieldnotes-mines-scores', JSON.stringify(scores))
  }, [scores])
  useEffect(() => {
    if (game.status !== 'lost') return
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 0
      : MINE_WAVE_SPREAD_MS + MINE_WAVE_SETTLE_MS
    const timer = window.setTimeout(() => setLossAnimationDone(true), delay)
    return () => window.clearTimeout(timer)
  }, [game.status])
  useEffect(() => {
    if (!showHowTo) return
    const closeOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setShowHowTo(false)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [showHowTo])
  useEffect(() => {
    if (!showResult) return
    const viewOnEscape = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setResultDismissed(true)
    }
    window.addEventListener('keydown', viewOnEscape)
    return () => window.removeEventListener('keydown', viewOnEscape)
  }, [showResult])

  function finish(board: Board, current: Game): Game {
    if (board.some((cell) => cell.exploded)) {
      setLossAnimationDone(false)
      setResultDismissed(false)
      setAnnouncement('Mine triggered. Try a new board!')
      return { ...current, board, status: 'lost' }
    }
    if (hasWon(board)) {
      setResultDismissed(false)
      setAnnouncement(`Board cleared in ${formatTime(current.seconds)}!`)
      setScores((previous) => {
        const best = previous[current.mode]
        return best === undefined || current.seconds < best
          ? { ...previous, [current.mode]: current.seconds }
          : previous
      })
      return {
        ...current,
        board: board.map((cell) => (cell.mine ? { ...cell, flagged: true } : cell)),
        status: 'won',
      }
    }
    return { ...current, board, status: 'playing' }
  }

  function openCell(index: number) {
    if (paused || game.status === 'won' || game.status === 'lost') return
    if (game.board[index].flagged) return

    let board = game.board

    if (game.status === 'ready') {
      board = makeBoard(rows, cols, mines, index).map((cell, cellIndex) => ({
        ...cell,
        flagged: game.board[cellIndex].flagged,
      }))
    }

    board = game.board[index].revealed
      ? chord(board, index, rows, cols)
      : reveal(board, index, rows, cols)

    if (board !== game.board) setGame(finish(board, game))
  }

  function toggleFlag(index: number) {
    if (paused || game.status === 'won' || game.status === 'lost') return
    if (game.board[index].revealed) return
    setGame({
      ...game,
      board: game.board.map((cell, i) =>
        i === index ? { ...cell, flagged: !cell.flagged } : cell,
      ),
    })
  }
  function reset(mode = game.mode) {
    setGame(newGame(mode))
    setLossAnimationDone(false)
    setResultDismissed(false)
    setPaused(false)
    setFlagMode(false)
    setAnnouncement(`${settings[mode].label} game ready`)
  }
  function handleCellKey(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key.toLowerCase() === 'f') {
      event.preventDefault()
      toggleFlag(index)
      return
    }

    const row = Math.floor(index / cols)
    const col = index % cols
    let nextRow = row
    let nextCol = col

    switch (event.key) {
      case 'ArrowUp':
        nextRow--
        break
      case 'ArrowDown':
        nextRow++
        break
      case 'ArrowLeft':
        nextCol--
        break
      case 'ArrowRight':
        nextCol++
        break
      default:
        return
    }

    event.preventDefault()
    if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) return

    const nextIndex = nextRow * cols + nextCol
    boardRef.current?.querySelectorAll<HTMLButtonElement>('.cell')[nextIndex]?.focus()
  }

  function viewBoard() {
    setResultDismissed(true)
    window.requestAnimationFrame(() =>
      boardRef.current?.querySelector<HTMLButtonElement>('.cell')?.focus(),
    )
  }

  return (
    <div className="minesweeper">
      <main id="top">
        <section className="intro">
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE CLASSICS, REIMAGINED{' '}
            <span className="eyebrow-line" />
          </div>
          <h1>
            MINESWEEPER<span className="title-dot">.</span>
          </h1>
          <p>A little logic. A little luck. A lot of “just one more game.”</p>
        </section>
        <section className="game-layout" aria-label="Minesweeper game">
          <div className="game-column">
            <div className="mode-bar" role="group" aria-label="Choose game mode">
              {modes.map((mode) => (
                <button
                  key={mode}
                  className={`mode-button${game.mode === mode ? ' active' : ''}`}
                  onClick={() => reset(mode)}
                  aria-pressed={game.mode === mode}
                >
                  {settings[mode].label}
                </button>
              ))}
            </div>
            <div className="game-card">
              <div className="game-card-top">
                <div>
                  <div className="card-kicker">
                    CLASSIC MODE · {settings[game.mode].label.toUpperCase()}
                  </div>
                  <h2>
                    {game.status === 'won'
                      ? 'Well played!'
                      : game.status === 'lost'
                        ? 'Boom. Try again?'
                        : 'Clear the field'}
                  </h2>
                </div>
                <button className="new-game" onClick={() => reset()}>
                  <Icon name="refresh" size={17} /> New game
                </button>
              </div>
              <div className="stats-row" aria-label="Game stats">
                <div className="stat">
                  <span className="stat-icon">
                    <Icon name="flag" size={17} />
                  </span>
                  <div>
                    <span className="stat-label">MINES LEFT</span>
                    <strong>
                      {Math.max(0, mines - flags)
                        .toString()
                        .padStart(2, '0')}
                    </strong>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon">
                    <Icon name="clock" size={18} />
                  </span>
                  <div>
                    <span className="stat-label">TIME</span>
                    <strong>{formatTime(game.seconds)}</strong>
                  </div>
                </div>
                <div className="stat">
                  <span className="stat-icon">
                    <Icon name="trophy" size={18} />
                  </span>
                  <div>
                    <span className="stat-label">BEST TIME</span>
                    <strong>
                      {scores[game.mode] === undefined ? '—' : formatTime(scores[game.mode]!)}
                    </strong>
                  </div>
                </div>
              </div>
              <div className="board-section">
                <div className="board-meta">
                  <GameStatus status={game.status} wonLabel="FIELD CLEARED!" />
                  <span>
                    {cols} × {rows} GRID · {mines} MINES
                  </span>
                </div>
                <div className="board-scroll">
                  <div
                    ref={boardRef}
                    className={`board board-${game.mode}${paused ? ' board-paused' : ''}`}
                    style={{ '--columns': cols } as CSSProperties}
                    role="grid"
                    aria-label={`${settings[game.mode].label} Minesweeper board`}
                  >
                    {game.board.map((cell, index) => {
                      const row = Math.floor(index / cols)
                      const col = index % cols
                      const showMine = game.status === 'lost' && cell.mine
                      const wrongFlag = game.status === 'lost' && cell.flagged && !cell.mine
                      const classes = ['cell', `number-${cell.adjacent}`]

                      if (cell.revealed) classes.push('revealed')
                      if (cell.flagged) classes.push('flagged')
                      if (cell.exploded) classes.push('exploded')
                      if (showMine || (game.status === 'won' && cell.mine)) classes.push('mine')
                      if (showMine) classes.push('chain-mine')
                      if (wrongFlag) classes.push('wrong-flag')

                      let detail = 'hidden'
                      if (wrongFlag) detail = 'incorrect flag'
                      else if (showMine || (cell.revealed && cell.mine)) detail = 'mine'
                      else if (cell.flagged) detail = 'flagged'
                      else if (cell.revealed && cell.adjacent > 0) {
                        detail = `${cell.adjacent} adjacent mines`
                      } else if (cell.revealed) detail = 'empty'

                      let content: ReactNode = null
                      if (wrongFlag) content = '×'
                      else if (showMine) content = <span className="mine-shape" />
                      else if (cell.flagged) content = <Icon name="flag" size={16} />
                      else if (game.status === 'won' && cell.mine) {
                        content = <span className="mine-shape" />
                      } else if (cell.revealed && cell.adjacent > 0) content = cell.adjacent

                      return (
                        <button
                          key={index}
                          type="button"
                          className={classes.join(' ')}
                          style={
                            wave && cell.mine
                              ? ({
                                  '--mine-delay': `${wave.delays.get(index) ?? 0}ms`,
                                } as CSSProperties)
                              : undefined
                          }
                          aria-label={`Row ${row + 1}, column ${col + 1}: ${detail}`}
                          aria-disabled={paused}
                          onClick={() => (flagMode ? toggleFlag(index) : openCell(index))}
                          onContextMenu={(event) => {
                            event.preventDefault()
                            toggleFlag(index)
                          }}
                          onKeyDown={(event) => handleCellKey(event, index)}
                        >
                          {content}
                        </button>
                      )
                    })}
                    {wave && (
                      <span
                        className="mine-shockwave"
                        style={
                          {
                            left: `${(((wave.origin % cols) + 0.5) / cols) * 100}%`,
                            top: `${((Math.floor(wave.origin / cols) + 0.5) / rows) * 100}%`,
                            '--wave-scale': wave.scale,
                          } as CSSProperties
                        }
                        aria-hidden="true"
                      />
                    )}
                    {paused && (
                      <div className="pause-overlay">
                        <Icon name="pause" size={28} />
                        <strong>Taking a breather?</strong>
                        <span>Your board is waiting.</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="board-bottom">
                  <div className="progress-track">
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <span>{progress}% CLEARED</span>
                </div>
              </div>
              <div className="controls-row">
                <button
                  className={`control-button flag-control${flagMode ? ' selected' : ''}`}
                  onClick={() => setFlagMode(!flagMode)}
                  aria-pressed={flagMode}
                >
                  <Icon name="flag" size={17} />
                  {flagMode ? 'Flag mode on' : 'Flag mode off'}
                  <span className="control-switch">
                    <span />
                  </span>
                </button>
                <button
                  className="control-button pause-control"
                  onClick={() => setPaused(!paused)}
                  disabled={game.status !== 'playing'}
                >
                  <Icon name={paused ? 'play' : 'pause'} size={17} />
                  {paused ? 'Resume' : 'Pause'}
                </button>
              </div>
            </div>
          </div>
          <aside className="sidebar">
            <div className="tip-card">
              <span className="tip-icon">✳</span>
              <span className="aside-kicker">A QUICK REMINDER</span>
              <h3>
                Think before
                <br />
                you click.
              </h3>
              <p>
                Each number tells you how many mines are hiding in the eight surrounding squares.
              </p>
              <button onClick={() => setShowHowTo(true)}>
                How to play <Icon name="arrow" size={17} />
              </button>
            </div>
            <GameList activeGame="minesweeper" onSelectGame={onSelectGame} />
            <div className="tiny-note">
              <Icon name="info" size={17} />
              <span>
                Tip: Tab to a square, then use arrow keys to move. Click an open number after
                placing the matching flags to chord.
              </span>
            </div>
          </aside>
        </section>
        <section className="how-strip" aria-label="Quick controls">
          <div>
            <span className="how-number">01 /</span>
            <strong>REVEAL</strong>
            <span>Click or tap a square</span>
          </div>
          <div>
            <span className="how-number">02 /</span>
            <strong>FLAG</strong>
            <span>Right-click or use flag mode</span>
          </div>
          <div>
            <span className="how-number">03 /</span>
            <strong>CHORD</strong>
            <span>Click an open number after matching its flags</span>
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
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="how-title">
            <button
              className="modal-close"
              onClick={() => setShowHowTo(false)}
              aria-label="Close instructions"
              autoFocus
            >
              ×
            </button>
            <span className="aside-kicker">THE RULES ARE SIMPLE</span>
            <h2 id="how-title">
              How to play<span className="title-dot">.</span>
            </h2>
            <p>
              Reveal every safe square to win. Numbers count mines in the eight surrounding
              squares, including diagonals. You do not have to flag every mine.
            </p>
            <div className="instruction">
              <span>01</span>
              <div>
                <strong>Reveal a square</strong>
                <p>
                  Click or tap a hidden square. Your first reveal and all its neighboring squares
                  are mine-free.
                </p>
              </div>
            </div>
            <div className="instruction">
              <span>02</span>
              <div>
                <strong>Flag a suspected mine</strong>
                <p>
                  Right-click a square, press F while it is focused, or use flag mode on touch
                  screens. A flagged square will not open.
                </p>
              </div>
            </div>
            <div className="instruction">
              <span>03</span>
              <div>
                <strong>Chord an open number</strong>
                <p>
                  When the number of neighboring flags matches a revealed number, click that number
                  again to open its other hidden neighbors. A wrong flag can reveal a mine.
                </p>
              </div>
            </div>
            <div className="instruction">
              <span>04</span>
              <div>
                <strong>Use the keyboard and controls</strong>
                <p>
                  Press Tab until a square is focused, or click a square first. Then use the arrow
                  keys to move focus. Enter or Space reveals the focused square, or flags it when
                  flag mode is on. F toggles its flag. Pause stops the timer; New game starts over.
                </p>
              </div>
            </div>
            <button className="modal-play" onClick={() => setShowHowTo(false)}>
              Got it, let’s play <Icon name="arrow" size={18} />
            </button>
          </div>
        </div>
      )}
      {showResult && (
        <ResultDialog
          game={game}
          best={scores[game.mode]}
          onReplay={() => reset()}
          onViewBoard={viewBoard}
        />
      )}
    </div>
  )
}
export default Minesweeper
