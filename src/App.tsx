import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { gameFromSearch, gameUrl, type GameName } from './games/catalog'
import Minesweeper from './games/minesweeper/Minesweeper'
import Merge2048 from './games/merge2048/Merge2048'
import Sudoku from './games/sudoku/Sudoku'
import Nonograms from './games/nonograms/Nonograms'
import { clearGameProgress } from './games/progress'
import './App.css'

const Wordle = lazy(() => import('./games/wordle/Wordle'))

function App() {
  const [activeGame, setActiveGame] = useState<GameName>(() => gameFromSearch(window.location.search))
  const [dark, setDark] = useState(() => {
    const saved =
      localStorage.getItem('fieldnotes-theme') ?? localStorage.getItem('fieldnotes-mines-theme')
    return saved === 'dark'
  })

  useEffect(() => {
    localStorage.setItem('fieldnotes-theme', dark ? 'dark' : 'light')
  }, [dark])

  const changeGame = useCallback((game: GameName) => {
    if (game === activeGame) return
    clearGameProgress(activeGame)
    clearGameProgress(game)
    setActiveGame(game)
  }, [activeGame])

  useEffect(() => {
    const onBackOrForward = () => changeGame(gameFromSearch(window.location.search))
    window.addEventListener('popstate', onBackOrForward)
    return () => window.removeEventListener('popstate', onBackOrForward)
  }, [changeGame])

  function selectGame(game: GameName) {
    if (game === activeGame) return
    const url = gameUrl(game, window.location.href)
    window.history.pushState(null, '', url)
    changeGame(game)
  }

  return (
    <div className={`app-shell${dark ? ' dark' : ''}`}>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="Fieldnotes Game Lab home">
          <span className="brand-mark" aria-hidden="true">
            ✳
          </span>
          <span>
            FIELD<span className="brand-light">NOTES</span>
            <small>GAME LAB / 001</small>
          </span>
        </a>
        <div className="header-right">
          <span className="header-edition">A LITTLE GAME FOR YOUR BIG BRAIN</span>
          <button
            className="icon-button theme-button"
            onClick={() => setDark(!dark)}
            aria-label={dark ? 'Use light theme' : 'Use dark theme'}
            title={dark ? 'Use light theme' : 'Use dark theme'}
          >
            <span aria-hidden="true">{dark ? '☀' : '☾'}</span>
          </button>
        </div>
      </header>

      {activeGame === 'minesweeper' && <Minesweeper onSelectGame={selectGame} />}
      {activeGame === 'wordle' && (
        <Suspense fallback={<main aria-busy="true"><p role="status">Loading Wordle…</p></main>}>
          <Wordle onSelectGame={selectGame} />
        </Suspense>
      )}
      {activeGame === 'merge2048' && <Merge2048 onSelectGame={selectGame} />}
      {activeGame === 'sudoku' && <Sudoku onSelectGame={selectGame} />}
      {activeGame === 'nonograms' && <Nonograms onSelectGame={selectGame} />}

      <footer>
        <span>
          FIELDNOTES <span className="footer-star">✳</span> GAME LAB
        </span>
        <span>MADE FOR CURIOUS MINDS</span>
      </footer>
    </div>
  )
}

export default App
