# Chemical Composer

## Problem

Building a mechanism should begin with finding and arranging its participants, not
redrawing familiar chemicals or repeatedly nudging uneven rows into place. The
Chemical Composer turns chemical names and structure notation into ready-to-edit
Ketcher structures and can place several participants as one consistent row.

## User interaction

The **Insert Chemical** button in the bottom toolbar, or `Ctrl+K` / `Cmd+K`, opens
the composer. A search checks Ketcher's templates, functional groups, salts and
solvents, and then PubChem for a chemical name. SMILES, InChI, Molfile and KET
notation are accepted directly without an online lookup.

Search is live: local matches update on every text change and the online lookup
starts automatically after a short typing pause. A compact, non-interactive
status beside the field shows when lookup is running and when the results have
updated. Enter can still run the current query immediately.

A result can be placed immediately after the existing canvas content, handed to
the cursor for manual placement, or added to the placement tray. The tray retains
order and allows duplicates. Every tray entry has a mechanism role: reactant,
reagent, intermediate or product. **Place all automatically** inserts its complete
contents as a horizontal row of numbered participant slots. Compact, standard and
comfortable spacing are available.

Search results identify whether they are expanded molecules, reusable fragments
or structure notation. Exact name matches and expanded molecules rank above
partial matches and shorthand representations. Frequently reused trays can be
saved locally as mechanism sets and loaded later.

## Expected behavior

#### Scenario: Search by chemical name

- **WHEN** the user searches for a chemical name
- **THEN** matching structures already present in Ketcher's local libraries are
  shown first
- **AND** an exact PubChem name result is shown when the online service is
  available
- **AND** a failed online lookup does not hide usable local results
- **AND** a local result stored as a contracted abbreviation is expanded to its
  underlying atoms and bonds before it is previewed or placed

#### Scenario: Search while typing

- **WHEN** the user changes the search text
- **THEN** matching local structures update immediately
- **AND** an online name lookup starts automatically after a short pause
- **AND** changing the query cancels the older lookup
- **AND** an older response cannot replace results for newer text
- **AND** a visible status changes from **Searching** to **Updated**
- **AND** submitting the form runs the current query immediately

#### Scenario: Rank molecular results predictably

- **WHEN** several sources return results for the same query
- **THEN** exact normalized name matches rank before partial matches
- **AND** expanded molecules rank before notation and reusable fragments
- **AND** a local exact match ranks before the equivalent online result

#### Scenario: Enter structure notation directly

- **WHEN** the input is recognized as SMILES, InChI, Molfile or KET notation
- **THEN** it is offered directly as a structure
- **AND** the notation is parsed by Ketcher's normal structure loader when placed
- **BUT** a digit by itself is not treated as structure notation, so names such
  as `2-propanol` and `1,2-dichloroethane` continue through chemical-name lookup

#### Scenario: Reject a non-molecular result

- **WHEN** a selected result parses without any atoms
- **THEN** the composer reports that it did not resolve to a molecular structure
- **AND** no text or other non-molecular object is placed on the canvas

#### Scenario: Place manually

- **WHEN** the user chooses **Place manually**
- **THEN** the normal Ketcher placement preview follows the pointer
- **AND** the user chooses the final canvas position

#### Scenario: Place on an empty canvas

- **WHEN** automatic placement begins on an empty canvas
- **THEN** the first structure's bounding-box corner is placed at `(0, 0)` in
  chemical coordinates
- **AND** every later structure is placed to its right in tray order

#### Scenario: Place beside existing chemistry

- **WHEN** automatic placement begins on a non-empty canvas
- **THEN** the first new structure is placed to the right of the existing chemical
  bounding box
- **AND** existing canvas objects are not moved or rearranged

#### Scenario: Keep one uniform visual rhythm

- **WHEN** two or more structures are placed automatically
- **THEN** spacing is measured edge-to-edge rather than centre-to-centre
- **AND** the same gap is used between every adjacent pair in that batch
- **AND** larger structures may increase comfortable spacing for the whole batch,
  but do not create pair-by-pair variation

#### Scenario: Assign standardized participant slots

- **WHEN** a tray is placed automatically
- **THEN** its entries receive consecutive slots in visible tray order
- **AND** every entry records its selected mechanism role and step number
- **AND** disconnected components belonging to one participant, such as an ion
  pair, share a slot
- **AND** the metadata survives KET serialization so later tools can identify the
  participant without guessing from geometry

#### Scenario: Reorder and classify a tray

- **WHEN** the user changes a tray entry's role or moves it up or down
- **THEN** the visible tray immediately reflects the change
- **AND** automatic placement uses that exact role and order

#### Scenario: Arrange selected participants

- **WHEN** at least two canvas participants are selected and the user chooses
  **Arrange row**
- **THEN** only the selected participants move
- **AND** their centres align in one row with one uniform edge-to-edge gap
- **AND** disconnected components sharing a participant slot move together
- **AND** everything outside the selection stays locked

#### Scenario: Duplicate a mechanism step

- **WHEN** selected participants are duplicated with **Duplicate next step**
- **THEN** a complete copy is placed in a new row below the selection
- **AND** its slot order and roles are preserved
- **AND** its step number is one greater than the highest existing step
- **AND** one Undo removes the complete duplicated row

#### Scenario: Reuse a mechanism set

- **WHEN** the user saves a named tray
- **THEN** its structures, order, roles and spacing choice are stored locally
- **AND** loading it recreates the tray without placing anything prematurely
- **AND** deleting it removes only that saved set

#### Scenario: Undo a tray placement

- **WHEN** a tray is placed automatically
- **THEN** the complete batch is recorded as one editor action
- **AND** one Undo removes the complete batch

## Guarantees

- Automatic placement is deterministic for the same canvas, tray order and
  spacing choice.
- Existing canvas content is treated as locked; insertion never silently reflows
  the user's drawing.
- Every structure passes through Ketcher's normal parse and preparation pipeline.
- A tray placement is atomic in undo history.
- An arrange or step-duplication operation is atomic in undo history.
- Participant identity is represented explicitly by step and slot metadata rather
  than inferred solely from distance on the canvas.
- Chemical name queries sent to PubChem are visibly identified as an online
  search; direct notation and local-library searches remain local.

## Limitations

- Name lookup currently asks PubChem for an exact name result rather than offering
  autocomplete or spelling correction.
- Automatic placement currently creates one horizontal row. It does not wrap,
  align reaction steps to one another, or reflow previously placed structures.
- Placement uses chemical coordinate bounds plus bond-length-based padding. Very
  large custom labels may extend farther than their chemical bounds.
- Reusable mechanism sets are browser-local and are not yet exported, synced or
  shared between devices.
- Untagged structures drawn outside the composer can still be arranged as
  connected components, but do not acquire a role until they are inserted or
  duplicated through the composer workflow.
- The composer inserts structures only. Reaction and mechanism arrows are handled
  by their dedicated tools.
