import { useEffect, useId, useReducer, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import GameList from '../../components/GameList'
import type { GameName } from '../catalog'
import GameStatus from '../../components/GameStatus'
import HowToPlay from '../../components/HowToPlay'
import PuzzleResult from '../../components/PuzzleResult'
import { isSolved, lineComplete, SIZES, strokeCells, type Mark, type Size } from './rules'
import { newSession, restoreSession, sessionReducer, STORAGE_KEY } from './session'
import { useGameClock } from '../../hooks/useGameClock'
import { formatTime } from '../../utils/formatTime'
import './Nonograms.css'

type Tool = 'fill' | 'cross' | 'erase'
type Stroke = { pointerId: number; mark: Mark; last: number; marks: Mark[] }

function loadSession() {
  try {
    const saved = restoreSession(localStorage.getItem(STORAGE_KEY))
    if (saved) return saved
  } catch { /* Storage may be unavailable; the game still works. */ }
  return newSession(5)
}

export default function Nonograms({ onSelectGame }: { onSelectGame: (game: GameName) => void }) {
  const [session, dispatch] = useReducer(sessionReducer, undefined, loadSession)
  const [tool, setTool] = useState<Tool>('fill')
  const [showHowTo, setShowHowTo] = useState(false)
  const [selected, setSelected] = useState(0)
  const [draft, setDraft] = useState<Mark[] | null>(null)
  const [message, setMessage] = useState('Follow the clues to uncover a picture. Select a tool, then tap or drag.')
  const stroke = useRef<Stroke | null>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const board = useRef<HTMLDivElement | null>(null)
  const clueId = useId()
  const { puzzle } = session
  const { size } = puzzle
  const marks = draft ?? session.marks
  const won = isSolved(session.marks, puzzle)
  const started = session.history.length > 0 || session.marks.some(mark => mark !== 0)
  const timing = started && !won
  const filled = marks.filter(mark => mark === 1).length
  const rowClueWidth = Math.max(...puzzle.rows.map(clues => clues.length))
  const columnClueHeight = Math.max(...puzzle.columns.map(clues => clues.length))

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)) }
    catch { /* Private browsing and full storage must not interrupt play. */ }
  }, [session])

  useGameClock(timing, seconds => dispatch({ type: 'tick', seconds }))

  function start(nextSize: Size = size) {
    if (!won && started && !window.confirm('Start another puzzle? This replaces your current progress.')) return
    stroke.current = null
    setDraft(null)
    dispatch({ type: 'replace', session: newSession(nextSize, puzzle.id) })
    setSelected(0)
    setMessage('A fresh picture to discover. Follow the runs, leave space between them.')
  }

  function edit(index: number, chosenTool: Tool = tool) {
    if (won || showHowTo || stroke.current) return
    const target: Mark = chosenTool === 'fill' ? 1 : chosenTool === 'cross' ? -1 : 0
    const next = [...session.marks]
    next[index] = next[index] === target ? 0 : target
    dispatch({ type: 'paint', marks: next })
    setMessage(`Row ${Math.floor(index / size) + 1}, column ${index % size + 1}: ${next[index] === 1 ? 'filled' : next[index] === -1 ? 'crossed out' : 'cleared'}.`)
  }

  function beginStroke(event: PointerEvent<HTMLButtonElement>, index: number) {
    if (won || showHowTo || stroke.current || (event.button !== 0 && event.button !== 2)) return
    event.preventDefault()
    const target: Mark = event.button === 2 ? -1 : tool === 'fill' ? 1 : tool === 'cross' ? -1 : 0
    const mark = session.marks[index] === target ? 0 : target
    const next = [...session.marks]
    next[index] = mark
    stroke.current = { pointerId: event.pointerId, mark, last: index, marks: next }
    setDraft(next)
    setSelected(index)
    buttons.current[index]?.focus({ preventScroll: true })
    board.current?.setPointerCapture(event.pointerId)
  }

  function moveStroke(event: PointerEvent<HTMLDivElement>) {
    const current = stroke.current
    if (!current || current.pointerId !== event.pointerId) return
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLButtonElement>('[data-nonogram-cell]')
    if (!target || !board.current?.contains(target)) return
    const index = Number(target.dataset.nonogramCell)
    if (current.last === index) return
    const next = [...current.marks]
    for (const cell of strokeCells(current.last, index, size)) next[cell] = current.mark
    stroke.current = { ...current, last: index, marks: next }
    setDraft(next)
    setSelected(index)
  }

  function endStroke(event: PointerEvent<HTMLDivElement>, cancelled = false) {
    const current = stroke.current
    if (!current || current.pointerId !== event.pointerId) return
    stroke.current = null
    setDraft(null)
    if (!cancelled) {
      dispatch({ type: 'paint', marks: current.marks })
      setMessage('Stroke saved. Undo reverses the whole stroke.')
    } else setMessage('Stroke cancelled.')
    buttons.current[current.last]?.focus({ preventScroll: true })
    if (board.current?.hasPointerCapture(event.pointerId)) board.current.releasePointerCapture(event.pointerId)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (showHowTo || event.altKey || event.ctrlKey || event.metaKey || stroke.current) return
    const moves: Record<string, number> = { ArrowUp: -size, ArrowDown: size, ArrowLeft: -1, ArrowRight: 1 }
    if (event.key in moves) {
      event.preventDefault()
      const next = (selected + moves[event.key] + size ** 2) % size ** 2
      setSelected(next)
      buttons.current[next]?.focus()
    } else if (['f', 'x', 'e', 'Backspace', 'Delete'].includes(event.key)) {
      event.preventDefault()
      edit(selected, event.key === 'f' ? 'fill' : event.key === 'x' ? 'cross' : 'erase')
    }
  }

  return (
    <main id="top" className="nonograms-game">
      <section className="intro">
        <div className="eyebrow"><span className="eyebrow-line" /> A PICTURE IN THE POSSIBILITIES <span className="eyebrow-line" /></div>
        <h1>Nonograms<span className="title-dot">.</span></h1>
        <p>A few clues. A little logic. A picture waiting to appear.</p>
      </section>

      <div className="game-layout">
        <section className="game-column" aria-label="Nonograms game">
          <div className="mode-bar" aria-label="Board size">
            {SIZES.map(option => (
              <button key={option} className={`mode-button${size === option ? ' active' : ''}`} aria-pressed={size === option} onClick={() => start(option)}>
                {option} × {option}<span className="nonogram-size-label">{option === 5 ? 'Small' : option === 10 ? 'Medium' : 'Large'}</span>
              </button>
            ))}
          </div>

          <div className={`game-card${won ? ' nonogram-won' : ''}`}>
            <div className="game-card-top">
              <div>
                <span className="aside-kicker">CONNECT THE CLUES</span>
                <h2>{won ? puzzle.name : 'See what unfolds.'}</h2>
              </div>
              <button className="new-game" onClick={() => start()}>New puzzle ↗</button>
            </div>
            <div className="stats-row">
              <div className="stat"><div><span className="stat-label">TIME</span><strong>{formatTime(session.seconds)}</strong></div></div>
              <div className="stat"><div><span className="stat-label">FILLED</span><strong>{filled}</strong></div></div>
              <div className="stat"><div><span className="stat-label">HINTS</span><strong>{session.hints}</strong></div></div>
            </div>

            <div className="nonogram-play">
              <div className="board-meta"><GameStatus status={won ? 'won' : 'playing'} wonLabel="PICTURE COMPLETE" /><span>{size} × {size}</span></div>
              <div className="nonogram-toolbar" role="group" aria-label="Drawing tool">
                {(['fill', 'cross', 'erase'] as const).map(option => (
                  <button key={option} aria-pressed={tool === option} onClick={() => setTool(option)} disabled={won}>
                    <span aria-hidden="true">{option === 'fill' ? '■' : option === 'cross' ? '×' : '◇'}</span>
                    {option === 'fill' ? 'Fill' : option === 'cross' ? 'Cross out' : 'Erase'}
                  </button>
                ))}
              </div>

              <div className="nonogram-scroll" tabIndex={0} role="region" aria-label="Puzzle area. Scroll horizontally on larger boards.">
                <div className="nonogram-board" ref={board} role="group" aria-label="Picture puzzle. Arrow keys move. F fills, X crosses out, Delete erases."
                  style={{ '--nonogram-size': size, '--row-clue-width': `${Math.max(48, rowClueWidth * 17 + 12)}px`, '--column-clue-height': `${columnClueHeight * 19 + 14}px` } as CSSProperties}
                  onKeyDown={onKeyDown} onPointerMove={moveStroke} onPointerUp={event => endStroke(event)}
                  onPointerCancel={event => endStroke(event, true)} onLostPointerCapture={event => endStroke(event, true)}
                  onContextMenu={event => event.preventDefault()}>
                  <div className="nonogram-corner" aria-hidden="true">{won ? '✓' : '✳'}</div>
                  {puzzle.columns.map((clues, col) => {
                    const line = Array.from({ length: size }, (_, row) => marks[row * size + col])
                    return (
                      <div key={`column-${col}`} id={`${clueId}-column-${col}`} className={`nonogram-clue column${lineComplete(line, clues) ? ' complete' : ''}${selected % size === col ? ' current' : ''}`} style={{ gridColumn: col + 2, gridRow: 1 }}>
                        <span className="sr-only">Column {col + 1} clues:</span>{clues.map((clue, i) => <span key={i}>{clue}<span className="sr-only"> </span></span>)}
                      </div>
                    )
                  })}
                  {puzzle.rows.map((clues, row) => (
                    <div key={`row-${row}`} id={`${clueId}-row-${row}`} className={`nonogram-clue row${lineComplete(marks.slice(row * size, (row + 1) * size), clues) ? ' complete' : ''}${Math.floor(selected / size) === row ? ' current' : ''}`} style={{ gridColumn: 1, gridRow: row + 2 }}>
                      <span className="sr-only">Row {row + 1} clues:</span>{clues.map((clue, i) => <span key={i}>{clue}<span className="sr-only"> </span></span>)}
                    </div>
                  ))}
                  {marks.map((mark, index) => {
                    const row = Math.floor(index / size)
                    const col = index % size
                    return (
                      <button key={index} ref={element => { buttons.current[index] = element }} data-nonogram-cell={index}
                        className={`nonogram-cell${mark === 1 ? ' filled' : mark === -1 ? ' crossed' : ''}${col % 5 === 4 ? ' block-right' : ''}${row % 5 === 4 ? ' block-bottom' : ''}${col === 0 ? ' first-column' : ''}${row === 0 ? ' first-row' : ''}`}
                        style={{ gridColumn: col + 2, gridRow: row + 2 }} tabIndex={selected === index ? 0 : -1}
                        aria-label={`Row ${row + 1}, column ${col + 1}: ${mark === 1 ? 'filled' : mark === -1 ? 'crossed out' : 'empty'}`}
                        aria-describedby={`${clueId}-row-${row} ${clueId}-column-${col}`} aria-disabled={won}
                        onFocus={() => setSelected(index)} onPointerDown={event => beginStroke(event, index)}
                        onClick={event => { if (event.detail === 0) edit(index) }}>
                        {mark === -1 && !won ? <span aria-hidden="true">×</span> : null}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="nonogram-actions">
                <button onClick={() => { dispatch({ type: 'undo' }); setMessage('Last edit undone.') }} disabled={won || !session.history.length || draft !== null}>Undo</button>
                <button onClick={() => { dispatch({ type: 'hint' }); setMessage('One cell revealed or corrected. You can undo this hint.') }} disabled={won || draft !== null}>Reveal a cell</button>
              </div>
              <p className="nonogram-message" role="status">{won ? `Picture revealed: ${puzzle.name}! Solved in ${formatTime(session.seconds)} with ${session.hints} ${session.hints === 1 ? 'hint' : 'hints'}.` : message}</p>
              <p className="nonogram-save-note">Progress saves on this device when browser storage is available.</p>
            </div>
          </div>
        </section>

        <aside className="sidebar">
          <div className="tip-card">
            <span className="tip-icon" aria-hidden="true">✳</span>
            <span className="aside-kicker">A QUICK REMINDER</span>
            <h3>Space is part<br />of the picture.</h3>
            <p>Each number is a run of filled squares, in order. Leave at least one empty square between runs. Cross out spaces you know are empty.</p>
            <button onClick={() => setShowHowTo(true)}>How to play <span aria-hidden="true">→</span></button>
          </div>
          <GameList activeGame="nonograms" onSelectGame={onSelectGame} />
          <div className="tiny-note"><span aria-hidden="true">ⓘ</span><span>Tip: Start with the biggest clues. Larger boards scroll sideways on small screens.</span></div>
        </aside>
      </div>
      <div className="how-strip">
        <div><span className="how-number">01</span><strong>READ</strong><span>Count the runs</span></div>
        <div><span className="how-number">02</span><strong>REASON</strong><span>Find the overlaps</span></div>
        <div><span className="how-number">03</span><strong>REVEAL</strong><span>Discover the picture</span></div>
      </div>
      {showHowTo && <HowToPlay
        description="Reveal a pixel picture using the numbered clues along each row and column. Every puzzle has one solution."
        instructions={[
          { title: 'Read the runs', description: 'Each number describes a consecutive run of filled squares, in order. For example, 3 1 means three filled squares, at least one empty square, then one filled square. A 0 means the whole line is empty.' },
          { title: 'Fill or cross out', description: 'Choose Fill to color squares, Cross out to mark known empty spaces, or Erase to clear them. Tap again to clear a mark, or drag across several cells. Right-click also crosses out. Each stroke is one undo step.' },
          { title: 'Use both directions', description: 'Compare the row and column clues to find overlaps. Clues dim when the filled runs match. Fill the correct picture to win; you do not need to cross out every empty square.' },
          { title: 'Use the controls', description: 'Arrow keys move, F fills, X crosses out, and Delete erases. Undo reverses an edit; Reveal a cell gives a hint. Choose a board size or New puzzle for another picture. Progress saves on this device.' },
        ]}
        onClose={() => setShowHowTo(false)}
      />}
      {won && <PuzzleResult
        description={`You revealed ${puzzle.name}. A little logic, a lovely little picture.`}
        time={formatTime(session.seconds)}
        hints={session.hints}
        detail={{ label: 'GRID', value: `${size} × ${size}` }}
        onReplay={() => start()}
      />}
    </main>
  )
}
