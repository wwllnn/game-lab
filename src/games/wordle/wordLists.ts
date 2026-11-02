import { ANSWERS as ANSWERS_5, EXTRA_GUESSES as EXTRA_GUESSES_5 } from './words5letters.ts'
import { ANSWERS as ANSWERS_6, EXTRA_GUESSES as EXTRA_GUESSES_6 } from './words6letters.ts'
import { ANSWERS as ANSWERS_7, EXTRA_GUESSES as EXTRA_GUESSES_7 } from './words7letters.ts'

export const WORD_LENGTHS = [5, 6, 7] as const
export type WordLength = typeof WORD_LENGTHS[number]

export const WORD_LISTS = {
  5: { answers: ANSWERS_5, validGuesses: new Set([...ANSWERS_5, ...EXTRA_GUESSES_5]) },
  6: { answers: ANSWERS_6, validGuesses: new Set([...ANSWERS_6, ...EXTRA_GUESSES_6]) },
  7: { answers: ANSWERS_7, validGuesses: new Set([...ANSWERS_7, ...EXTRA_GUESSES_7]) },
} satisfies Record<WordLength, { answers: string[]; validGuesses: Set<string> }>
