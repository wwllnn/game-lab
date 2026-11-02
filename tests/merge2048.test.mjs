import test from 'node:test'
import assert from 'node:assert/strict'
import {
  addRandomTile,
  canMove,
  emptyBoard,
  hasWon,
  moveBoard,
  newBoard,
  rotateOuterRing,
  slideLine,
  swapTiles,
  teleportTile,
} from '../src/games/merge2048/rules.ts'

test('a new board starts with two tiles', () => {
  const board = newBoard()
  assert.equal(board.length, 4)
  assert.ok(board.every((row) => row.length === 4))
  assert.equal(board.flat().filter(Boolean).length, 2)
})

test('a new tile appears in an empty cell without changing the original board', () => {
  const board = emptyBoard()
  const randomValues = [0, 0.95]
  const result = addRandomTile(board, () => randomValues.shift())

  assert.deepEqual(result.spawned, { row: 0, col: 0 })
  assert.equal(result.board[0][0], 4)
  assert.equal(board[0][0], 0)
})

test('teleport moves one tile to an empty cell without changing the original board', () => {
  const board = emptyBoard()
  board[0][0] = 8
  board[1][1] = 4

  const moved = teleportTile(board, { row: 0, col: 0 }, { row: 3, col: 2 })
  assert.equal(moved[0][0], 0)
  assert.equal(moved[3][2], 8)
  assert.equal(moved[1][1], 4)
  assert.equal(board[0][0], 8)
  assert.equal(board[3][2], 0)

  assert.equal(teleportTile(board, { row: 0, col: 0 }, { row: 1, col: 1 }), null)
  assert.equal(teleportTile(board, { row: 2, col: 2 }, { row: 3, col: 2 }), null)
})

test('swap exchanges two different numbered tiles and preserves the original board', () => {
  const board = emptyBoard()
  board[0][0] = 8
  board[1][1] = 4
  board[2][2] = 8
  const first = { row: 0, col: 0 }
  const second = { row: 1, col: 1 }

  const swapped = swapTiles(board, first, second)
  assert.equal(swapped[0][0], 4)
  assert.equal(swapped[1][1], 8)
  assert.deepEqual(swapped.flat().sort((a, b) => a - b), board.flat().sort((a, b) => a - b))
  assert.equal(board[0][0], 8)
  assert.equal(board[1][1], 4)
  assert.equal(swapTiles(board, first, first), null)
  assert.equal(swapTiles(board, first, { row: 2, col: 2 }), null)
  assert.equal(swapTiles(board, first, { row: 3, col: 3 }), null)
  assert.equal(swapTiles(board, first, { row: 4, col: 0 }), null)
})

test('outer ring rotates a whole side clockwise while inner tiles stay in place', () => {
  const board = [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2048, 4096],
    [8192, 16384, 32768, 65536],
  ]
  const original = board.map((row) => [...row])
  const rotated = rotateOuterRing(board)
  assert.equal(rotated.changed, true)
  assert.deepEqual(rotated.board, [
    [8192, 512, 32, 2],
    [16384, 64, 128, 4],
    [32768, 1024, 2048, 8],
    [65536, 4096, 256, 16],
  ])
  assert.deepEqual(board, original)
  assert.equal(rotated.slides.length, 16)
  for (const slide of rotated.slides) {
    assert.equal(board[slide.from.row][slide.from.col], slide.value)
    assert.equal(rotated.board[slide.to.row][slide.to.col], slide.value)
  }

  let cycled = board
  for (let count = 0; count < 4; count++) cycled = rotateOuterRing(cycled).board
  assert.deepEqual(cycled, original)
})

test('ring rotation moves empty spaces and detects a ring that would not change', () => {
  const board = emptyBoard()
  board[0][3] = 2
  board[1][1] = 8
  const rotated = rotateOuterRing(board)
  assert.equal(rotated.board[0][3], 0)
  assert.equal(rotated.board[3][3], 2)
  assert.equal(rotated.board[1][1], 8)

  board[0][3] = 0
  assert.equal(rotateOuterRing(board).changed, false)
})

test('counterclockwise rotation reverses clockwise rotation and keeps its animation paths correct', () => {
  const board = [
    [2, 4, 8, 16],
    [32, 64, 128, 256],
    [512, 1024, 2048, 4096],
    [8192, 16384, 32768, 65536],
  ]
  const rotated = rotateOuterRing(board, 'counterclockwise')
  assert.deepEqual(rotated.board, [
    [16, 256, 4096, 65536],
    [8, 64, 128, 32768],
    [4, 1024, 2048, 16384],
    [2, 32, 512, 8192],
  ])
  for (const slide of rotated.slides) {
    assert.equal(board[slide.from.row][slide.from.col], slide.value)
    assert.equal(rotated.board[slide.to.row][slide.to.col], slide.value)
  }
  assert.deepEqual(rotateOuterRing(rotated.board, 'clockwise').board, board)
})

test('a tile merges only once per move', () => {
  assert.deepEqual(slideLine([2, 2, 2, 2]), {
    line: [4, 4, 0, 0],
    points: 8,
    mergedAt: [0, 1],
    slides: [
      { from: 0, to: 0, value: 2 },
      { from: 1, to: 0, value: 2 },
      { from: 2, to: 1, value: 2 },
      { from: 3, to: 1, value: 2 },
    ],
  })
  assert.deepEqual(slideLine([2, 2, 4, 4]), {
    line: [4, 8, 0, 0],
    points: 12,
    mergedAt: [0, 1],
    slides: [
      { from: 0, to: 0, value: 2 },
      { from: 1, to: 0, value: 2 },
      { from: 2, to: 1, value: 4 },
      { from: 3, to: 1, value: 4 },
    ],
  })
  assert.deepEqual(slideLine([2, 2, 2, 0]).line, [4, 2, 0, 0])
})

test('moves work in all four directions and do not mutate the input', () => {
  const board = [
    [2, 0, 0, 0],
    [2, 0, 0, 0],
    [4, 0, 0, 0],
    [4, 0, 0, 0],
  ]

  const up = moveBoard(board, 'up')
  assert.deepEqual(
    up.board.map((row) => row[0]),
    [4, 8, 0, 0],
  )
  assert.equal(up.points, 12)
  assert.deepEqual(up.merged, [
    { row: 0, col: 0 },
    { row: 1, col: 0 },
  ])
  assert.deepEqual(up.slides.slice(0, 4), [
    { from: { row: 0, col: 0 }, to: { row: 0, col: 0 }, value: 2 },
    { from: { row: 1, col: 0 }, to: { row: 0, col: 0 }, value: 2 },
    { from: { row: 2, col: 0 }, to: { row: 1, col: 0 }, value: 4 },
    { from: { row: 3, col: 0 }, to: { row: 1, col: 0 }, value: 4 },
  ])

  const down = moveBoard(board, 'down')
  assert.deepEqual(
    down.board.map((row) => row[0]),
    [0, 0, 4, 8],
  )
  assert.equal(down.points, 12)

  const sideways = [
    [2, 0, 2, 4],
    [0, 4, 4, 0],
    [2, 0, 0, 2],
    [0, 0, 0, 0],
  ]
  assert.deepEqual(moveBoard(sideways, 'left').board, [
    [4, 4, 0, 0],
    [8, 0, 0, 0],
    [4, 0, 0, 0],
    [0, 0, 0, 0],
  ])
  assert.deepEqual(moveBoard(sideways, 'right').board, [
    [0, 0, 4, 4],
    [0, 0, 0, 8],
    [0, 0, 0, 4],
    [0, 0, 0, 0],
  ])
  assert.deepEqual(board[0], [2, 0, 0, 0])
  assert.equal(moveBoard(emptyBoard(), 'left').changed, false)
})

test('each goal wins at its target, and no-moves checks reflect the whole grid', () => {
  const stuck = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ]
  assert.equal(canMove(stuck), false)
  stuck[0][0] = 4
  assert.equal(canMove(stuck), true)
  stuck[3][3] = 512
  assert.equal(hasWon(stuck, 512), true)
  assert.equal(hasWon(stuck, 1024), false)
  assert.equal(hasWon(stuck, 2048), false)
  stuck[3][3] = 1024
  assert.equal(hasWon(stuck, 1024), true)
  assert.equal(hasWon(stuck, 2048), false)
  stuck[3][3] = 2048
  assert.equal(hasWon(stuck, 2048), true)
})
