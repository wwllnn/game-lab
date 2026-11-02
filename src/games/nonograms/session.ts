import { choosePuzzle, isSolved, puzzlesFor, SIZES, type Mark, type Puzzle, type Size } from './rules.ts'
export { NONOGRAMS_STORAGE_KEY as STORAGE_KEY } from '../progress.ts'

export type Session = {
  puzzle: Puzzle
  marks: Mark[]
  history: Mark[][]
  hints: number
  seconds: number
}
export type Action =
  | { type: 'paint'; marks: Mark[] }
  | { type: 'hint' }
  | { type: 'undo' }
  | { type: 'tick'; seconds: number }
  | { type: 'replace'; session: Session }


export function newSession(size: Size, previousId?: string): Session {
  const puzzle = choosePuzzle(size, previousId)
  return { puzzle, marks: Array<Mark>(size * size).fill(0), history: [], hints: 0, seconds: 0 }
}

export function restoreSession(raw: string | null): Session | null {
  try {
    const saved = JSON.parse(raw ?? 'null')
    if (!saved || !SIZES.includes(saved.puzzle?.size)) return null
    // Trust the catalog, not a serialized solution or clue list.
    const puzzle = puzzlesFor(saved.puzzle.size).find(p => p.id === saved.puzzle.id)
    if (!puzzle) return null
    const validMarks = (value: unknown): value is Mark[] => Array.isArray(value) && value.length === puzzle.size ** 2 && value.every(v => v === 0 || v === 1 || v === -1)
    if (!validMarks(saved.marks) || !Array.isArray(saved.history) || saved.history.length > 100 || !saved.history.every(validMarks) ||
      !Number.isSafeInteger(saved.seconds) || saved.seconds < 0 || !Number.isSafeInteger(saved.hints) || saved.hints < 0) return null
    return { puzzle, marks: saved.marks, history: saved.history, hints: saved.hints, seconds: saved.seconds }
  } catch { return null }
}

export function sessionReducer(state: Session, action: Action): Session {
  if (action.type === 'replace') return action.session
  if (isSolved(state.marks, state.puzzle)) return state
  if (action.type === 'tick') return { ...state, seconds: state.seconds + action.seconds }
  if (action.type === 'undo') {
    const marks = state.history.at(-1)
    return marks ? { ...state, marks, history: state.history.slice(0, -1) } : state
  }
  let marks: Mark[]
  let hints = state.hints
  if (action.type === 'hint') {
    const index = state.marks.findIndex((mark, i) => state.puzzle.solution[i] === 1 ? mark !== 1 : mark === 1)
    if (index === -1) return state
    marks = [...state.marks]
    marks[index] = state.puzzle.solution[index] === 1 ? 1 : -1
    hints++
  } else {
    marks = action.marks
    if (marks.length !== state.marks.length || marks.every((mark, i) => mark === state.marks[i])) return state
  }
  return { ...state, marks, hints, history: [...state.history.slice(-99), state.marks] }
}
