# Decisions taken while building the embedding contract and trainer slice

Everything in the plan is built. This is the list of judgement calls I made on
your behalf, so you can overturn any of them without reading the diff.

Each one says what I chose, why, and **how to change it** if you disagree. None
is hard to reverse; I have flagged the two that get harder with time.

---

## Try it first

The trainer now lives in its own project, outside this repository:

```bash
cd "../Chemistry Mechanism Trainer"
npm install
npm run dev
```

Six mechanisms, locked structures, draw the arrows.

---

## The decisions

### 1. Comparison ignores *how* an arrow was drawn, insists on *what* it claims

An answer is judged on chemistry, not draughtsmanship. Ignored: which of an
atom's lone pairs was grabbed, which side of a bond the tail hangs off, the
approach angle, and the order arrows were drawn in. Insisted on: the atoms and
bonds involved, curly vs fishhook, and the **direction** of a new bond.

The direction call is the one worth a second look. "The alkene attacks the
proton" and "the proton attacks the alkene" are different claims, so by default
they are not interchangeable. If you find that too strict in practice, every
comparison takes `{ ignoreBondDirection: true }` — no code change, just pass it
from the activity.

Curly vs fishhook is also strict, on the grounds that homolytic and heterolytic
cleavage are different chemistry rather than a near miss. `ignoreElectronCount`
relaxes it if you want partial credit there instead.

**To change:** `packages/ketcher-core/src/domain/mechanism/arrowComparison.ts`.

### 2. Arrows within a step are order-independent; steps are ordered

A step's arrows happen at once, so requiring a sequence would test recall of the
tool rather than of the chemistry. Where order genuinely matters, split the
mechanism into steps — `derivePuzzleFromSolvedKet` takes `stepSizes` for exactly
this, and none of the six currently uses it.

**To change:** add `stepSizes` to entries in `../Chemistry Mechanism Trainer/src/puzzles.ts`.

### 3. Drawing the same right arrow twice does not count twice

Matching is one-to-one, so a duplicate is reported as an extra rather than
quietly filling in for an arrow the learner has not worked out.

### 4. Wrong arrows are shaded; right ones are left alone

Feedback highlights only the atoms and bonds a *wrong* arrow points at. Marking
correct arrows green as well made the canvas noisy and gave the answer away.
Feedback never enters the undo history — a learner should not be able to undo
into it.

**To change:** `showFeedback` in `../Chemistry Mechanism Trainer/src/MechanismActivity.tsx`.

### 5. Puzzles are derived from worked mechanisms, not hand-authored

Each exercise is a solved document with its arrows removed; the arrows become the
expected answer. This is worth it because a worked mechanism can be opened and
checked by eye, whereas a hand-written list of anchor ids cannot be checked at
all until someone tries to answer it.

I wrote the prompts, hints and explanations myself. **These are the most likely
thing to want changing** — they are ordinary prose in one file, no chemistry
knowledge encoded anywhere else.

**To change:** `../Chemistry Mechanism Trainer/src/puzzles.ts`.

### 6. The documents are *copies* of the visual-test fixtures

I copied the six `.ket` files into the trainer's own `src/content/` rather than
importing them from `ketcher-autotests`. A fixture may one day be edited to
provoke a rendering bug, which would be no reason to change a lesson.

The cost is that they can drift. If you would rather they stayed shared, delete
the folder and import across — the derivation code does not care where the text
comes from.

### 7. The trainer is now a standalone project in `mnx-add-ons`

Originally built inside `example/` while the embedding API was churning, then
moved to `mnx-add-ons/Chemistry Mechanism Trainer/` once it settled. It runs on
its own — its own Vite project, consuming the three Ketcher packages as **built
packages** via `file:` links to the sibling checkout.

It is deliberately *not* wired into MnemoNexus yet. See "What the move to
MnemoNexus still needs" below.

Consuming the built packages rather than aliasing to source was the right call
and proved itself immediately: it exposed a genuine packaging bug in the fork
(see below) that the editor's own example app cannot see.

`mnx-add-ons` is not a git repository, so the trainer was given its own — the
work would otherwise have left version control entirely on the move.

### 8. The host contract is restated, not imported

`hostContract.ts` mirrors MnemoNexus's `ExperienceHostProps` — same field names,
same shapes — but is declared locally so the trainer does not depend on that
repository to run. The activity is written against it, so swapping in the real
import should be mechanical.

**Since verified against the live source** (`mnemonexus/src/core/extensions/contract.ts`).
All six `ExperienceHostProps` fields match exactly — names, types, `readonly`.
`ExperienceResult`, `ExtensionLaunchSurface` and all eight `ExtensionPermission`
values match too. My `ExtensionKnowledgeItem` declares four of its fourteen
fields, which is a clean structural subset, so the real type is assignable.

Swapping the import really is mechanical.

### 9. `mechanism` profile withholds nothing

The six profiles are `full`, `mechanism`, `puzzle-arrow-only`,
`puzzle-construction`, `review`, `author`. `mechanism` grants everything: it is a
*presentation* narrowing of the toolbars, not a lock, and conflating the two
would have made the existing focus mode silently start refusing operations.

### 10. Capability names are coarse on purpose

Nine capabilities, each naming something a person would recognise as a thing they
can or cannot do — not one per operation. A host asks for an activity, not a
checklist. Actions are gated by the *tool* they activate, so a new toolbar button
for an existing tool inherits its restriction automatically.

### 11. `stableId` is written only for anchored atoms

Files without mechanism arrows serialize byte-for-byte as before, and `arrowId`
is written only for mechanism arrows. This keeps the diff against upstream
Ketcher small. The alternative — ids on every atom — would change every file the
editor produces.

**This is the other decision that gets harder to change**, because once documents
exist in the wild carrying these fields, the format is committed.

---

## What I verified in a real browser

I drove the slice in Chromium. It loads with **zero console errors**, renders the
first puzzle (CH₃O⁻ + HBr), and the lock holds on every route I could find:

| Check | Result |
| --- | --- |
| Charge tool pressed, then an atom clicked | structure unchanged |
| `Delete` pressed | structure unchanged |
| `ArrowRight` pressed (nudge bypasses the action table) | structure unchanged |
| `Next` before the puzzle is solved | disabled |
| Bonds, chain, erase, sgroup, rgroup, shapes, text, reaction tools, atom palette | all disabled |
| Hand, select, lone pair, curly arrow, zoom, explicit hydrogens | all available |

Re-run it any time with the dev server up:

```bash
cd "../Chemistry Mechanism Trainer"
PUZZLE_URL=http://localhost:5300/ node smoke-check.mjs
```

**One cosmetic gap found and left alone.** The charge group button still *looks*
available under a locked profile, because a multi-tool group entry has no action
for the gate to attach to — `bonds` has an inert config entry and `charge` does
not. Pressing it does nothing, as the table above shows, so this is appearance
only. I tried adding the matching entry and it made the whole charge group
disappear, so I reverted rather than trade a cosmetic flaw for a real one. Worth
a proper fix in the toolbar's group-status logic, not worth a rushed one.

## A real bug the move exposed

Consuming Ketcher as a *built package* — rather than aliasing to source the way
the editor's own example app does — broke immediately:

> `ReferenceError: require is not defined`
> at `ketcher-core/dist/application/render/raphael-ext.modern.js`

`raphael-ext` loads Raphaël with a bare `require('raphael')` guarded by
`typeof window`, so server rendering skips it. The build emits that call verbatim
into the **ESM** output, where `require` does not exist. Any consumer taking the
package as published hits it on first paint; the example app never does, because
it aliases to TypeScript source and runs a CommonJS plugin over it.

It is the only such call in `dist`, so the trainer works around it with a narrow
shim (`src/raphaelShim.ts`) that resolves that one module and refuses everything
else. **The proper fix belongs in `ketcher-core`** — a static import, or a
dynamic `import()` if the SSR guard must stay.

Linking from a sibling checkout also gave two copies of React until
`resolve.dedupe` was set. That one is a property of `file:` linking, not a
Ketcher fault.

## One to decide

**To decide — pre-existing test failures.** There were 16 failing tests before I
started, and there still are: 12 in `antisenseChain` (monomer library items not
found) and 4 across `Save` / `InfoModal` / `ColorPicker`. I confirmed each was
failing without my changes. They are not mine to fix uninvited, but they are
worth someone's attention.

---

## State of the tree

| | |
| --- | --- |
| `ketcher-core` | 968 passing, 12 failing (all pre-existing `antisenseChain`) |
| `ketcher-react` | 431 passing, 4 failing (all pre-existing) |
| Types | Clean across core, react and example |
| Lint | Clean on everything new |

I also rebuilt `packages/ketcher-core/dist` and `packages/ketcher-react/dist`,
because the react tests and the example resolve the built packages rather than
source. Those are generated artifacts — check you are happy having them in the
tree.

The 58 modified / 28 untracked files that were already there when I started are
still uncommitted, now mixed in with this work. Committing the earlier mechanism
work separately would make this reviewable on its own; I did not do it because
committing was not something you asked for.

---

## What the move to MnemoNexus still needs

The trainer now lives at `mnx-add-ons/Chemistry Mechanism Trainer/` and runs on
its own. It is **not** wired into MnemoNexus, and that is a bigger job than it
sounds:

1. **A consumption path.** MnemoNexus uses **bun**, and this fork is published
   nowhere. It needs a `file:` link or a real publish. Package renaming to
   `@mnx/curly-arrow-ketcher-*` was already deferred and belongs with this.
2. **Build plumbing.** MnemoNexus's Vite config is bare — `react()` plus three
   dev plugins. No `svgr`, no CommonJS handling, no `.less`, no Indigo WASM
   worker setup. All of that has to be added.
3. **Size.** The trainer's production bundle is ~30 MB raw, 7.3 MB gzipped.
   Acceptable standalone; a real question inside a Tauri desktop app, and well
   past the 8 MB code-bundle cap in the `.mnxpack` format.
4. **Styling.** MnemoNexus experiences ship no CSS of their own — everything goes
   through `usePluginPrimitives()`. `activity.module.css` would be rewritten
   against `Panel`, `HeroHeader`, `Badge`, `Button`, `ProgressBar`, all of which
   exist.
5. **The easy part.** Delete `hostContract.ts` and `ExperienceHost.tsx`, import
   the real contract, and add a manifest to
   `mnemonexus/src/core/extensions/builtins.ts`. `src/extensions/maths-drills/`
   is the closest existing example — `knowledgeBinding: 'none'`, calendar
   surface, self-contained subject practice.

Items 1 and 2 gate everything else. Items 3–5 are wasted effort until Ketcher can
be imported at all.
