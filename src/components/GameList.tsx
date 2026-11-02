import { GAMES, type GameName } from '../games/catalog'

type GameListProps = {
  activeGame: GameName
  onSelectGame: (game: GameName) => void
}

function GameList({ activeGame, onSelectGame }: GameListProps) {
  return (
    <div className="game-list">
      <span className="aside-kicker">THE COLLECTION</span>
      <h3>Pick a game.</h3>
      <div className="game-list-items">
        {GAMES.map((game) => (
          <button
            className={activeGame === game.id ? 'active' : ''}
            onClick={() => onSelectGame(game.id)}
            aria-current={activeGame === game.id ? 'page' : undefined}
            key={game.id}
          >
            <span className="game-list-number">{game.number}</span>
            <span>{game.label}</span>
            <span className="game-list-arrow" aria-hidden="true">
              {activeGame === game.id ? '●' : '→'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export default GameList
