export const GAMES = [
  { id: 'minesweeper', label: 'Minesweeper', number: '01', query: null },
  { id: 'wordle', label: 'Wordle', number: '02', query: 'wordle' },
  { id: 'merge2048', label: '2048', number: '03', query: '2048' },
  { id: 'sudoku', label: 'Sudoku', number: '04', query: 'sudoku' },
  { id: 'nonograms', label: 'Nonograms', number: '05', query: 'nonograms' },
] as const

export type GameName = typeof GAMES[number]['id']

export function gameFromSearch(search: string): GameName {
  const query = new URLSearchParams(search).get('game')
  return GAMES.find(game => game.query === query)?.id ?? 'minesweeper'
}

export function gameUrl(game: GameName, currentUrl: string): URL {
  const url = new URL(currentUrl)
  const query = GAMES.find(entry => entry.id === game)!.query
  if (query) url.searchParams.set('game', query)
  else url.searchParams.delete('game')
  return url
}
