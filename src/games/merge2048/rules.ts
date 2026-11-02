export const SIZE = 4
export const GOALS = [512, 1024, 2048] as const
export type Goal = 512 | 1024 | 2048

export type Board = number[][]
export type Direction = 'up' | 'down' | 'left' | 'right'
export type RotationDirection = 'clockwise' | 'counterclockwise'
export type Position = { row: number; col: number }
export type TileSlide = { from: Position; to: Position; value: number }

type LineSlide = { from: number; to: number; value: number }

export function emptyBoard(): Board {
  return Array.from({ length: SIZE }, () => Array(SIZE).fill(0))
}

export function addRandomTile(
  board: Board,
  random: () => number = Math.random,
): { board: Board; spawned: Position | null } {
  const empty: Position[] = []

  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      if (board[row][col] === 0) empty.push({ row, col })
    }
  }

  if (empty.length === 0) return { board, spawned: null }

  const spawned = empty[Math.floor(random() * empty.length)]
  const next = board.map((row) => [...row])
  next[spawned.row][spawned.col] = random() < 0.9 ? 2 : 4
  return { board: next, spawned }
}

export function newBoard(): Board {
  const board = emptyBoard()
  const firstTile = addRandomTile(board)
  const secondTile = addRandomTile(firstTile.board)

  return secondTile.board
}

export function teleportTile(board: Board, from: Position, to: Position): Board | null {
  if (!validPosition(from) || !validPosition(to)) return null
  const value = board[from.row][from.col]
  if (value === 0 || board[to.row][to.col] !== 0) return null

  const next = board.map((row) => [...row])
  next[from.row][from.col] = 0
  next[to.row][to.col] = value
  return next
}

export function swapTiles(board: Board, first: Position, second: Position): Board | null {
  if (!validPosition(first) || !validPosition(second)) return null
  const firstValue = board[first.row][first.col]
  const secondValue = board[second.row][second.col]
  if (firstValue === 0 || secondValue === 0 || firstValue === secondValue) return null

  const next = board.map((row) => [...row])
  next[first.row][first.col] = secondValue
  next[second.row][second.col] = firstValue
  return next
}

function validPosition({ row, col }: Position): boolean {
  return Number.isInteger(row) && Number.isInteger(col) && row >= 0 && row < SIZE && col >= 0 && col < SIZE
}

export function rotateOuterRing(board: Board, direction: RotationDirection = 'clockwise'): {
  board: Board
  slides: TileSlide[]
  changed: boolean
} {
  // Walk around the edge clockwise, visiting each corner only once.
  const ring: Position[] = []
  for (let col = 0; col < SIZE; col++) ring.push({ row: 0, col })
  for (let row = 1; row < SIZE; row++) ring.push({ row, col: SIZE - 1 })
  for (let col = SIZE - 2; col >= 0; col--) ring.push({ row: SIZE - 1, col })
  for (let row = SIZE - 2; row > 0; row--) ring.push({ row, col: 0 })

  const next = board.map((row) => [...row])
  const slides: TileSlide[] = []
  let changed = false
  const step = direction === 'clockwise' ? SIZE - 1 : -(SIZE - 1)

  for (let index = 0; index < ring.length; index++) {
    const from = ring[index]
    const to = ring[(index + step + ring.length) % ring.length]
    const value = board[from.row][from.col]
    next[to.row][to.col] = value
    if (value !== board[to.row][to.col]) changed = true
    if (value !== 0) slides.push({ from, to, value })
  }

  // Include stationary inner tiles so they stay visible during the slide.
  for (let row = 1; row < SIZE - 1; row++) {
    for (let col = 1; col < SIZE - 1; col++) {
      const value = board[row][col]
      if (value !== 0) slides.push({ from: { row, col }, to: { row, col }, value })
    }
  }

  return { board: next, slides, changed }
}

export function slideLine(line: number[]): {
  line: number[]
  points: number
  mergedAt: number[]
  slides: LineSlide[]
} {
  const tiles = line
    .map((value, from) => ({ value, from }))
    .filter((tile) => tile.value !== 0)
  const result: number[] = []
  const mergedAt: number[] = []
  const slides: LineSlide[] = []
  let points = 0

  for (let index = 0; index < tiles.length; index++) {
    const tile = tiles[index]
    const destination = result.length

    slides.push({ from: tile.from, to: destination, value: tile.value })

    if (tile.value === tiles[index + 1]?.value) {
      const merged = tile.value * 2
      result.push(merged)
      mergedAt.push(destination)
      slides.push({ from: tiles[index + 1].from, to: destination, value: tile.value })
      points += merged
      index++
    } else {
      result.push(tile.value)
    }
  }

  while (result.length < SIZE) result.push(0)
  return { line: result, points, mergedAt, slides }
}

function positionsForLine(direction: Direction, lineNumber: number): Position[] {
  return Array.from({ length: SIZE }, (_, offset) => {
    if (direction === 'left') return { row: lineNumber, col: offset }
    if (direction === 'right') return { row: lineNumber, col: SIZE - 1 - offset }
    if (direction === 'up') return { row: offset, col: lineNumber }
    return { row: SIZE - 1 - offset, col: lineNumber }
  })
}

export function moveBoard(
  board: Board,
  direction: Direction,
): { board: Board; points: number; changed: boolean; merged: Position[]; slides: TileSlide[] } {
  const next = emptyBoard()
  const merged: Position[] = []
  const slides: TileSlide[] = []
  let points = 0

  for (let lineNumber = 0; lineNumber < SIZE; lineNumber++) {
    const positions = positionsForLine(direction, lineNumber)
    const values = positions.map(({ row, col }) => board[row][col])
    const result = slideLine(values)

    positions.forEach(({ row, col }, offset) => {
      next[row][col] = result.line[offset]
    })
    for (const offset of result.mergedAt) merged.push(positions[offset])
    for (const slide of result.slides) {
      slides.push({ from: positions[slide.from], to: positions[slide.to], value: slide.value })
    }
    points += result.points
  }

  const changed = board.some((row, rowIndex) =>
    row.some((value, colIndex) => value !== next[rowIndex][colIndex]),
  )

  return { board: next, points, changed, merged, slides }
}

export function hasWon(board: Board, goal: Goal): boolean {
  return board.some((row) => row.some((value) => value >= goal))
}

export function canMove(board: Board): boolean {
  for (let row = 0; row < SIZE; row++) {
    for (let col = 0; col < SIZE; col++) {
      const value = board[row][col]
      if (value === 0) return true
      if (col + 1 < SIZE && value === board[row][col + 1]) return true
      if (row + 1 < SIZE && value === board[row + 1][col]) return true
    }
  }

  return false
}
