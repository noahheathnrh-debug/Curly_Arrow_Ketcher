# Mechanism trainer — vertical slice

A working exercise in electron pushing, backed by the real editor.

## Running it

```bash
npm run dev:standalone --workspace=example
```

then open **`/puzzle.html`** (not `/`, which is the ordinary example app).

Add `?surface=recall` to exercise the path where the host requires a grade.

## What it demonstrates

The whole point of the arrangement, end to end:

1. The editor is mounted with the `puzzle-arrow-only` profile — the chemistry is
   frozen, but lone pairs, explicit hydrogens, selection, pan and zoom all work.
2. A puzzle document is loaded. Its arrows have been removed; they are the answer.
3. The learner draws curly arrows. Each change is reported as a *mechanism*
   change — source and destination anchors — not as editor operations.
4. Drawn arrows are matched against the expected ones. A wrong arrow shades the
   atoms and bonds it points at; a right one is left alone.
5. When every mechanism is finished, the activity hands the host a result and
   stops. It never decides what that result is worth.

## Where things live

| | |
| --- | --- |
| `hostContract.ts` | A restatement of the MnemoNexus Experience contract. **Deleted on the move**, replaced by the real import. |
| `ExperienceHost.tsx` | A stand-in host. Also deleted on the move. |
| `MechanismActivity.tsx` | The activity itself: questions, answers, feedback, progression. Moves as-is. |
| `puzzles.ts` | The exercises, derived from worked mechanisms. Moves as-is. |
| `content/*.ket` | Worked mechanism documents. Copies of the visual-test fixtures, kept separate so lessons and screenshot fixtures can change independently. |

## Why it lives in `example/`

The embedding API is still moving. The example workspace already has a working
build for these packages, and standing up a second one would mostly be a way to
get the same thing subtly wrong. Everything under this folder is self-contained,
so relocating it to `mnx-add-ons` later means moving the folder and swapping two
files.

## What it is not

There is no scoring model, no persistence, and no curriculum. Those belong to the
host. This slice exists to prove the editor can be embedded, locked, watched and
checked — not to be the finished trainer.

## Smoke check

With the dev server running:

```bash
node example/src/puzzle/smoke-check.mjs
```

It loads the page in Chromium and asserts the things that are easy to break
without noticing: no console errors, and that the structure really is locked —
pressing the charge tool, `Delete` and the arrow keys all leave it untouched.

Set `PUZZLE_URL` if the server is not on port 5199.
