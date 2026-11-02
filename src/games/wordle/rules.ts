import { WORD_LISTS, type WordLength } from './wordLists.ts'

export const WORD_LENGTH = 6
export const MAX_GUESSES = 6

export type LetterResult = 'correct' | 'present' | 'absent'
export type Guess = { word: string; result: LetterResult[] }

export function chooseAnswer(length: WordLength = WORD_LENGTH): string {
  const answers = WORD_LISTS[length].answers
  const index = Math.floor(Math.random() * answers.length)
  return answers[index].toUpperCase()
}

export function isValidGuess(word: string, length: WordLength = WORD_LENGTH): boolean {
  return WORD_LISTS[length].validGuesses.has(word.toLowerCase())
}

export function scoreGuess(guess: string, answer: string): LetterResult[] {
  const length = answer.length
  if (guess.length !== length) throw new RangeError('Guess and answer must have the same length.')
  const result: LetterResult[] = Array(length).fill('absent')
  const used = Array(length).fill(false)

  // Mark exact matches first. These letters cannot be reused by other tiles.
  for (let index = 0; index < length; index++) {
    if (guess[index] === answer[index]) {
      result[index] = 'correct'
      used[index] = true
    }
  }

  // A remaining letter is present only if the answer has an unused copy.
  for (let index = 0; index < length; index++) {
    if (result[index] === 'correct') continue

    for (let answerIndex = 0; answerIndex < length; answerIndex++) {
      if (!used[answerIndex] && guess[index] === answer[answerIndex]) {
        result[index] = 'present'
        used[answerIndex] = true
        break
      }
    }
  }

  return result
}

export function possibleAnswers(guesses: Guess[], length: WordLength = WORD_LENGTH): string[] {
  return WORD_LISTS[length].answers.filter((word) => {
    const candidate = word.toUpperCase()

    for (const guess of guesses) {
      const result = scoreGuess(guess.word, candidate)

      for (let index = 0; index < length; index++) {
        if (result[index] !== guess.result[index]) return false
      }
    }

    return true
  })
}

export function keyboardResults(guesses: Guess[]): Record<string, LetterResult> {
  const colors: Record<string, LetterResult> = {}
  const strength: Record<LetterResult, number> = { absent: 0, present: 1, correct: 2 }

  for (const guess of guesses) {
    for (let index = 0; index < guess.word.length; index++) {
      const letter = guess.word[index]
      const result = guess.result[index]

      if (!colors[letter] || strength[result] > strength[colors[letter]]) {
        colors[letter] = result
      }
    }
  }

  return colors
}
