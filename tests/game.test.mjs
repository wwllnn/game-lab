import test from 'node:test'
import assert from 'node:assert/strict'
import {
  chord,
  emptyBoard,
  hasWon,
  makeBoard,
  neighbors,
  reveal,
} from '../src/games/minesweeper/game.ts'
import { mineWave, MINE_WAVE_SPREAD_MS } from '../src/games/minesweeper/mineWave.ts'

test('first reveal and its neighbors are safe across board sizes', () => {
  for (const [rows, cols, mines, first] of [
    [9, 9, 10, 0],
    [9, 9, 10, 40],
    [16, 16, 40, 255],
    [16, 30, 99, 230],
  ]) {
    const board = makeBoard(rows, cols, mines, first)
    assert.equal(board.filter((cell) => cell.mine).length, mines)
    for (const index of [first, ...neighbors(first, rows, cols)])
      assert.equal(board[index].mine, false)
    board.forEach((cell, index) => {
      if (!cell.mine)
        assert.equal(
          cell.adjacent,
          neighbors(index, rows, cols).filter((n) => board[n].mine).length,
        )
    })
  }
})

test('revealing zero expands, and flagging protects a cell', () => {
  const board = emptyBoard(3, 3)
  board[8].mine = true
  for (const n of neighbors(8, 3, 3)) board[n].adjacent = 1
  board[0].flagged = true
  const result = reveal(board, 1, 3, 3)
  assert.equal(result[0].revealed, false)
  assert.equal(result[8].revealed, false)
  assert.equal(result[1].revealed, true)
  assert.equal(result[4].adjacent, 1)
  assert.equal(hasWon(result), false)
})

test('chording reveals neighbors and detects incorrect flags', () => {
  const board = emptyBoard(3, 3)
  board[0].mine = true
  for (const n of neighbors(0, 3, 3)) board[n].adjacent = 1
  board[4].revealed = true
  board[0].flagged = true
  const safe = chord(board, 4, 3, 3)
  assert.equal(
    safe.some((cell) => cell.exploded),
    false,
  )
  assert.equal(hasWon(safe), true)
  const wrong = emptyBoard(3, 3)
  wrong[0].mine = true
  for (const n of neighbors(0, 3, 3)) wrong[n].adjacent = 1
  wrong[4].revealed = true
  wrong[1].flagged = true
  assert.equal(
    chord(wrong, 4, 3, 3).some((cell) => cell.exploded),
    true,
  )
})

test('mine wave expands outward from the mine that exploded', () => {
  const board = emptyBoard(5, 5)
  for (const index of [12, 13, 1, 0]) board[index].mine = true
  board[12].exploded = true
  const wave = mineWave(board, 5)
  assert.equal(wave.origin, 12)
  assert.equal(wave.delays.get(12), 0)
  assert.ok(wave.delays.get(13) < wave.delays.get(1))
  assert.ok(wave.delays.get(1) < wave.delays.get(0))
  assert.equal(wave.delays.get(0), MINE_WAVE_SPREAD_MS)
})
