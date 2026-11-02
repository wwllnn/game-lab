import test from 'node:test'
import assert from 'node:assert/strict'
import { newSession, restoreSession } from '../src/games/sudoku/session.ts'

test('new sessions have independent notes, original clues, and empty statistics', () => {
  const state = newSession('medium')
  assert.deepEqual(state.values, state.givens)
  assert.notEqual(state.values, state.givens)
  assert.equal(state.seconds, 0)
  assert.equal(state.hints, 0)
  assert.equal(state.difficulty, 'medium')
  assert.equal(new Set(state.notes).size, 81)
})

test('saved progress round-trips and older daily metadata is discarded', () => {
  const state = newSession('easy')
  const index = state.givens.indexOf(0)
  state.values[index] = state.solution[index]
  state.seconds = 73
  state.hints = 1
  assert.deepEqual(restoreSession(JSON.stringify(state)), state)
  assert.deepEqual(restoreSession(JSON.stringify({ ...state, daily: '2026-11-02' })), state)
})

test('malformed saves and changes to fixed clues are rejected', () => {
  const state = newSession('easy')
  const changedClue = [...state.values]
  changedClue[state.givens.findIndex(Boolean)] = 0
  for (const saved of [
    { ...state, values: changedClue }, { ...state, solution: Array(81).fill(1) },
    { ...state, notes: [[10]] }, { ...state, difficulty: 'unknown' },
    { ...state, seconds: -1 }, { ...state, hints: 0.5 },
  ]) assert.equal(restoreSession(JSON.stringify(saved)), null)
  for (const raw of [null, '{}', '{']) assert.equal(restoreSession(raw), null)
})
