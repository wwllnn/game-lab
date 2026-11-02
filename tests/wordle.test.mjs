import test from 'node:test'
import assert from 'node:assert/strict'
import { WORD_LENGTHS, WORD_LISTS } from '../src/games/wordle/wordLists.ts'
import {
  chooseAnswer,
  isValidGuess,
  keyboardResults,
  possibleAnswers,
  scoreGuess,
  WORD_LENGTH,
} from '../src/games/wordle/rules.ts'

const { answers: ANSWERS, validGuesses: VALID_GUESSES } = WORD_LISTS[6]

test('all possible answers have six letters', () => {
  assert.ok(ANSWERS.length > 1000)
  assert.ok(ANSWERS.every((word) => /^[a-z]{6}$/.test(word)))
  assert.ok(ANSWERS.every(word => isValidGuess(word)))
  assert.ok(ANSWERS.includes(chooseAnswer().toLowerCase()))
})

test('guesses use a broader six-letter dictionary', () => {
  assert.ok(VALID_GUESSES.size > ANSWERS.length)
  assert.equal(isValidGuess('ABACUS'), true)
  assert.equal(ANSWERS.includes('abacus'), false)
  assert.equal(isValidGuess('ZZZZZZ'), false)
})

test('scoring handles exact, misplaced, and extra duplicate letters', () => {
  assert.deepEqual(scoreGuess('LETTER', 'LITTLE'), [
    'correct',
    'present',
    'correct',
    'correct',
    'absent',
    'absent',
  ])
  assert.deepEqual(scoreGuess('AAAAAA', 'BANANA'), [
    'absent',
    'correct',
    'absent',
    'correct',
    'absent',
    'correct',
  ])
  assert.equal(scoreGuess('PLANET', 'PLANET').length, WORD_LENGTH)
  assert.ok(scoreGuess('PLANET', 'PLANET').every((result) => result === 'correct'))
})

test('possible words narrow with submitted clues, including repeated letters', () => {
  const firstGuess = {
    word: 'AAAAAA',
    result: ['absent', 'correct', 'absent', 'correct', 'absent', 'correct'],
  }
  const secondGuess = { word: 'LETTER', result: scoreGuess('LETTER', 'BANANA') }

  assert.deepEqual(possibleAnswers([]), ANSWERS)

  const afterFirstGuess = possibleAnswers([firstGuess])
  assert.ok(afterFirstGuess.includes('banana'))
  assert.ok(!afterFirstGuess.includes('camera'))
  assert.ok(afterFirstGuess.length < ANSWERS.length)

  const afterSecondGuess = possibleAnswers([firstGuess, secondGuess])
  assert.ok(afterSecondGuess.includes('banana'))
  assert.ok(afterSecondGuess.length <= afterFirstGuess.length)
})

test('keyboard keeps the strongest clue for each letter', () => {
  const colors = keyboardResults([
    { word: 'ABCDEF', result: ['absent', 'absent', 'absent', 'absent', 'absent', 'absent'] },
    { word: 'ABZZZZ', result: ['present', 'correct', 'absent', 'absent', 'absent', 'absent'] },
  ])

  assert.equal(colors.A, 'present')
  assert.equal(colors.B, 'correct')
  assert.equal(colors.C, 'absent')
})

test('each word length has a common answer list and a broader valid-guess dictionary', () => {
  for (const length of WORD_LENGTHS) {
    const { answers, validGuesses } = WORD_LISTS[length]
    const pattern = new RegExp(`^[a-z]{${length}}$`)
    assert.ok(answers.length > 1000)
    assert.equal(new Set(answers).size, answers.length)
    assert.ok(answers.every(word => pattern.test(word) && isValidGuess(word, length)))
    assert.ok([...validGuesses].every(word => pattern.test(word)))
    assert.ok(validGuesses.size > answers.length)
    assert.ok(answers.includes(chooseAnswer(length).toLowerCase()))
    assert.equal(isValidGuess('Z'.repeat(length), length), false)
    assert.equal(isValidGuess(chooseAnswer(length), length === 5 ? 7 : 5), false)
    assert.deepEqual(possibleAnswers([], length), answers)
  }
})

test('five- and seven-letter guesses score duplicate letters correctly', () => {
  assert.deepEqual(scoreGuess('ALLEY', 'APPLE'), ['correct', 'present', 'absent', 'present', 'absent'])
  assert.deepEqual(scoreGuess('OOOOOOO', 'BALLOON'), ['absent', 'absent', 'absent', 'absent', 'correct', 'correct', 'absent'])
  assert.throws(() => scoreGuess('APPLE', 'PLANET'), RangeError)
  for (const length of WORD_LENGTHS) {
    const answer = chooseAnswer(length)
    assert.deepEqual(scoreGuess(answer, answer), Array(length).fill('correct'))
    const word = 'A'.repeat(length)
    const guesses = [{ word, result: scoreGuess(word, answer) }]
    const remaining = possibleAnswers(guesses, length)
    assert.ok(remaining.includes(answer.toLowerCase()))
    assert.ok(remaining.every(candidate => JSON.stringify(scoreGuess(word, candidate.toUpperCase())) === JSON.stringify(guesses[0].result)))
    assert.ok(possibleAnswers([{ word: answer, result: scoreGuess(answer, answer) }], length).length === 1)
  }
})
