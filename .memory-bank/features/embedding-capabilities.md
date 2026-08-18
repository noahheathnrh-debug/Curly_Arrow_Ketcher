# Embedding Capabilities & Profiles

## Problem

An application that embeds Ketcher inside a larger activity often needs the user to do *less* than the standalone editor allows. A mechanism exercise hands the learner a structure and asks what the electrons do: the chemistry must hold still, but the learner still has to read the structure, reveal lone pairs, show explicit hydrogens, pan, zoom, and draw arrows.

The existing read-only mode is all-or-nothing — it freezes the document entirely, including the arrows the activity is about. And hiding toolbar buttons is not a restriction at all: the keyboard shortcut, the context menu and the editor's own API all still reach the same operation.

## User interaction

The restriction is chosen by the embedding application, not the person drawing. A host either names a **profile** describing the kind of activity, or lists individual **capabilities**, or names a profile and overrides part of it. Saying nothing gives the ordinary, unrestricted editor.

Profiles:

| Profile | For |
| --- | --- |
| `full` | Ordinary standalone Ketcher. The default. |
| `mechanism` | Mechanism drawing. Full chemistry; the toolbars are narrowed, not locked. |
| `puzzle-arrow-only` | The learner is given a structure and asked what the electrons do. |
| `puzzle-construction` | The learner builds or edits a structure instead. No arrows. |
| `review` | Read-only playback of a finished mechanism. |
| `author` | Mechanism authoring. |

Capabilities: editing atoms, editing bonds, moving structures, drawing mechanism arrows, editing explicit hydrogens, showing lone pairs, panning and zooming, importing, exporting.

To the person using the editor, a withheld capability looks like a control that is unavailable — and behaves that way however they reach for it.

## Expected behavior

#### Scenario: a withheld capability is refused from every direction

- **WHEN** a host withholds a capability
- **THEN** the controls that need it are unavailable, **and** their keyboard shortcuts do nothing, **and** asking for the tool through the editor's API is refused

#### Scenario: locking the chemistry leaves the structure readable

- **WHEN** the `puzzle-arrow-only` profile is applied
- **THEN** atoms, bonds and the eraser are unavailable
- **AND** selecting, panning, zooming, lone pairs, explicit hydrogens and mechanism arrows all still work

#### Scenario: nothing said means nothing changed

- **WHEN** a host embeds the editor without mentioning capabilities
- **THEN** every capability is granted and the editor behaves exactly as standalone Ketcher does

#### Scenario: withholding one capability does not withhold the rest

- **WHEN** a host lists a single capability as unavailable, without naming a profile
- **THEN** only that one is withheld; the others remain granted

#### Scenario: the profile can change during a session

- **WHEN** a host changes the profile while the editor is open
- **THEN** the controls update immediately, without reloading the editor or disturbing the structure
- **AND** if the active tool is no longer allowed, the editor steps back to the selection tool rather than leaving an unusable tool armed

#### Scenario: read-only playback

- **WHEN** the `review` profile is applied
- **THEN** nothing about the document can be changed, but it can still be read, navigated and exported

#### Scenario: a locked structure cannot be dismantled piecemeal

- **WHEN** editing is withheld
- **THEN** the eraser is unavailable, and arrow keys do not nudge the structure

## Guarantees

- A capability is a permission, not a presentation choice. Hiding a control is never the whole implementation of one.
- Capabilities are per editor instance, so two editors on one page can differ.
- The default is unrestricted: every restriction is something a host explicitly asked for.
- Selecting and panning are never withheld *by tool*, because a structure that cannot be selected or panned cannot be read.
- Capabilities are independent of read-only mode; read-only remains available and is stricter.
- A capability nobody has classified stays available rather than silently disappearing.

## Limitations

- Capabilities govern what the *user* may do. They do not restrain the host itself: an embedding application can still load and replace structures through the API, which is how an activity sets its question.
- `mechanism` narrows which controls are shown but withholds nothing; it is a presentation profile, not a lock.
- The set is deliberately coarse. It names activities a person would recognise, not individual operations.
