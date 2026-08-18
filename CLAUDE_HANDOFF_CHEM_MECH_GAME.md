# Handoff: Curly Arrow Ketcher and Chemistry Mechanism Trainer

## Purpose

There are two connected products:

1. **Curly Arrow Ketcher** — a standalone fork of Ketcher for drawing organic
   reaction mechanisms quickly, cleanly, consistently, and with minimal manual
   arrow adjustment.
2. **Chemistry Mechanism Trainer** — a future MnemoNexus Experience add-on that
   uses Curly Arrow Ketcher as its editor. It should teach, assess, and practise
   mechanism drawing; it must not maintain its own molecule editor or arrow system.

The immediate task is planning/refactoring the old **Chem Mech Game / ArrowLab**
into the second product. No code has been changed for this task yet.

## Non-negotiable architecture

```text
Curly Arrow Ketcher repository
├─ ketcher-core: chemistry model, KET, arrow semantics/routing
├─ ketcher-react: embeddable React editor
└─ ketcher-standalone: full standalone editor
             │ versioned package dependency
             ▼
Chemistry Mechanism Trainer (under mnx-add-ons)
├─ puzzle corpus and curriculum
├─ hints, explanation, assessment and scoring
├─ MnemoNexus adapter
└─ embedded Ketcher configured for the activity
             │
             ▼
MnemoNexus Experience host
```

**Do not copy Ketcher source or a Ketcher build into the game.** The trainer must
depend directly on versioned Curly Arrow Ketcher packages. A bug fix to arrows,
hydrogen display, lone-pair rendering, etc. is therefore made once in Ketcher,
then reaches the trainer through a tested package-version update.

Suggested eventual package names are scoped equivalents of Ketcher's existing
`ketcher-core` and `ketcher-react` packages (for example,
`@mnx/curly-arrow-ketcher-core` and `@mnx/curly-arrow-ketcher-react`). The
precise publishing method can be decided later; local workspace linking is fine
for development.

## Ownership rule

Use this simple test for every feature:

> If it is useful while someone is drawing a mechanism in standalone Ketcher, it
> belongs in Curly Arrow Ketcher. If it only concerns a question, answer,
> explanation, score, unlock, or course progression, it belongs in the trainer.

| Curly Arrow Ketcher owns | Trainer owns |
| --- | --- |
| Molecules, bonds, charges, explicit H and lone pairs | Puzzle selection and curriculum |
| Curly/fishhook arrow drawing, anchoring and routing | Expected answers and alternatives |
| Molecule search/composer and automatic participant placement | Hints, explanations and feedback wording |
| Mechanism steps/participants and their document metadata | Scoring, attempts and progression |
| Editing locks, toolbar/capability profiles and highlighting API | MnemoNexus completion results |
| KET import/export and generic mechanism comparison primitives | Course-specific content migration |

Ketcher must not know about points, stages, tutor personalities, or MnemoNexus
storage. The trainer must not recreate a molecule editor, SVG arrows, or chemistry
geometry logic outside Ketcher.

## Curly Arrow Ketcher work already underway / desired

The fork has been focused on mechanism drawing. Existing local feature notes are:

- `.memory-bank/features/mechanism-arrows.md`
- `.memory-bank/features/chemical-composer.md`
- `.memory-bank/features/mechanism-focused-controls.md`

Important user requirements already discussed:

- Curly-arrow routing should aim for clean, standardised output: anchors on lone
  pairs/bonds/radicals, obstacle avoidance, clear arrowheads, sensible approach
  angles, no label/bond/lone-pair collisions where a route exists, and manual
  curve adjustment as a permanent override.
- Explicit hydrogens and lone-pair display/editing must remain available in
  mechanism-focused controls.
- Chemical Composer (`Ctrl/Cmd+K`) searches as the user types, resolves actual
  molecular structures rather than inserting text, supports common names and
  structure notation, and places multiple participants with deterministic,
  uniform edge-to-edge spacing.
- Composer placement records participant role, slot and mechanism step in KET.
- A persistent top-bar toggle switches full controls versus a mechanism-focused
  presentation. The focused set hides irrelevant reaction arrows, shapes, text,
  mapping, R-groups and similar tools but retains navigation, selection, bonds,
  charges, radicals, lone pairs, explicit H, curly arrows, molecule insertion,
  undo/redo and zoom.
- Holding Space provides temporary click-free pan without changing the selected
  tool; it should also work while a normal left-button drag is active.
- Focused controls include a step bar and a small hint strip for non-obvious
  mechanism workflow shortcuts.

The old notes at
`C:\Users\Student\_Documents\Import\Ketcher Changes\Ketcher Changes\`
are additional background: explicit-H visibility near arrows, lone-pair spacing,
arrowheads/endpoints, colour and obstacle-aware routing.

## Required Ketcher embedding contract before serious trainer work

Ketcher currently has useful APIs such as `getKet`, `setMolecule`, editor events,
and button hiding. The trainer needs a more intentional public embedding layer.

Build named profiles plus enforced capability gates, rather than relying on CSS
or hidden toolbar buttons alone:

- `full` — normal standalone Ketcher.
- `mechanism` — current focused mechanism controls.
- `puzzle-arrow-only` — chemistry is locked; curly arrows, lone pairs, explicit
  H, selection, pan and zoom work.
- `puzzle-construction` — intended for tasks where the learner also builds or
  edits structures.
- `review` — read-only playback.
- `author` — mechanism authoring tools and puzzle support.

Example intent:

```ts
{
  profile: 'puzzle-arrow-only',
  capabilities: {
    editAtoms: false,
    editBonds: false,
    moveStructures: false,
    drawMechanismArrows: true,
    editExplicitHydrogens: true,
    showLonePairs: true,
    panAndZoom: true,
    importFiles: false,
    exportFiles: false,
  },
}
```

Hiding a control is not enough: keyboard actions and exposed APIs must also obey
the capability gate. Ketcher specifically needs:

- a partial structure lock (lock atoms/bonds/positions but still permit arrows
  and navigation), not only a fully view-only state;
- stable atom/bond/participant/step identifiers that survive KET round trips;
- typed anchors for atom, bond, lone pair and radical, never screen coordinates;
- host-controlled highlight/feedback overlays for atoms, bonds and anchors;
- public change/selection/mechanism-arrow events;
- reliable load/export of KET and editor lifecycle support;
- a generic, headless mechanism comparison primitive where useful. Course answer
  rules and scoring remain outside Ketcher.

## Old Chem Mech Game: source is now present

The recovered project is at:

`C:\Users\Student\_Documents\Import\Chem Mech Game`

It is an old React + TypeScript + Vite application called **ArrowLab**. Its `src`
directory is now present. This changes the recommendation: it is no longer merely
a compiled reference; it is a useful refactor/extraction source.

The project includes:

- React application shell and routed pages;
- a puzzle library, filters and reaction catalogue;
- **798 XML puzzles** in `dist/content` and the corresponding metadata matrix;
- tutorial/learning stages, tutor UI and learning progress;
- a custom `mechlang` representation and XML converter;
- expected-arrow definitions and exact-anchor validation;
- local progress/settings models;
- MolView/MolPad-based editor wrappers and a separate SVG curly-arrow overlay.

The old editor stack is the part to replace. It used MolView/MolPad and overlays;
the new trainer must embed Curly Arrow Ketcher directly.

### Keep, adapt, replace, delete

| Area | Decision | Notes |
| --- | --- | --- |
| `features/puzzles/**` | Keep/adapt | Strong basis for catalogue, puzzle definitions, filters and learning flow. Replace old anchor types with Ketcher semantic IDs. |
| `features/learn/**` | Keep/adapt | Ten staged learning modules and tutor/puzzle UI are valuable. Adapt presentation to MnemoNexus and Ketcher. |
| `features/catalogue/**` | Keep/adapt | Reaction taxonomy, grouping, cards and search are reusable content/product logic. |
| `features/mechlang/**` | Keep temporarily | Useful migration/interchange layer for old XML. Do not make it the new canonical drawing format; KET should be canonical. |
| `features/progress/**` and `features/settings/**` | Adapt | MnemoNexus should own durable progress, installation and completion; avoid a separate permanent localStorage world. |
| `features/molview/**` | Replace/delete | This is legacy MolView mounting, bridge, AI/image work and SVG overlay interaction. Do not port it as the editor. |
| `features/molpad/**` | Replace/delete | Old MolPad structure loading, anchor snapshots and editing should be superseded by Ketcher. Some type/API ideas are useful. |
| standalone app shell/pages/routes | Adapt selectively | MnemoNexus hosts an Experience; do not embed a second full browser-router application inside it. |
| `references/`, `research_repos/`, legacy MolView/Jmol assets | Do not migrate | Preserve only as archive/reference. Do not distribute them with the trainer. |
| old `dist` build | Do not use as source | Keep archival only; source is now available. |

### Particularly valuable source files

- `src/features/molview/model/legacy-molview.ts`
  - Its `MolViewBridge` is an excellent **requirements prototype** for a Ketcher
    embedding bridge: load structure, report changes, lock editing, show H,
    give anchor data, set decorations/highlights, set puzzle/viewer mode, and
    control viewport interaction. Recreate this capability through a clean
    Ketcher API, not a compatibility wrapper around MolView.
- `src/features/molview/ui/MolViewMechanismOverlay.tsx`
  - Do not retain it. Its separate SVG arrow renderer is exactly the duplication
    the Ketcher fork is intended to eliminate. It is nevertheless useful evidence
    of the interactions wanted: semantic anchors, editable arrows and live
    feedback.
- `src/features/puzzles/model/arrow-validation.ts`
  - Keep the concept: a newly placed arrow matches an expected unused arrow.
    Upgrade it from legacy numeric indexes to stable Ketcher atom/bond/lone-pair
    references and support alternative valid answers later.
- `src/features/mechlang/model/xml-adapter.ts`
  - Valuable one-time legacy XML importer. It reads old species states and merges
    expected-arrow entries. It should eventually output the new puzzle envelope
    plus KET, not remain a runtime requirement.
- `src/features/puzzles/model/step-structure.ts`
  - Useful migration reference for resolving/recombining old molfiles and caching
    structure data. Avoid carrying its legacy MolPad assumptions into the new
    runtime.
- `src/features/learn/data/stage-*.ts`
  - Ten learning stages are content worth preserving.

### Do not preserve every old behaviour

`src/features/puzzles/model/workspace.ts` currently makes completion partly depend
on a minimum-length written answer and note. Retain reflection/notes as optional
study support, but do not require them to complete an otherwise correctly drawn
mechanism.

Old exact validation is useful for a first release, but should eventually support:

- semantically identical arrow anchors after Ketcher conversion;
- multiple accepted arrows or mechanism orderings;
- partial credit with useful error categories;
- later, structural outcome/rule-based validation.

## New canonical puzzle representation

Use KET for all drawing state. Store pedagogical information in a versioned JSON
envelope, conceptually:

```text
MechanismPuzzle
├─ schemaVersion, id, title, difficulty, tags, reaction metadata
├─ initialDocument: KET
├─ goal structures/outcome metadata
├─ steps
│  ├─ expected electron moves (typed semantic anchors)
│  ├─ accepted alternatives
│  ├─ hints and explanation
│  └─ allowed Ketcher capability profile
└─ authoring/provenance information
```

KET owns molecule geometry, chemistry and mechanism annotations. The puzzle
envelope owns instructions, answer alternatives, curriculum metadata and feedback.

The old `mechlang` format can be a temporary converter input/output for migration,
but it should not replace KET as the canonical editor document.

## Corpus migration plan

There are 798 legacy XML puzzles, approximately 3,230 steps, with imperfect or
incomplete metadata in parts of the corpus. Treat it as a valuable corpus requiring
QA, not automatically trusted production content.

Build a one-time migration tool:

```text
legacy XML + PuzzleList metadata + expected arrows
                  ↓
parse and resolve structures
                  ↓
convert structures into KET with stable IDs
                  ↓
translate arrow indices to typed Ketcher anchors
                  ↓
write MechanismPuzzle JSON + validation report
```

Start with a curated set of roughly 10–20 representative puzzles across reaction
classes. Validate those manually in the real Ketcher-backed trainer before batch
conversion. Failed or ambiguous conversions should be quarantined in a report,
not silently shipped.

## MnemoNexus integration facts

MnemoNexus currently has a first-party React Experience contract in:

`C:\Users\Student\_Documents\Projects\mnemonexus\src\core\extensions\contract.ts`

An Experience receives `extensionId`, launch surface, compatible knowledge items,
permissions, `onComplete`, and `onExit`. The host owns consequences/progress.

MnemoNexus also has `.mnxpack` validation and local pack storage, but the inspected
source did not reveal a finished runtime that hydrates and executes downloaded pack
code. Remote catalogue metadata explicitly cannot introduce executable code. Therefore:

1. Create the trainer source under `mnx-add-ons` as a standalone, well-defined
   add-on project.
2. Initially integrate it with MnemoNexus as a first-party compiled Experience.
3. Later, once dynamic `.mnxpack` execution is actually implemented and secure,
   package the same add-on independently.

Do not use an iframe unless there is a concrete isolation/security reason. Direct
React embedding of Ketcher is the preferred first implementation.

The existing `Chemistry Lab Mixing-Simulator` in `mnx-add-ons` is a good reference
for explicit lifecycle/export/import state boundaries, but it is not the exact
current MnemoNexus Experience contract. Reuse its discipline, not blindly its API.

## Packaging consideration

Ketcher is sizeable. MnemoNexus's current `.mnxpack` format limits the primary
executable code entry to 8 MB. Ketcher workers, chemistry data and static resources
will need an explicit asset/chunking strategy before independent-pack delivery.
This is not a reason to avoid the direct dependency; it is a later packaging task.

## Recommended implementation order

1. **Define Ketcher's embedding contract.** Add profiles, capability enforcement,
   partial structure locks, semantic arrow/selection events, controlled highlights,
   stable metadata and KET round-trip tests.
2. **Build a small vertical slice.** New trainer project plus a Ketcher-backed
   puzzle workspace for 3 manually authored KET puzzles. The learner can load a
   locked structure, draw arrows, receive feedback and complete the activity.
3. **Port reusable game logic.** Bring across puzzle catalogue/filtering, selected
   learning stages, tutor/hint content and relevant UI in forms compatible with
   MnemoNexus.
4. **Add answer checking.** Port/replace expected-arrow matching against Ketcher
   semantic anchors, including clear feedback and basic partial credit.
5. **Create the legacy importer.** Convert XML/mechlang content to the new KET +
   puzzle-envelope format. Produce validation reports and curate content batches.
6. **Integrate with MnemoNexus.** Wrap it as an Experience; use host completion
   results rather than a separate permanent localStorage progress universe.
7. **Expand only after the core is solid.** Reaction outcome checks, richer
   chemistry rules, authoring tools, synthesis challenges and larger game ideas.

## Immediate next task for Claude

Do not start by bulk-moving the old project or porting MolView.

First inspect the current Curly Arrow Ketcher public embedding surface and design
the smallest safe **puzzle editor profile**. Then implement a narrow vertical slice
which can:

1. mount Ketcher in React;
2. load one known KET structure;
3. lock molecule/bond editing but permit pan/zoom, explicit H/lone-pair visibility
   and curly-arrow drawing;
4. expose semantic arrow changes to the host;
5. compare one drawn arrow to an expected semantic anchor pair;
6. report success to a minimal host wrapper.

Only after that works should source be moved/refactored into its final
`mnx-add-ons` location and the legacy corpus converter be written.

## Key locations

- Curly Arrow Ketcher repository:
  `C:\Users\Student\_Documents\Projects\mnx-add-ons\Curly_Arrow_Ketcher`
- Old ArrowLab source and archive:
  `C:\Users\Student\_Documents\Import\Chem Mech Game`
- MnemoNexus repository:
  `C:\Users\Student\_Documents\Projects\mnemonexus`
- Existing add-on reference:
  `C:\Users\Student\_Documents\Projects\mnx-add-ons\Chemistry Lab Mixing-Simulator`

