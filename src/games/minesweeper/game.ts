export type Difficulty = 'beginner' | 'intermediate' | 'expert'
export type Status = 'ready' | 'playing' | 'won' | 'lost'

export type Cell = {
  mine: boolean
  adjacent: number
  revealed: boolean
  flagged: boolean
  exploded: boolean
}

export type Board = Cell[]

export const settings: Record<
  Difficulty,
  { rows: number; cols: number; mines: number; label: string }
> = {
  beginner: { rows: 9, cols: 9, mines: 9, label: 'Beginner' },
  intermediate: { rows: 16, cols: 16, mines: 16, label: 'Intermediate' },
  expert: { rows: 16, cols: 30, mines: 30, label: 'Expert' },
}

export function neighbors(index: number, rows: number, cols: number): number[] {
  const row = Math.floor(index / cols)
  const col = index % cols
  const result: number[] = []

  for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      const newRow = row + rowOffset
      const newCol = col + colOffset
      const isCurrentCell = rowOffset === 0 && colOffset === 0
      const isOnBoard = newRow >= 0 && newRow < rows && newCol >= 0 && newCol < cols

      if (!isCurrentCell && isOnBoard) {
        result.push(newRow * cols + newCol)
      }
    }
  }

  return result
}

export function emptyBoard(rows: number, cols: number): Board {
  return Array.from({ length: rows * cols }, () => ({
    mine: false,
    adjacent: 0,
    revealed: false,
    flagged: false,
    exploded: false,
  }))
}

export function makeBoard(rows: number, cols: number, mines: number, safeIndex: number): Board {
  const board = emptyBoard(rows, cols)
  const protectedCells = new Set([safeIndex, ...neighbors(safeIndex, rows, cols)])
  const candidates = board.map((_, index) => index).filter((index) => !protectedCells.has(index))

  // Shuffle the available positions before placing mines.
  for (let index = candidates.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    const temporary = candidates[index]
    candidates[index] = candidates[randomIndex]
    candidates[randomIndex] = temporary
  }

  for (const index of candidates.slice(0, mines)) {
    board[index].mine = true
  }

  board.forEach((cell, index) => {
    if (cell.mine) return

    let mineCount = 0

    for (const neighbor of neighbors(index, rows, cols)) {
      if (board[neighbor].mine) {
        mineCount++
      }
    }

    cell.adjacent = mineCount
  })

  return board
}

export function reveal(board: Board, index: number, rows: number, cols: number): Board {
  if (board[index].revealed || board[index].flagged) return board

  const next = board.map((cell) => ({ ...cell }))
  const stack = [index]

  while (stack.length > 0) {
    const currentIndex = stack.pop()!
    const cell = next[currentIndex]

    if (cell.revealed || cell.flagged) continue

    cell.revealed = true

    if (cell.mine) {
      cell.exploded = true
      break
    }

    if (cell.adjacent === 0) {
      for (const neighbor of neighbors(currentIndex, rows, cols)) {
        if (!next[neighbor].revealed && !next[neighbor].flagged) {
          stack.push(neighbor)
        }
      }
    }
  }

  return next
}

export function chord(board: Board, index: number, rows: number, cols: number): Board {
  const cell = board[index]
  if (!cell.revealed || cell.adjacent === 0) return board

  const surrounding = neighbors(index, rows, cols)
  const flagCount = surrounding.filter((neighbor) => board[neighbor].flagged).length
  if (flagCount !== cell.adjacent) return board

  let next = board

  for (const neighbor of surrounding) {
    if (next[neighbor].revealed || next[neighbor].flagged) continue

    next = reveal(next, neighbor, rows, cols)
    if (next.some((cell) => cell.exploded)) break
  }

  return next
}

export function hasWon(board: Board): boolean {
  return board.every((cell) => cell.mine || cell.revealed)
}
