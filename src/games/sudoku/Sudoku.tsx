import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import GameList from '../../components/GameList'
import type { GameName } from '../catalog'
import GameStatus from '../../components/GameStatus'
import HowToPlay from '../../components/HowToPlay'
import PuzzleResult from '../../components/PuzzleResult'
import { SUDOKU_STORAGE_KEY as STORAGE_KEY } from '../progress'
import { conflicts, DIFFICULTIES, DIGITS, peers } from './rules'
import { newSession, restoreSession, type Entry } from './session'
import { useGameClock } from '../../hooks/useGameClock'
import { formatTime } from '../../utils/formatTime'
import './Sudoku.css'

function loadSession() {
  try {
    const saved = restoreSession(localStorage.getItem(STORAGE_KEY))
    if (saved) return saved
  } catch { /* Play also works without storage. */ }
  return newSession('easy')
}

export default function Sudoku({ onSelectGame }: { onSelectGame: (game: GameName) => void }) {
  const [session, setSession] = useState(loadSession)
  const [selected, setSelected] = useState(0)
  const [notesMode, setNotesMode] = useState(false)
  const [showHowTo, setShowHowTo] = useState(false)
  const [history, setHistory] = useState<Entry[]>([])
  const [message, setMessage] = useState('Choose a cell, then a number. Your progress saves automatically.')
  const cells = useRef<(HTMLButtonElement | null)[]>([])
  const won = session.values.every((v, i) => v === session.solution[i])
  const errors = conflicts(session.values)
  const filled = session.values.filter(Boolean).length

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(session)) } catch { /* Play also works without storage. */ }
  }, [session])

  useGameClock(!won, seconds => {
    setSession(previous => ({ ...previous, seconds: previous.seconds + seconds }))
  })

  function start(difficulty = session.difficulty) {
    setSession(newSession(difficulty))
    setHistory([])
    setSelected(0)
    setNotesMode(false)
    setMessage('A fresh puzzle. Take your time.')
  }

  function enter(value: number, hint = false) {
    if (won || showHowTo || session.givens[selected]) return
    if (notesMode && value && !hint && session.values[selected]) return
    const values = [...session.values]
    let notes = session.notes.map(n => [...n])
    if (notesMode && value && !hint) {
      notes[selected] = notes[selected].includes(value) ? notes[selected].filter(n => n !== value) : [...notes[selected], value].sort()
    } else {
      if (values[selected] === value && !notes[selected].length) return
      values[selected] = value
      notes[selected] = []
      if (value) notes = notes.map((n, i) => peers(selected, i) ? n.filter(v => v !== value) : n)
    }
    setHistory(previous => [...previous, { values: session.values, notes: session.notes }])
    setSession(previous => ({ ...previous, values, notes, hints: previous.hints + Number(hint) }))
    setMessage(hint ? `Revealed ${value} in row ${Math.floor(selected / 9) + 1}, column ${selected % 9 + 1}.` : value ? `${value} ${notesMode ? 'note toggled' : 'entered'}.` : 'Cell cleared.')
  }

  function undo() {
    const previous = history.at(-1)
    if (!previous || won) return
    setSession(current => ({ ...current, ...previous }))
    setHistory(current => current.slice(0, -1))
    setMessage('Last edit undone.')
  }

  function onKey(event: KeyboardEvent<HTMLDivElement>) {
    if (showHowTo || event.ctrlKey || event.metaKey || event.altKey) return
    const moves: Record<string, number> = { ArrowUp: -9, ArrowDown: 9, ArrowLeft: -1, ArrowRight: 1 }
    if (event.key in moves) {
      event.preventDefault()
      const next = (selected + moves[event.key] + 81) % 81
      setSelected(next)
      cells.current[next]?.focus()
    } else if (/^[1-9]$/.test(event.key)) { event.preventDefault(); enter(Number(event.key)) }
    else if (['Backspace', 'Delete', '0'].includes(event.key)) { event.preventDefault(); enter(0) }
    else if (event.key.toLowerCase() === 'n') setNotesMode(previous => !previous)
  }

  return (
    <main id="top" className="sudoku-game">
      <section className="intro">
        <div className="eyebrow"><span className="eyebrow-line" /> A LITTLE ORDER, A LITTLE WONDER <span className="eyebrow-line" /></div>
        <h1>Sudoku<span className="title-dot">.</span></h1>
        <p>Nine numbers. One perfect place for each.</p>
      </section>
      <div className="game-layout">
        <section aria-label="Sudoku game">
          <div className="mode-bar" aria-label="Difficulty">
            {DIFFICULTIES.map(difficulty => <button key={difficulty} className={`mode-button${session.difficulty === difficulty ? ' active' : ''}`} aria-pressed={session.difficulty === difficulty} onClick={() => start(difficulty)}>{difficulty[0].toUpperCase() + difficulty.slice(1)}</button>)}
          </div>
          <div className="game-card">
            <div className="game-card-top">
              <div><span className="aside-kicker">A MOMENT OF CLARITY</span><h2>{won ? 'Beautifully solved.' : 'Find your focus.'}</h2></div>
              <button className="new-game" onClick={() => start()}>New puzzle ↗</button>
            </div>
            <div className="stats-row">
              <div className="stat"><div><span className="stat-label">TIME</span><strong>{formatTime(session.seconds)}</strong></div></div>
              <div className="stat"><div><span className="stat-label">FILLED</span><strong>{filled} / 81</strong></div></div>
              <div className="stat"><div><span className="stat-label">HINTS</span><strong>{session.hints}</strong></div></div>
            </div>
            <div className="sudoku-play" onKeyDown={onKey}>
              <div className="board-meta"><GameStatus status={won ? 'won' : 'playing'} wonLabel="PUZZLE COMPLETE" /><span>{notesMode ? 'PENCIL NOTES ON' : 'NUMBER MODE'}</span></div>
              <div className="sudoku-board" role="group" aria-label="Sudoku board. Arrow keys to move; 1 through 9 to enter; N for notes.">
                {session.values.map((value, i) => {
                  const related = peers(selected, i)
                  const same = value !== 0 && value === session.values[selected]
                  return <button key={i} ref={element => { cells.current[i] = element }} tabIndex={selected === i ? 0 : -1}
                    className={`sudoku-cell${session.givens[i] ? ' given' : ''}${related ? ' related' : ''}${same ? ' matching' : ''}${errors.has(i) ? ' conflict' : ''}${selected === i ? ' chosen' : ''}`}
                    aria-label={`Row ${Math.floor(i / 9) + 1}, column ${i % 9 + 1}: ${value || (session.notes[i].length ? `notes ${session.notes[i].join(', ')}` : 'empty')}${session.givens[i] ? ', given' : ''}${errors.has(i) ? ', conflict' : ''}`}
                    aria-pressed={selected === i} onFocus={() => setSelected(i)} onClick={() => setSelected(i)}>
                    {value || <span className="sudoku-notes" aria-hidden="true">{DIGITS.map(n => <span key={n}>{session.notes[i].includes(n) ? n : ''}</span>)}</span>}
                  </button>
                })}
              </div>
              <div className="sudoku-number-pad" aria-label="Enter a number">{DIGITS.map(value => <button key={value} onClick={() => enter(value)} disabled={won || Boolean(session.givens[selected])}>{value}</button>)}</div>
              <div className="sudoku-tools">
                <button aria-pressed={notesMode} onClick={() => setNotesMode(!notesMode)} disabled={won}>✎ Notes {notesMode ? 'on' : 'off'}</button>
                <button onClick={() => enter(0)} disabled={won || Boolean(session.givens[selected])}>Erase</button>
                <button onClick={undo} disabled={won || !history.length}>Undo</button>
                <button onClick={() => enter(session.solution[selected], true)} disabled={won || Boolean(session.givens[selected]) || session.values[selected] === session.solution[selected]}>Hint</button>
              </div>
              <p className="sudoku-message" role="status">{won ? `You solved it in ${formatTime(session.seconds)} with ${session.hints} hints. Nicely done!` : message}</p>
            </div>
          </div>
        </section>
        <aside className="sidebar">
          <div className="tip-card">
            <span className="tip-icon" aria-hidden="true">✳</span>
            <span className="aside-kicker">A QUICK REMINDER</span>
            <h3>Every number<br />belongs somewhere.</h3>
            <p>Fill each row, column, and 3 × 3 box with 1–9, without repeats.</p>
            <button onClick={() => setShowHowTo(true)}>How to play <span aria-hidden="true">→</span></button>
          </div>
          <GameList activeGame="sudoku" onSelectGame={onSelectGame} />
          <div className="tiny-note">Use pencil notes to keep possibilities. Arrow keys move, N toggles notes, and Delete clears. Difficulty controls the number of starting clues. Progress saves on this device.</div>
        </aside>
      </div>
      <div className="how-strip"><div><span className="how-number">01</span><strong>SCAN</strong><span>Find the gaps</span></div><div><span className="how-number">02</span><strong>NOTE</strong><span>Keep possibilities</span></div><div><span className="how-number">03</span><strong>SOLVE</strong><span>One number at a time</span></div></div>
      {showHowTo && <HowToPlay
        description="Fill every empty square with a number from 1 to 9. Each row, column, and 3 × 3 box must contain each number exactly once."
        instructions={[
          { title: 'Choose a square', description: 'Click or tap a cell, then use the number pad or keys 1–9. The starting numbers are fixed. Arrow keys move between cells.' },
          { title: 'Keep pencil notes', description: 'Turn Notes on, or press N, to record possible numbers in an empty cell. Enter a note again to remove it. Turn Notes off to place a number.' },
          { title: 'Check your reasoning', description: 'Red cells mark repeated numbers in a row, column, or box. A number can still be incorrect without creating a conflict. Use Erase or Delete to clear a cell, or Undo to reverse your last edit.' },
          { title: 'Take a hint', description: 'Select an editable cell and press Hint to reveal its correct number. Complete the board to win. Difficulty changes the number of starting clues, and your progress saves on this device.' },
        ]}
        onClose={() => setShowHowTo(false)}
      />}
      {won && <PuzzleResult
        description="Every number in its place. Take a moment to enjoy it, or try another puzzle."
        time={formatTime(session.seconds)}
        hints={session.hints}
        detail={{ label: 'LEVEL', value: session.difficulty[0].toUpperCase() + session.difficulty.slice(1) }}
        onReplay={() => start()}
      />}
    </main>
  )
}
