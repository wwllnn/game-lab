export const SIZES = [5, 10, 15] as const
export type Size = typeof SIZES[number]
export type Mark = 0 | 1 | -1
export type Puzzle = {
  id: string
  name: string
  size: Size
  solution: number[]
  rows: number[][]
  columns: number[][]
}

export function runs(line: number[]): number[] {
  const clues: number[] = []
  let count = 0
  for (const value of [...line, 0]) {
    if (value === 1) count++
    else if (count) { clues.push(count); count = 0 }
  }
  return clues.length ? clues : [0]
}

export function getClues(solution: number[], size: number) {
  return {
    rows: Array.from({ length: size }, (_, row) => runs(solution.slice(row * size, (row + 1) * size))),
    columns: Array.from({ length: size }, (_, col) => runs(Array.from({ length: size }, (_, row) => solution[row * size + col]))),
  }
}

// Original pixel illustrations. Larger boards use their own artwork, not scaled cells.
const ART: Record<Size, { name: string; lines: string[] }[]> = {
  5: [
    { name: 'Little heart', lines: ['.#.#.', '#####', '#####', '.###.', '..#..'] },
    { name: 'Evergreen', lines: ['..#..', '.###.', '#####', '..#..', '.###.'] },
    { name: 'A little home', lines: ['..#..', '.###.', '#####', '#.#.#', '#####'] },
    { name: 'Diamond', lines: ['..#..', '.###.', '#####', '.###.', '..#..'] },
  ],
  10: [
    { name: 'Morning coffee', lines: ['..........', '..........', '..........', '.######...', '.########.', '.######.#.', '.########.', '.######...', '..####....', '##########'] },
    { name: 'Love note', lines: ['.###.###..', '#########.', '#########.', '#########.', '.#######..', '..#####...', '...###....', '....#.....', '..........', '..........'] },
    { name: 'Mountain cabin', lines: ['....#.....', '...###....', '..#####...', '.#######..', '#########.', '.#######..', '.##..###..', '.##..###..', '.#######..', '##########'] },
    { name: 'Spruce', lines: ['....#.....', '...###....', '..#####...', '...###....', '..#####...', '.#######..', '..#####...', '.#######..', '#########.', '...###....'] },
  ],
  15: [
    { name: 'Lift off', lines: ['.......#.......', '......###......', '.....#####.....', '.....#####.....', '.....#####.....', '.....#...#.....', '.....#...#.....', '.....#####.....', '....#######....', '...#########...', '..###########..', '..##.#####.##..', '.....#.#.#.....', '......###......', '.......#.......'] },
    { name: 'Forest friend', lines: ['.......#.......', '......###......', '.....#####.....', '....#######....', '.....#####.....', '....#######....', '...#########...', '....#######....', '...#########...', '..###########..', '.#############.', '......###......', '......###......', '....#######....', '...............'] },
    { name: 'Love in pixels', lines: ['...............', '..####...####..', '.######.######.', '.#############.', '.#############.', '.#############.', '..###########..', '...#########...', '....#######....', '.....#####.....', '......###......', '.......#.......', '...............', '...............', '...............'] },
    { name: 'A place to stay', lines: ['.......#.......', '......###......', '.....#####.....', '....#######....', '...#########...', '..###########..', '.#############.', '..###########..', '..##..###..##..', '..##..###..##..', '..###########..', '..####...####..', '..####...####..', '..####...####..', '###############'] },
  ],
}

export function puzzlesFor(size: Size): Puzzle[] {
  return ART[size].flatMap((art, index) => {
    const original = art.lines.flatMap(line => [...line].map(cell => Number(cell === '#')))
    const seen = new Set<string>()
    return [0, 1, 2, 3].flatMap(turn => {
      let solution = [...original]
      for (let rotation = 0; rotation < turn; rotation++) {
        const previous = solution
        solution = previous.map((_, i) => previous[(size - 1 - i % size) * size + Math.floor(i / size)])
      }
      const signature = solution.join('')
      if (seen.has(signature)) return []
      seen.add(signature)
      return [{ id: `${size}-${index}-${turn}`, name: art.name, size, solution, ...getClues(solution, size) }]
    })
  })
}

export function choosePuzzle(size: Size, previousId?: string, random = Math.random): Puzzle {
  const catalog = puzzlesFor(size).filter(puzzle => puzzle.id !== previousId)
  return catalog[Math.floor(random() * catalog.length)]
}

export function isSolved(marks: Mark[], puzzle: Puzzle): boolean {
  return marks.length === puzzle.solution.length && marks.every((mark, i) => (mark === 1) === (puzzle.solution[i] === 1))
}

export function lineComplete(line: Mark[], clues: number[]): boolean {
  return runs(line).join(',') === clues.join(',')
}

/** Enumerate legal placements of the runs; used to verify the illustration catalog. */
export function linePatterns(size: number, clues: number[]): number[][] {
  if (clues.length === 1 && clues[0] === 0) return [Array(size).fill(0)]
  const patterns: number[][] = []
  function place(index: number, start: number, line: number[]) {
    if (index === clues.length) { patterns.push(line); return }
    const needed = clues.slice(index).reduce((sum, n) => sum + n, 0) + clues.length - index - 1
    for (let offset = start; offset <= size - needed; offset++) {
      const next = [...line]
      next.fill(1, offset, offset + clues[index])
      place(index + 1, offset + clues[index] + 1, next)
    }
  }
  place(0, 0, Array(size).fill(0))
  return patterns
}

export function countSolutions(puzzle: Puzzle, limit = 2): number {
  const { size } = puzzle
  const initialRows = puzzle.rows.map(clues => linePatterns(size, clues))
  const initialCols = puzzle.columns.map(clues => linePatterns(size, clues))
  function search(rows: number[][][], columns: number[][][]): number {
    let changed = true
    while (changed) {
      changed = false
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (!rows[row].length || !columns[col].length) return 0
          const rowValues = new Set(rows[row].map(pattern => pattern[col]))
          const colValues = new Set(columns[col].map(pattern => pattern[row]))
          const nextRows = rows[row].filter(pattern => colValues.has(pattern[col]))
          const nextCols = columns[col].filter(pattern => rowValues.has(pattern[row]))
          if (nextRows.length !== rows[row].length || nextCols.length !== columns[col].length) changed = true
          rows[row] = nextRows
          columns[col] = nextCols
        }
      }
    }
    if (rows.some(patterns => !patterns.length) || columns.some(patterns => !patterns.length)) return 0
    const index = rows.reduce((best, options, i) => options.length > 1 && (best === -1 || options.length < rows[best].length) ? i : best, -1)
    if (index === -1) return 1
    let count = 0
    for (const pattern of rows[index]) {
      const next = rows.map(options => [...options])
      next[index] = [pattern]
      count += search(next, columns.map(options => [...options]))
      if (count >= limit) return limit
    }
    return count
  }
  return search(initialRows, initialCols)
}

/** Include skipped cells when a pointer moves quickly across the board. */
export function strokeCells(from: number, to: number, size: number): number[] {
  const x0 = from % size
  const y0 = Math.floor(from / size)
  const dx = to % size - x0
  const dy = Math.floor(to / size) - y0
  const steps = Math.max(Math.abs(dx), Math.abs(dy))
  return Array.from({ length: steps + 1 }, (_, step) => {
    const fraction = steps ? step / steps : 0
    return Math.round(y0 + dy * fraction) * size + Math.round(x0 + dx * fraction)
  })
}
