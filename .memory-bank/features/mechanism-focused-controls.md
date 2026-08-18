# Mechanism-Focused Controls

## Problem

The complete Ketcher toolbar contains many specialist tools that are unrelated to
drawing an electron-pushing mechanism. Mechanism-focused controls reduce visual
search time without creating a different editor mode or changing the document.

## User interaction

The filter button in the top toolbar switches between full controls and
mechanism-focused controls. The button remains visible in both states and appears
active while the focused set is shown. The preference is retained in the local
browser.

Focused controls retain navigation, selection, erase, ordinary and stereo bonds,
aromatic and dative bonds, chains, charge and radical tools, lone pairs, curly
arrows, reaction pluses, explicit hydrogens, lone-pair visibility, the atom
palette, templates and Chemical Composer.
Reaction-arrow families, mapping, R-Groups, S-Groups, shapes, text, images and
analysis utilities are removed from the visible toolbars. Document operations,
Undo/Redo, settings and zoom remain available.

Holding `Space` temporarily adds canvas panning to pointer movement without
changing the active tool or requiring another mouse-button drag. This means a
selection or object drag can remain active while the user pans to content that
was initially off screen. Releasing `Space` stops only the panning layer.

The bottom toolbar becomes a mechanism step bar while focused controls are on. It
shows the active step, previous/next navigation, Arrange, Duplicate next and Add
molecule. A compact hint strip shows `Ctrl+K`, `Ctrl+Enter`, `Ctrl+Shift+A` and
`Alt+Up/Down`; familiar Space-panning is intentionally not repeated there.

## Expected behavior

#### Scenario: Enable focused controls

- **WHEN** the user activates the mechanism-controls button
- **THEN** only the curated mechanism and molecule-construction tools remain
  visible
- **AND** the curly-arrow tool remains visible
- **AND** reaction-arrow tools are not visible
- **AND** the canvas, document and editor mode do not change

#### Scenario: Return to full controls

- **WHEN** the user activates the button while focused controls are already on
- **THEN** the complete configured Ketcher toolbars return immediately
- **AND** no structure or selection is changed

#### Scenario: Hide the currently active tool

- **WHEN** focused controls are enabled while a tool outside the curated set is
  active
- **THEN** rectangle selection becomes active
- **AND** the hidden tool cannot remain invisibly active

#### Scenario: Restore the preference

- **WHEN** Ketcher is reopened in the same browser after the focused-controls
  preference was changed
- **THEN** the last selected control set is restored
- **AND** blocked or unavailable local storage does not prevent Ketcher loading

#### Scenario: Temporarily pan with Space

- **WHEN** the canvas has focus and the user holds `Space`
- **THEN** moving the pointer pans the viewport without requiring a mouse click
- **AND** the selected tool remains active
- **AND** an existing left-button selection or object drag is not cancelled
- **AND** releasing `Space` stops panning without affecting that tool or drag
- **AND** losing window focus also stops panning so it cannot become stuck

#### Scenario: Work from the persistent step bar

- **WHEN** mechanism-focused controls are enabled
- **THEN** the bottom toolbar shows the current mechanism step and step commands
- **AND** untagged manually drawn chemistry is treated as Step 1
- **AND** metadata-backed steps are discovered without relying on their canvas
  position
- **AND** previous or next navigation selects every participant in that step
- **AND** Arrange and Duplicate next reuse the standardized atomic operations
- **AND** Add molecule opens Chemical Composer for the workflow

#### Scenario: Use mechanism workflow shortcuts

- **WHEN** focused controls are enabled and no modal or editable field owns input
- **THEN** `Ctrl+Enter` or `Cmd+Enter` duplicates the active step
- **AND** `Ctrl+Shift+A` or `Cmd+Shift+A` arranges the active step
- **AND** `Alt+Up` and `Alt+Down` select the previous and next existing steps
- **AND** these shortcuts are inactive when full controls are shown

#### Scenario: Type a space normally

- **WHEN** focus is in an editable input or a modal is open
- **THEN** `Space` is not intercepted for temporary panning

## Guarantees

- Focused controls are a presentation filter, not a chemical-data or editor mode.
- Switching the filter never edits the structure and creates no Undo entry.
- The curated tool identifiers are defined in one place for predictable updates.
- Temporary panning does not switch or overwrite the active-tool preference.
- Repeated keydown events do not repeatedly replace the remembered previous tool.
- The shortcut hint strip contains only workflow commands that are difficult to
  discover from ordinary canvas interaction.

## Limitations

- The focused-control preference is browser-local and is not synchronized between
  devices.
- The initial curated set is intentionally opinionated. Additional specialist
  tools must be added explicitly when the mechanism workflow requires them.
- Space panning is disabled while a modal or editable field owns keyboard input.
