import type { GameName } from './catalog'

export const SUDOKU_STORAGE_KEY = 'fieldnotes-sudoku-v1'
export const NONOGRAMS_STORAGE_KEY = 'fieldnotes-nonograms-v1'

const progressKeys: Partial<Record<GameName, string>> = {
  sudoku: SUDOKU_STORAGE_KEY,
  nonograms: NONOGRAMS_STORAGE_KEY,
}

export function clearGameProgress(game: GameName): void {
  const key = progressKeys[game]
  if (!key) return
  try { localStorage.removeItem(key) } catch { /* Navigation also works without storage. */ }
}
