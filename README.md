# Fieldnotes Game Lab

A small collection of polished browser games built with React, TypeScript, and Vite.

## Run locally

```sh
npm install
npm run dev
```

Run `npm run test`, `npm run lint`, and `npm run build` before shipping. The tests use Node.js 22 or newer.

## Games

**Minesweeper** has beginner, intermediate, and expert boards. The first reveal and its neighbors are safe. Right-click or use flag mode to mark mines; click an open number to chord. Wins show fireworks, while losses animate outward from the triggered mine. Best times are stored in the browser.

**Wordle-style game** offers 5-, 6-, and 7-letter modes with six guesses per round. Changing word length starts a fresh round immediately; New word and Play again keep the selected length. Type or use the on-screen keyboard. Green means the right letter in the right place, orange means the letter is elsewhere, and gray means it is absent or already counted. Repeated letters are scored correctly. The modes include 1,373 / 1,669 / 1,786 possible answers and accept 6,510 / 10,580 / 15,602 guesses respectively; made-up entries are rejected. The possible-answer list narrows after each guess and follows the selected word length. Wordle and its dictionaries load when the game is opened.

**2048** uses a 4×4 board with 512, 1024, and 2048 goal modes. Slide tiles with arrow keys, WASD, the on-screen arrows, or touch swipes. Matching tiles merge once per move, and only successful moves add a new tile. Reach the selected goal to win, then keep playing if you like. Best scores are stored separately for each goal in the browser.

**Sudoku** offers easy, medium, and hard puzzles with a verified unique solution. Difficulty sets the target number of starting clues (42, 34, or 28; uniqueness may require more). Use the number pad or keyboard, pencil notes, erase, undo, and hints. Conflicting entries are highlighted, and progress saves automatically in the browser. The reminder card opens How to play. Open directly with `?game=sudoku`.

**Nonograms** reveals pixel illustrations from numbered row and column clues on 5×5, 10×10, and 15×15 boards. Each puzzle in the original illustration catalog has a verified unique solution. Fill, cross out, or erase with taps, mouse drags, or touch drags; right-click crosses out. Arrow keys move, F fills, X crosses out, and Delete erases. Each stroke is one undo step. Hints reveal or correct a cell. Matching clues dim automatically, and filling the picture wins without requiring every empty square to be crossed out. Progress, hints, time, and up to 100 undo steps save locally. New puzzles rotate through the catalog, and the reminder card opens How to play. Open directly with `?game=nonograms`.

Use the collection list beneath each reminder card to switch games. Switching games starts fresh and clears saved puzzle progress; browser back and forward follow the same behavior. Reloading the current page still restores saved progress. Sudoku difficulty changes immediately without a confirmation prompt. Each game also has a direct URL. The theme preference and best scores remain stored in the browser.

## Structure

- `src/App.tsx` owns the shared header, theme, and selected game.
- `src/App.css` imports the shared theme, site shell, game layout, collection navigation, dialogs, and fireworks. Each game component imports its own stylesheet.
- `src/styles/` contains the shared theme, site shell, and game layout; component and game styles live alongside their implementations. Each stylesheet includes its own responsive rules.
- `src/games/catalog.ts` defines the game collection and URL mappings.
- `src/components/` contains the collection list, shared status label, instructions, puzzle results, and fireworks.
- `src/hooks/` shares the active-tab game clock and native dialog focus handling.
- `src/utils/formatTime.ts` formats game timers consistently.
- `src/games/minesweeper/` contains the Minesweeper interface, board rules, and mine-wave timing.
- `src/games/wordle/` contains the Wordle interface, scoring rules, answer and guess lists, and styles. The lists include words from [wordlist-english 1.2.1](https://github.com/jacksonrayhamilton/wordlist-english), derived from SCOWL; see `WORDLIST-LICENSE.txt` in that directory for attribution.
- Wordle's dictionaries are organized by length in `words5letters.ts`, `words6letters.ts`, and `words7letters.ts`. Each exports answers and additional valid guesses; `wordLists.ts` connects them to the game modes.
- `src/games/merge2048/` contains the 2048 interface, styles, and pure 2D board rules.
- `src/games/sudoku/` contains the Sudoku interface, styles, puzzle generation, uniqueness solver, and validated save sessions.
- `src/games/nonograms/` contains the Nonograms interface, illustration catalog, clues, uniqueness solver, and session reducer.
- `tests/` covers the games' core rules.
