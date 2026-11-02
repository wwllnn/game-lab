import { conflicts, createPuzzle, DIFFICULTIES, DIGITS, type Difficulty, type Puzzle } from './rules.ts'

export type Entry = { values: number[]; notes: number[][] }
export type Session = Puzzle & Entry & { difficulty: Difficulty; seconds: number; hints: number }

export function newSession(difficulty: Difficulty): Session {
  const puzzle = createPuzzle(difficulty)
  return {
    ...puzzle,
    difficulty,
    values: [...puzzle.givens],
    notes: Array.from({ length: 81 }, () => []),
    seconds: 0,
    hints: 0,
  }
}

export function restoreSession(raw: string | null): Session | null {
  try {
    const saved = JSON.parse(raw ?? 'null')
    const validBoard = (board: unknown, allowEmpty: boolean): board is number[] => Array.isArray(board) && board.length === 81 && board.every(v => Number.isInteger(v) && v >= (allowEmpty ? 0 : 1) && v <= 9)
    if (!saved || !DIFFICULTIES.includes(saved.difficulty) || !validBoard(saved.givens, true) ||
      !validBoard(saved.solution, false) || !validBoard(saved.values, true) || conflicts(saved.solution).size ||
      !saved.givens.every((v: number, i: number) => !v || (v === saved.solution[i] && v === saved.values[i])) ||
      !Array.isArray(saved.notes) || saved.notes.length !== 81 || !saved.notes.every((n: unknown) => Array.isArray(n) && n.every(v => DIGITS.includes(v))) ||
      !Number.isSafeInteger(saved.seconds) || saved.seconds < 0 || !Number.isSafeInteger(saved.hints) || saved.hints < 0) return null
    // Ignore obsolete fields from older saves, including daily-puzzle metadata.
    const { givens, solution, values, notes, difficulty, seconds, hints } = saved
    return { givens, solution, values, notes, difficulty, seconds, hints }
  } catch { return null }
}
