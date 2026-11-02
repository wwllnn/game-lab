export type Difficulty = 'easy' | 'medium' | 'hard'
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard']
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9]
export type Puzzle = { givens: number[]; solution: number[] }

export function peers(a: number, b: number): boolean {
  return Math.floor(a / 9) === Math.floor(b / 9) || a % 9 === b % 9 ||
    (Math.floor(a / 27) === Math.floor(b / 27) && Math.floor(a % 9 / 3) === Math.floor(b % 9 / 3))
}

export function candidates(board: number[], index: number): number[] {
  return DIGITS.filter(value => !board.some((other, i) => i !== index && other === value && peers(i, index)))
}

export function conflicts(board: number[]): Set<number> {
  const result = new Set<number>()
  board.forEach((value, i) => {
    if (value && board.some((other, j) => i !== j && value === other && peers(i, j))) result.add(i)
  })
  return result
}

/** Count only as far as needed to prove uniqueness. Input is never mutated. */
export function countSolutions(input: number[], limit = 2): number {
  if (input.length !== 81 || input.some(v => !Number.isInteger(v) || v < 0 || v > 9) || conflicts(input).size) return 0
  const board = [...input]
  function search(): number {
    let index = -1
    let options = DIGITS
    for (let i = 0; i < 81; i++) {
      if (board[i]) continue
      const available = candidates(board, i)
      if (!available.length) return 0
      if (index === -1 || available.length < options.length) {
        index = i
        options = available
        if (options.length === 1) break
      }
    }
    if (index === -1) return 1
    let count = 0
    for (const value of options) {
      board[index] = value
      count += search()
      if (count >= limit) break
    }
    board[index] = 0
    return Math.min(count, limit)
  }
  return search()
}

function shuffled<T>(items: T[], random: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function createPuzzle(difficulty: Difficulty, random = Math.random): Puzzle {
  const groups = [0, 1, 2]
  const order = () => shuffled(groups, random).flatMap(group => shuffled(groups, random).map(i => group * 3 + i))
  const rows = order()
  const cols = order()
  const digits = shuffled(DIGITS, random)
  const solution = rows.flatMap(row => cols.map(col => digits[(row * 3 + Math.floor(row / 3) + col) % 9]))
  const givens = [...solution]
  const target = { easy: 42, medium: 34, hard: 28 }[difficulty]
  let remaining = 81
  for (const index of shuffled(Array.from({ length: 81 }, (_, i) => i), random)) {
    const value = givens[index]
    givens[index] = 0
    if (countSolutions(givens) !== 1) givens[index] = value
    else remaining--
    if (remaining <= target) break
  }
  return { givens, solution }
}
