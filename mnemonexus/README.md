# Curly Arrow Ketcher: independent MnemoNexus add-on

The experience lives **here, inside the Curly Arrow Ketcher repository**, outside
the closed-source MnemoNexus application. The editor packages keep owning chemistry,
arrows and capability enforcement; this subpackage owns the teaching activity and
the public host adapter. This placement follows the owner's 2026-10-09 instruction.

The default activity supplies locked structures. The learner draws electron-flow
arrows; geometry and arrow routing stay in the existing fork. Answers use its
`matchArrowSet`, including direction, atom/bond targets, curly versus fishhook and
one-to-one matching. Product construction is a separate, occasional future task
requiring an explicit construction profile and product answer; it is not this
activity's default or grading method.

## Private content

Some levels are private and are not in this repository: enzyme active-site mechanisms written from course
material, and a recovered corpus of imported levels whose origin has not been checked. They live in
`mnemonexus/private/` (gitignored). Code imports them as `@private-content`, which resolves to
`private/index.ts` when it exists and to the empty `src/privateContent.ts` otherwise, so a public clone builds,
tests and packs with neither. The enzyme authoring engine (`src/enzymes/engine.ts`, `kit.ts`) is public.

## Build and try it

Version 0.4.0 opens a **level browser** from standalone Experiences. Search by
mechanism or original level number, filter Guided/Imported, choose a level, then
return to the browser after finishing or leaving it. Completion markers are for
the current visit only. The six guided mechanisms retain their prompts and hints.

Packaging fix in 0.3.1: use the real `paper/dist/paper-core.js` dependency instead
of the earlier stub. This supplies Point/Path/group-outline geometry while leaving
out the PaperScript runtime compiler. The sandbox CSP and the editor's drawing,
snapping, routing and layout algorithms remain unchanged. The old stub could raise
`Point is not a constructor` when the editor needed molecule-group geometry.

The earlier sibling trainer's corpus is copied intact into a declared pack asset:
1,889 recovered steps from 752 source puzzles. The adapter currently exposes 255
imported levels containing 489 exercises, plus the six guided levels (261 total; 0.6.0 adds 19 enzyme mechanisms to the browser and the catalogue, 280 in all).
497 source levels are withheld because a step has an ambiguous migrating endpoint
or a gap in the recovered step numbering. Missing final steps cannot be proven
from this export. This is recovered practice content, not independently reviewed
chemistry or generated lecture-specific mechanisms. The source trainer is untouched.

Arrow tasks activate the fork's existing focused-control filter. Only selection,
pan, arrows, undo/redo, hydrogens/lone pairs and zoom remain visible; atom/template
palettes and authoring controls are removed. Capability enforcement still locks
the structures. Imported KET coordinates are preserved, and the editor's existing
load/fit/centering behavior positions the content. Geometry is not reimplemented.

(Before 0.6.0 a study-session launch opened one reviewed task directly; see "How the host starts it" below.)

From this directory:

```powershell
bun install
bun run build
```

This writes `curly-arrow-ketcher.mnxpack`. From the MnemoNexus checkout, run
`bun tools/session-experiences/sync-addon.ts` to include that built pack, then reload
the app. Open **Practice → Experiences → Curly Arrow Ketcher**. Manual installation
through **Command Centre → Add-ons → Install from file** is also supported.

Inside **Session Mode**, open a ready subsection, choose **Experiences**, select a
Curly Arrow Ketcher example and choose **Open example**. Relevant subsection phrases
can offer a **Practice** shortcut. Draw arrows on the supplied locked structures.
**Return to session** acknowledges a draft save before leaving; reopening resumes
the arrows. **Finish exercise** records practice evidence and returns to the same
subsection. This adapter is how the existing addon connects to MnemoNexus, rather
than a second arrow editor.

Build dependencies are the fork's already-built packages and the public SDK in
`../../mnx-addon-kit/sdk`. These relative file links are local development links.
Before distribution to outside developers, publish versioned SDK and fork packages
under distinct package names; consumers must never silently resolve ordinary
upstream Ketcher. The bundle deduplicates core to the explicit fork dependency.

The six authored exercises and their activity/offline service were adapted from
the owner's sibling Chemistry Mechanism Trainer. That repository is preserved.
The recovered question corpus and the lecture-derived enzyme mechanisms are
private content in `mnemonexus/private/`, which is never committed. Only
`bun run build:private` puts them in a pack (`curly-arrow-ketcher.private.mnxpack`);
the public pack from `bun run build` leaves them out. When the corpus is present,
the catalogue withholds records it cannot safely adapt. No Ketcher source or prebuilt editor is
copied into this activity: the bundler consumes the fork's package exports.

This preview needs no network, AI, graph-write permission or Indigo WASM. Its
legacy manifest binding is `none`. The imported and general levels are not claimed
as the current lecture's exact molecules; the enzyme mechanisms name their lecture
source on every step. Completion records practice evidence only.

Verification on 2026-10-09: the independent plugin typecheck/build passes. The
app browser check installs the pack, launches its real sandbox, confirms locked
structures resist Delete/nudge, draws an incomplete and wrong mechanism, undoes
the wrong arrow, draws the correct O-to-H and H-Br-to-Br arrows, advances to SN2,
and exits. A separate browser check follows the real Library → Session Mode route
with a synthetic chemistry subsection, verifies automatic Experience visibility,
saves one arrow, reloads, resumes it, rejects a wrong arrow, completes the mechanism
and returns to the same subsection. It isolates app-local writes in memory and
resupplies a fixed synthetic source bundle after reload. These checks verify the
first exercise, not all six, real lecture generation, native export/restart or
Tauri. The proton-transfer
worked document was corrected to encode the formed O-H bond as `new-bond`, matching
the current fork's semantic arrow descriptor instead of its old atom-only target.

## Closed-source host, open-source ecosystem

Keep three independently distributable things:

| Boundary | Ownership | What can be public |
|---|---|---|
| MnemoNexus | Session orchestration, knowledge records, placement policy, permissions, durable saves, applying evidence | Installed binary and public API documentation; private implementation stays private |
| Public SDK | Stable read-only projections, wire types, manifest/pack format, build tools, examples and mock host | Open-source package with no app imports |
| Each add-on | Subject-specific editor/activity, templates, answer checking, hints, content | Its own repository and license; this add-on uses the fork's Apache-2.0 license |

Third-party authors implement the public API, build a `.mnxpack`, and test against
an installed application. They never import `@/core`, private storage services,
internal knowledge records or MnemoNexus source files. The app loads declared
contributions through its registry and executes plugin UI in an opaque-origin
sandbox. Host commands remain permission checked. Result messages are evidence
for the host to validate, not permission to change learning records directly.

Publishing interface types and build tools does not require publishing the host's
implementation. A useful precedent is the documented manifest/API/extension-host
boundary in [VS Code](https://code.visualstudio.com/api/advanced-topics/extension-host).
Ketcher's [Apache-2.0 license](https://www.apache.org/licenses/LICENSE-2.0.html)
permits source and object redistribution subject to its license, change-notice
and attribution conditions; preserve the existing LICENSE and applicable notices.
This does not settle licenses of future plugins/dependencies individually.

Closed source means the application is not offered under an open-source license;
it does not make shipped frontend JavaScript secret or impossible to inspect.
Secrets and API credentials must not be included in public plugins or bundles.

## How the host starts it (0.6.0)

From 0.6.0 the add-on is started by **practice-v1 only**. The manifest has no
`surfaces.study.tasks` and no `learning` contribution: the host picks an activity from
`assets/practice/catalogue.json` and hands back its `launch`, and a standalone launch
opens the level browser. The earlier automatic study hooks (indexed-assertion
recognition and the six "related example" offers) were removed with them; the six
guided mechanisms are still catalogue activities and levels. Saved arrows for those
older study launches are no longer read.

The earlier product-drawing proof in MnemoNexus is optional prototype material,
not the production implementation. Port any reusable product activity here through
the public contract when that explicit task type is implemented. Do not compile a
second chemistry experience into the private host.
