import { useEffect, useState, type CSSProperties } from 'react'
import GameList from '../../components/GameList'
import type { GameName } from '../catalog'
import GameStatus from '../../components/GameStatus'
import Fireworks from '../../components/Fireworks'
import {
  chooseAnswer,
  isValidGuess,
  keyboardResults,
  MAX_GUESSES,
  possibleAnswers,
  scoreGuess,
  WORD_LENGTH,
  type Guess,
} from './rules'
import { WORD_LENGTHS, type WordLength } from './wordLists'
import './Wordle.css'

type WordStatus = 'playing' | 'won' | 'lost'
const keyboardRows = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']

function Wordle({ onSelectGame }: { onSelectGame: (game: GameName) => void }) {
  const [wordLength, setWordLength] = useState<WordLength>(WORD_LENGTH)
  const [answer, setAnswer] = useState(chooseAnswer)
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [currentGuess, setCurrentGuess] = useState('')
  const [status, setStatus] = useState<WordStatus>('playing')
  const [message, setMessage] = useState(`Type a ${WORD_LENGTH}-letter word to begin.`)
  const [showHowTo, setShowHowTo] = useState(false)
  const [resultReady, setResultReady] = useState(false)
  const [resultDismissed, setResultDismissed] = useState(false)
  const [wordSearch, setWordSearch] = useState('')

  const colors = keyboardResults(guesses)
  const guessesLeft = MAX_GUESSES - guesses.length
  const showResult = status !== 'playing' && resultReady && !resultDismissed
  const possibleWords = possibleAnswers(guesses, wordLength)
  const matchingWords = possibleWords.filter((word) =>
    word.includes(wordSearch.trim().toLowerCase()),
  )

  function handleKey(key: string) {
    if (status !== 'playing' || showHowTo) return

    if (key === 'Backspace') {
      setCurrentGuess((word) => word.slice(0, -1))
      setMessage('')
      return
    }

    if (key === 'Enter') {
      if (currentGuess.length !== wordLength) {
        setMessage(`Enter ${wordLength} letters first.`)
        return
      }

      if (!isValidGuess(currentGuess, wordLength)) {
        setMessage('Not in the word list. Try another word.')
        return
      }

      if (guesses.some((guess) => guess.word === currentGuess)) {
        setMessage('You already tried that word.')
        return
      }

      const nextGuess = { word: currentGuess, result: scoreGuess(currentGuess, answer) }
      const nextCount = guesses.length + 1
      setGuesses((previous) => [...previous, nextGuess])
      setCurrentGuess('')

      if (currentGuess === answer) {
        setStatus('won')
        setMessage(`Solved in ${nextCount} ${nextCount === 1 ? 'guess' : 'guesses'}!`)
      } else if (nextCount === MAX_GUESSES) {
        setStatus('lost')
        setMessage(`The word was ${answer}.`)
      } else {
        setMessage(`${MAX_GUESSES - nextCount} guesses left.`)
      }
      return
    }

    if (/^[A-Z]$/.test(key) && currentGuess.length < wordLength) {
      setCurrentGuess((word) => word + key)
      setMessage('')
    }
  }

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof HTMLElement) {
        if (event.target.closest('input, textarea')) return
        if ((event.key === 'Enter' || event.key === ' ') && event.target.closest('button, a')) return
      }

      const key = event.key.length === 1 ? event.key.toUpperCase() : event.key
      if (key === 'Enter' || key === 'Backspace' || /^[A-Z]$/.test(key)) {
        event.preventDefault()
        handleKey(key)
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  useEffect(() => {
    if (status === 'playing') return
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900
    const timer = window.setTimeout(() => setResultReady(true), delay)
    return () => window.clearTimeout(timer)
  }, [status])

  useEffect(() => {
    if (!showHowTo && !showResult) return

    function onEscape(event: globalThis.KeyboardEvent) {
      if (event.key !== 'Escape') return
      if (showHowTo) setShowHowTo(false)
      else setResultDismissed(true)
    }

    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [showHowTo, showResult])

  function newRound(length: WordLength = wordLength) {
    setWordLength(length)
    setAnswer(chooseAnswer(length))
    setGuesses([])
    setCurrentGuess('')
    setStatus('playing')
    setMessage(`Type a ${length}-letter word to begin.`)
    setResultReady(false)
    setResultDismissed(false)
    setWordSearch('')
  }

  return (
    <div className="word-game">
      <main id="top">
        <section className="intro">
          <div className="eyebrow">
            <span className="eyebrow-line" /> THE CLASSICS, REIMAGINED{' '}
            <span className="eyebrow-line" />
          </div>
          <h1>
            WORDLE<span className="title-dot">.</span>
          </h1>
          <p>{wordLength} letters. Six tries. One satisfying little solve.</p>
        </section>

        <section className="game-layout word-layout" aria-label={`${wordLength}-letter word game`}>
          <div className="game-column">
            <div className="mode-bar" role="group" aria-label="Choose word length">
              {WORD_LENGTHS.map(length => (
                <button key={length} className={`mode-button${wordLength === length ? ' active' : ''}`} aria-pressed={wordLength === length} onClick={() => newRound(length)}>{length} letters</button>
              ))}
            </div>
            <div className="game-card word-card">
              <div className="game-card-top">
                <div>
                  <div className="card-kicker">WORD GAME · {wordLength} LETTERS</div>
                  <h2>
                    {status === 'won'
                      ? 'Beautifully done!'
                      : status === 'lost'
                        ? 'Try another word?'
                        : 'Find the word'}
                  </h2>
                </div>
                <button className="new-game" onClick={() => newRound()}>
                  <span aria-hidden="true">↻</span> New word
                </button>
              </div>

              <div className="stats-row word-stats" aria-label="Word game stats">
                <div className="stat">
                  <div>
                    <span className="stat-label">GUESSES LEFT</span>
                    <strong>{String(guessesLeft).padStart(2, '0')}</strong>
                  </div>
                </div>
                <div className="stat">
                  <div>
                    <span className="stat-label">WORD LENGTH</span>
                    <strong>{String(wordLength).padStart(2, '0')}</strong>
                  </div>
                </div>
                <div className="stat">
                  <div>
                    <span className="stat-label">STATUS</span>
                    <strong className="word-status">
                      {status === 'playing' ? 'PLAYING' : status.toUpperCase()}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="word-board-section">
                <div className="board-meta">
                  <GameStatus status={status} wonLabel="WORD FOUND!" lostLabel="ROUND OVER" />
                  <span>
                    {MAX_GUESSES} TRIES · {wordLength} LETTERS
                  </span>
                </div>

                <div className="word-grid" role="grid" aria-label="Word guesses" style={{ '--word-length': wordLength } as CSSProperties}>
                  {Array.from({ length: MAX_GUESSES }, (_, row) => {
                    const guess = guesses[row]
                    const letters = guess?.word ?? (row === guesses.length ? currentGuess : '')

                    return (
                      <div className="word-row" role="row" key={row}>
                        {Array.from({ length: wordLength }, (_, col) => {
                          const letter = letters[col] ?? ''
                          const result = guess?.result[col]

                          return (
                            <div
                              className={`word-tile${letter ? ' filled' : ''}${result ? ` ${result} scored` : ''}`}
                              style={{ '--tile-delay': `${col * 95}ms` } as CSSProperties}
                              role="gridcell"
                              aria-label={`Row ${row + 1}, column ${col + 1}: ${letter || 'blank'}${result ? `, ${result}` : ''}`}
                              key={col}
                            >
                              {letter}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>

                <p className="word-message" role="status" aria-live="polite">
                  {message || '\u00a0'}
                </p>

                <div className="word-keyboard" aria-label="On-screen keyboard">
                  {keyboardRows.map((row, rowIndex) => (
                    <div className="word-keyboard-row" key={row}>
                      {rowIndex === 2 && (
                        <button
                          className="word-key wide"
                          onClick={() => handleKey('Enter')}
                          aria-label="Submit guess"
                        >
                          Enter
                        </button>
                      )}
                      {Array.from(row, (letter) => (
                        <button
                          className={`word-key ${colors[letter] ?? ''}`}
                          onClick={() => handleKey(letter)}
                          aria-label={`${letter}${colors[letter] ? `, ${colors[letter]}` : ''}`}
                          key={letter}
                        >
                          {letter}
                        </button>
                      ))}
                      {rowIndex === 2 && (
                        <button
                          className="word-key wide"
                          onClick={() => handleKey('Backspace')}
                          aria-label="Delete letter"
                        >
                          ⌫
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="word-card-bottom">
                <button className="control-button" onClick={() => setShowHowTo(true)}>
                  <span aria-hidden="true">ⓘ</span> How to play
                </button>
                <span>TYPE OR USE THE KEYBOARD</span>
              </div>
            </div>
          </div>

          <aside className="sidebar">
            <div className="tip-card">
              <span className="tip-icon">✳</span>
              <span className="aside-kicker">A QUICK REMINDER</span>
              <h3>
                Read the
                <br />
                colors.
              </h3>
              <p>
                Green means the right letter in the right spot. Orange means the letter is
                elsewhere.
              </p>
              <button onClick={() => setShowHowTo(true)}>
                How to play <span aria-hidden="true">→</span>
              </button>
            </div>
            <GameList activeGame="wordle" onSelectGame={onSelectGame} />
            <details className="word-bank">
              <summary>Possible words <span>{possibleWords.length}</span></summary>
              <div className="word-bank-content">
                <p>This answer list narrows after each guess. Other valid {wordLength}-letter words work too.</p>
                <label htmlFor="word-bank-search">Find a word</label>
                <input
                  id="word-bank-search"
                  type="search"
                  value={wordSearch}
                  onChange={(event) => setWordSearch(event.target.value)}
                  placeholder="Search words"
                />
                <div className="word-bank-list" aria-label="Possible answer words">
                  {matchingWords.length > 0 ? (
                    matchingWords.map((word) => <span key={word}>{word}</span>)
                  ) : (
                    <span className="word-bank-empty">No matching words</span>
                  )}
                </div>
              </div>
            </details>
            <div className="tiny-note">
              <span aria-hidden="true">ⓘ</span>
              <span>Each round picks a new word. There is no daily limit.</span>
            </div>
          </aside>
        </section>

        <section className="how-strip" aria-label="Quick controls">
          <div>
            <span className="how-number">01 /</span>
            <strong>TYPE</strong>
            <span>Enter {wordLength} letters</span>
          </div>
          <div>
            <span className="how-number">02 /</span>
            <strong>READ</strong>
            <span>Use the color clues</span>
          </div>
          <div>
            <span className="how-number">03 /</span>
            <strong>SOLVE</strong>
            <span>Find the hidden word</span>
          </div>
        </section>
      </main>

      {showHowTo && (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowHowTo(false)
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="word-how-title">
            <button
              className="modal-close"
              onClick={() => setShowHowTo(false)}
              aria-label="Close instructions"
              autoFocus
            >
              ×
            </button>
            <span className="aside-kicker">THE RULES ARE SIMPLE</span>
            <h2 id="word-how-title">
              How to play<span className="title-dot">.</span>
            </h2>
            <p>
              Find the {wordLength}-letter word in six guesses. Type letters or use the on-screen keyboard,
              then press Enter. Guesses must be real words.
            </p>
            <div className="instruction">
              <span>01</span>
              <div>
                <strong>Green</strong>
                <p>The letter is in the word and in the right place.</p>
              </div>
            </div>
            <div className="instruction">
              <span>02</span>
              <div>
                <strong>Orange</strong>
                <p>The letter is in the word, but in a different place.</p>
              </div>
            </div>
            <div className="instruction">
              <span>03</span>
              <div>
                <strong>Gray</strong>
                <p>The letter is not in the word, or its copies are already accounted for.</p>
              </div>
            </div>
            <button className="modal-play" onClick={() => setShowHowTo(false)}>
              Got it, let’s play <span aria-hidden="true">→</span>
            </button>
          </div>
        </div>
      )}

      {showResult && (
        <div
          className="result-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setResultDismissed(true)
          }}
        >
          {status === 'won' && <Fireworks />}
          <section
            className={`result-dialog result-${status}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="word-result-title"
            aria-describedby="word-result-description"
          >
            <div className="result-emblem" aria-hidden="true">
              {status === 'won' ? '✳' : '×'}
            </div>
            <span className="result-kicker">{status === 'won' ? 'WORD FOUND' : 'ROUND OVER'}</span>
            <h2 id="word-result-title">{status === 'won' ? 'You got it!' : 'Good try.'}</h2>
            <p id="word-result-description">
              {status === 'won'
                ? `The word was ${answer}.`
                : `The word was ${answer}. Give another one a go.`}
            </p>
            <div className="result-stats">
              <div>
                <span>WORD</span>
                <strong>{answer}</strong>
              </div>
              <div>
                <span>GUESSES</span>
                <strong>
                  {guesses.length} / {MAX_GUESSES}
                </strong>
              </div>
            </div>
            <button className="result-primary" onClick={() => newRound()} autoFocus>
              ↻ Play again
            </button>
            <button className="result-secondary" onClick={() => setResultDismissed(true)}>
              View guesses →
            </button>
          </section>
        </div>
      )}
    </div>
  )
}

export default Wordle
