import test from 'node:test'
import assert from 'node:assert/strict'
import {
  choosePuzzle, countSolutions, getClues, isSolved, lineComplete, linePatterns,
  puzzlesFor, runs, SIZES, strokeCells,
} from '../src/games/nonograms/rules.ts'
import { newSession, restoreSession, sessionReducer } from '../src/games/nonograms/session.ts'

test('clues count filled runs, preserve order, and represent empty lines', () => {
  assert.deepEqual(runs([0, 1, 1, 1, -1, 1, 0]), [3, 1])
  assert.deepEqual(runs([1, 0, 1, 1]), [1, 2])
  assert.deepEqual(runs([0, -1, 0]), [0])
  assert.deepEqual(getClues([1, 1, 0, 1], 2), { rows: [[2], [1]], columns: [[1], [2]] })
  assert.equal(lineComplete([1, 1, 0, 1], [2, 1]), true)
  assert.equal(lineComplete([1, 0, 1, 1], [2, 1]), false)
})

test('every illustration and rotation has exactly one solution to its clues', () => {
  for (const size of SIZES) {
    const catalog = puzzlesFor(size)
    const seen = new Set()
    for (const puzzle of catalog) {
      assert.equal(puzzle.solution.length, size * size, puzzle.id)
      assert.ok(puzzle.solution.every(value => value === 0 || value === 1), puzzle.id)
      assert.equal(countSolutions(puzzle), 1, puzzle.id)
      assert.ok(!seen.has(puzzle.solution.join('')), `duplicate picture ${puzzle.id}`)
      seen.add(puzzle.solution.join(''))
    }
  }
})

test('placement solver detects ambiguity and impossible clues', () => {
  assert.deepEqual(linePatterns(3, [1, 1]), [[1, 0, 1]])
  assert.deepEqual(linePatterns(3, [0]), [[0, 0, 0]])
  assert.deepEqual(linePatterns(3, [4]), [])
  assert.equal(countSolutions({ size: 2, rows: [[1], [1]], columns: [[1], [1]] }), 2)
  assert.equal(countSolutions({ size: 2, rows: [[2], [2]], columns: [[0], [2]] }), 0)
})

test('random selection avoids the previous picture', () => {
  for (const size of SIZES) {
    assert.notEqual(choosePuzzle(size, puzzlesFor(size)[0].id, () => 0).id, puzzlesFor(size)[0].id)
    assert.equal(choosePuzzle(size).size, size)
  }
})

test('only filled squares affect victory; crosses are optional and wrong fills prevent it', () => {
  const puzzle = puzzlesFor(5)[0]
  const solution = [...puzzle.solution]
  assert.equal(isSolved(solution, puzzle), true)
  assert.equal(isSolved(solution.map(v => v || -1), puzzle), true)
  assert.equal(isSolved(Array(25).fill(0), puzzle), false)
  const wrong = [...solution]
  wrong[solution.indexOf(0)] = 1
  assert.equal(isSolved(wrong, puzzle), false)
  assert.equal(isSolved(solution.slice(1), puzzle), false)
})

test('a whole stroke is one immutable undo step and no-op strokes do not consume undo', () => {
  const state = newSession(5)
  const marks = [...state.marks]
  for (const i of strokeCells(0, 4, 5)) marks[i] = 1
  const next = sessionReducer(state, { type: 'paint', marks })
  assert.deepEqual(state.marks, Array(25).fill(0))
  assert.equal(next.history.length, 1)
  assert.equal(sessionReducer(next, { type: 'paint', marks: [...marks] }), next)
  const undone = sessionReducer(next, { type: 'undo' })
  assert.deepEqual(undone.marks, state.marks)
  assert.equal(undone.history.length, 0)
  assert.deepEqual(strokeCells(0, 20, 5), [0, 5, 10, 15, 20])
  assert.deepEqual(strokeCells(24, 0, 5), [24, 18, 12, 6, 0])
  assert.deepEqual(strokeCells(3, 3, 5), [3])
})

test('hints correct mistakes, can be undone, and keep an honest hint count', () => {
  let state = newSession(5)
  const wrong = [...state.marks]
  wrong[state.puzzle.solution.indexOf(0)] = 1
  state = sessionReducer(state, { type: 'paint', marks: wrong })
  const hinted = sessionReducer(state, { type: 'hint' })
  assert.equal(hinted.hints, 1)
  const changed = hinted.marks.findIndex((v, i) => v !== state.marks[i])
  assert.ok(changed >= 0)
  assert.equal(hinted.marks[changed] === 1, hinted.puzzle.solution[changed] === 1)
  const undone = sessionReducer(hinted, { type: 'undo' })
  assert.deepEqual(undone.marks, state.marks)
  assert.equal(undone.hints, 1)
})

test('completed puzzles stop the clock and reject edits until a new puzzle starts', () => {
  const state = newSession(5)
  const won = { ...state, marks: [...state.puzzle.solution] }
  for (const action of [{ type: 'hint' }, { type: 'undo' }, { type: 'tick', seconds: 5 }, { type: 'paint', marks: state.marks }]) {
    assert.equal(sessionReducer(won, action), won)
  }
  assert.equal(sessionReducer(won, { type: 'replace', session: state }), state)
  assert.equal(sessionReducer(state, { type: 'tick', seconds: 5 }).seconds, 5)
})

test('save restoration validates data, restores undo, and uses catalog clues and solutions', () => {
  const state = newSession(10)
  const edited = sessionReducer(state, { type: 'hint' })
  assert.deepEqual(restoreSession(JSON.stringify(edited)), edited)
  const tampered = { ...edited, puzzle: { ...edited.puzzle, solution: [], rows: [] } }
  assert.deepEqual(restoreSession(JSON.stringify(tampered)), edited)
  assert.deepEqual(restoreSession(JSON.stringify({ ...edited, daily: '2026-11-02' })), edited)
  for (const raw of [null, '{', '{}', JSON.stringify({ ...edited, marks: [1] }), JSON.stringify({ ...edited, hints: -1 }), JSON.stringify({ ...edited, history: [[2]] })]) {
    assert.equal(restoreSession(raw), null)
  }
})

test('undo history stays bounded during long play', () => {
  let state = newSession(5)
  for (let i = 0; i < 120; i++) {
    const marks = [...state.marks]
    marks[0] = i % 2 ? -1 : 1
    state = sessionReducer(state, { type: 'paint', marks })
  }
  assert.equal(state.history.length, 100)
  assert.ok(restoreSession(JSON.stringify(state)))
})
