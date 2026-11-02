import test from 'node:test'
import assert from 'node:assert/strict'
import { GAMES, gameFromSearch, gameUrl } from '../src/games/catalog.ts'

test('every collection entry has a unique route and round-trips through navigation', () => {
  assert.equal(new Set(GAMES.map(game => game.id)).size, GAMES.length)
  assert.equal(new Set(GAMES.map(game => game.query)).size, GAMES.length)
  for (const game of GAMES) {
    const url = gameUrl(game.id, 'https://example.test/lab?game=wordle&theme=dark#top')
    assert.equal(gameFromSearch(url.search), game.id)
    assert.equal(url.pathname, '/lab')
    assert.equal(url.searchParams.get('theme'), 'dark')
    assert.equal(url.hash, '#top')
  }
  assert.equal(gameFromSearch('?game=unknown'), 'minesweeper')
  assert.equal(gameFromSearch(''), 'minesweeper')
})
