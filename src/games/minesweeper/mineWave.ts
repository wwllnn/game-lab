import type { Board } from './game'

export const MINE_WAVE_SPREAD_MS = 1250
export const MINE_WAVE_SETTLE_MS = 550

export function mineWave(board: Board, cols: number) {
  const origin = board.findIndex((cell) => cell.exploded)
  if (origin < 0) return null

  const rows = board.length / cols
  const originRow = Math.floor(origin / cols)
  const originCol = origin % cols

  function distanceFromOrigin(index: number): number {
    const row = Math.floor(index / cols)
    const col = index % cols
    return Math.hypot(row - originRow, col - originCol)
  }

  const mineIndexes = board.flatMap((cell, index) => (cell.mine ? [index] : []))
  const farthestColumn = Math.max(originCol, cols - 1 - originCol)
  const farthestRow = Math.max(originRow, rows - 1 - originRow)
  const farthestDistance = Math.hypot(farthestColumn, farthestRow)

  const delays = new Map(
    mineIndexes.map((index) => {
      const distance = distanceFromOrigin(index)
      const delay = Math.round((distance / Math.max(farthestDistance, 1)) * MINE_WAVE_SPREAD_MS)
      return [index, delay]
    }),
  )

  return { origin, delays, scale: Math.ceil(farthestDistance * 2 + 2) }
}
