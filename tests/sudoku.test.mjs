import test from 'node:test'
import assert from 'node:assert/strict'
import { candidates, conflicts, countSolutions, createPuzzle } from '../src/games/sudoku/rules.ts'
import { seededRandom } from './helpers/random.mjs'

test('all difficulty levels produce uniquely solvable puzzles without mutating their clues', () => {
  for (const difficulty of ['easy', 'medium', 'hard']) {
    for (const seed of ['first', 'second', 'third']) {
      const { givens, solution } = createPuzzle(difficulty, seededRandom(seed))
      const before = [...givens]
      assert.equal(countSolutions(givens), 1)
      assert.deepEqual(givens, before)
      assert.equal(conflicts(solution).size, 0)
      assert.ok(solution.every(v => v >= 1 && v <= 9))
      assert.ok(givens.every((v, i) => !v || v === solution[i]))
      assert.ok(givens.filter(Boolean).length >= { easy: 42, medium: 34, hard: 28 }[difficulty])
      assert.ok(givens.filter(Boolean).length < 50)
    }
  }
})

test('an injected random seed reproduces the same puzzle', () => {
  assert.deepEqual(createPuzzle('medium', seededRandom('2026-11-02')), createPuzzle('medium', seededRandom('2026-11-02')))
  assert.notDeepEqual(createPuzzle('medium', seededRandom('2026-11-02')), createPuzzle('medium', seededRandom('2026-11-03')))
})

test('conflicts identify both entries in rows, columns, and boxes', () => {
  for (const other of [8, 72, 10]) {
    const board = Array(81).fill(0)
    board[0] = board[other] = 5
    assert.deepEqual([...conflicts(board)], [0, other])
    assert.equal(countSolutions(board), 0)
    assert.ok(!candidates(board, 1).includes(5))
  }
})

test('solver rejects invalid boards and stops after detecting multiple solutions', () => {
  assert.equal(countSolutions([]), 0)
  assert.equal(countSolutions(Array(81).fill(10)), 0)
  assert.equal(countSolutions(Array(81).fill(0)), 2)
})
