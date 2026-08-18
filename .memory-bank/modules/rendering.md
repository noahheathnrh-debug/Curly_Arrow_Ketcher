# Rendering

> The two rendering pipelines that turn the domain model into on-screen graphics.

Cross-cutting deep-dive. Both pipelines live under the core package's render layer but are entirely separate.

## Responsibility

Convert domain entities into SVG without ever mutating the model. A renderer only _reads_ entity state; all changes go through operations (see [operations-history](./operations-history.md)) which then trigger a re-render.

|                | Micromolecules                                  | Macromolecules                                |
| -------------- | ----------------------------------------------- | --------------------------------------------- |
| Draw library   | Raphael                                         | D3                                            |
| View-model     | render-structure + per-entity wrappers + visels | per-entity renderer subclasses                |
| Update trigger | render update → render-structure update cycle   | renderers-manager update, driven by a Command |
| Dirty tracking | mark atom/bond/item into "changed" maps         | operations add/move/delete renderers directly |
| Z-order        | a fixed layer map (Raphael rect anchors)        | D3 append order + raise-to-front              |
| Modes          | single                                          | Flex / Snake / Sequence                       |

Both dispatch a debounced (~250 ms) `renderComplete` window event.

## Micromolecules rendering (Raphael)

MVC layering: `Struct` (model) → a render-structure view-model → Raphael paper (SVG). Each domain entity gets a companion wrapper owning a **visel** (a set of Raphael paths plus bounding boxes).

The render object owns the paper, viewBox, zoom, and connection table. There are wrappers for every entity type — atoms, bonds, S-groups (brackets/labels), reaction arrows and pluses, fragments, R-groups and their attachment points, data S-group data, enhanced flags, loops, simple objects, text, images, and multi-tail arrows — all sharing a common base wrapper.

### The render-structure update cycle

1. Recompute the set of visible atoms/bonds (hiding contracted functional groups and leaving groups).
2. Mark changed items into the "changed" maps (all items when a full re-render is forced).
3. Clean connected components and empty fragments.
4. Clear the visels of changed items (removing their Raphael paths).
5. Rebuild half-bonds/neighbors (everything on a forced pass, otherwise only near changed atoms).
6. Reassign connected components and re-verify/update loops.
7. Run the "show" pass that draws all entities.
8. Clear the marks.

Selection is drawn on dedicated selection/info layers. The layer map fixes z-order from low to high: background, images, selection plate, selection points, hovering, atoms, bond skeleton, warnings, data, additional info, indices.

### Editor integration

The render object is constructed by the micro editor. Operations mutate `Struct` and mark the render-structure dirty; after an action the render update re-shows only the marked items.

## Macromolecules rendering (D3)

Each drawing-entity subclass gets a renderer subclass that draws D3 selections into the SVG canvas. A renderers manager orchestrates create/update/delete in response to a Command.

There is an abstract base renderer, an abstract base for monomer renderers, and concrete monomer renderers for each monomer type (peptide, CHEM, sugar, phosphate, RNA base, ambiguous, unresolved, unsplit nucleotide). Other renderers cover atoms, bonds, S-groups, reaction arrows and pluses, multi-tail arrows, monomer-to-atom bonds, and stereo flags. A factory maps a monomer to its entity class, renderer class, and monomer class.

### The renderers-manager update cycle

1. Reinitialize the view model - enriched model with precalculated values needed for further rendering and calculations .
2. Execute the Command: each operation's `execute` calls the matching manager method (add/move/delete monomer, add polymer bond, add atom, and so on).
3. Run post-render methods — recompute monomer enumeration when flagged and render aromatic circles e t c.
4. Notify that rendering is complete.

Monomer add uses the factory to pick the renderer class; bond add uses a polymer-bond renderer factory. Coordinates are stored in angstroms in model and converted to pixels in the renderer layer. Monomer bodies reference shared `<symbol>` defs via `<use href>`.

### Polymer-bond rendering

A factory chooses the bond renderer: hydrogen bonds always use the Snake-mode renderer; other bonds use Flex or Snake according to the editor mode.

- The Flex renderer draws a straight line/path.
- The Snake renderer draws orthogonal "snake" paths and also renders hydrogen bonds (dashed). There is **no standalone hydrogen-bond renderer**.

### Sequence rendering

- A **static** sequence orchestrator builds a sequence view model, shows nodes, shows bonds, and attaches delegated events. It manages the caret, two-stranded (sense/antisense) rows, and "new sequence" buttons.
- A factory maps each sequence node to a concrete sequence-item renderer (nucleotide, nucleoside, peptide, CHEM, phosphate, empty, backbone, ambiguous, …).
- A base sequence-item renderer draws one monospaced symbol plus background, counter, caret, and spacer.

### Mechanism-arrow routing

A self-contained module under the render layer decides the *shape* of curly and
fishhook arrows. It is pure: it takes a structure and render options, and returns curve
parameters. No DOM, no Raphael, no pointer state — so it is exercisable in unit tests
without a browser, and the same code serves the editor tool and the render layer.

Its stages are: resolve the endpoint anchors from the arrow's chemical source and
destination; build inflated collision geometry for everything drawn (bonds as capsules,
labels as boxes, charges and non-bonding dots as discs); generate candidate curves from
analytic tangent seeds plus a coarse sweep with local refinement; score them, comparing
collisions lexicographically before any aesthetic preference.

Drawn geometry reaches the router through a metrics interface with two implementations —
one analytic, derived from the model, and one reading the renderer's real measurements.
The analytic one is also the app's fallback before anything has been painted, since
Raphael bounding boxes do not exist until then and are cleared on each redraw.

Routes are cached on the render object, not written to the model, and dropped when the
dirty-marking cascade invalidates an atom or bond the arrow is anchored to. Re-routing
therefore happens once, on the next paint, rather than every frame.

The arrowhead's geometry constants live in this module rather than with the other arrow
drawing code, because scoring tests the head polygon against obstacles: if the renderer
and the router described different shapes, a head that scored clear could still be drawn
over a label.

## Assumptions & constraints

- Renderers never mutate the model.
- Mechanism-arrow routing must never run while an arrow is being resized: the resize
  operation identifies which handle is being dragged by comparing the drag anchor
  against reference points derived from the current curvature.
- Micro uses diff-based dirty marking; macro relies on the executing Command to touch exactly the affected renderers.
- The macro canvas comes from the zoom tool.
- One of the goals is to get rid of Raphael and move to D3 for all rendering, but the micro editor is still Raphael-based.
