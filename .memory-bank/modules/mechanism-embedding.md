# Mechanism Embedding

> The surface a teaching application uses to put Ketcher inside an activity.

## Responsibility

Let an application embed the editor as *part of something else* — an exercise, a
worked example, a review — without either side learning about the other.

Two rules define the boundary, and everything here follows from them:

- **The editor owns chemistry.** Molecules, arrows, geometry, routing, what an
  arrow means. A host never draws an arrow or reasons about coordinates.
- **The host owns teaching.** Questions, answers, hints, marks, progression. The
  editor never learns what a score is.

The comparison primitive sits exactly on that line: it answers *do these two
arrows describe the same electron movement?* and nothing about whether that is
worth a mark.

## Public interfaces

### Comparing arrows (`ketcher-core`)

- **Describing** — read a structure's mechanism arrows as source/destination
  anchor pairs, stripped of anything to do with how they were drawn.
- **Comparing** — whether two arrows mean the same thing. Ignores which lone pair
  was grabbed, which side of a bond the tail hangs off, and the approach angle;
  insists on the atoms and bonds involved, on curly versus fishhook, and on the
  direction of a bond being formed. Both of the strict cases can be relaxed by
  the caller.
- **Matching sets** — order-independent and one-to-one, reporting what is
  missing, what is unaccounted for, and whether the set is complete.
- **Locating** — which atoms and bonds an arrow touches, so a host can point at
  them.

### The puzzle envelope (`ketcher-core`)

A versioned description of an exercise: a document, and per step the expected
arrows, accepted alternatives, hints, explanation and capability profile.

The type lives in the editor's package only because both sides must agree on it.
Nothing in the editor reads the hints.

Exercises are **derived from worked mechanisms** — a solved document has its
arrows removed, and they become the answer. This is preferred to hand-authoring
because a worked mechanism can be opened and checked by eye, while a list of
expected anchors cannot be checked until someone tries to answer it.

### The embedded editor (`ketcher-react`)

A component that mounts the editor for an activity: it applies a capability
profile before the user can touch anything, loads the document, and reports
changes as *mechanism* changes rather than editor operations.

Its host-facing handle can load and read the document, list the arrows, change
capabilities mid-session, and shade atoms and bonds as feedback. Feedback never
enters the undo history — a learner must not be able to undo into it.

## Design notes

**Changes are reported by diffing, not by translating operations.** The editor's
own change event speaks in operations; an activity cares only that the set of
arrows is now different. Diffing a snapshot means undo, redo, re-routing and a
whole document reload all arrive as the same kind of answer, with no operation
vocabulary to keep in step. This is why arrow identifiers are persisted.

**Highlighting reuses the editor's own mechanism** rather than an overlay. An
earlier prototype of this product drew its own arrow layer over a different
editor; that duplication is precisely what this fork exists to remove.

## Dependencies

Capability profiles (for locking), mechanism arrow anchors and their stable ids
(for naming what an answer refers to), and the existing highlight operations.

## Dependents

Teaching applications. Nothing inside the editor depends on this module.

## Assumptions & constraints

- A puzzle's expected anchors name atoms **in its own document**. A puzzle and
  its document are meaningless apart.
- Lone-pair indices are not identity, which is why comparison ignores them. In a
  locked activity the structure cannot change, so they are stable anyway; in an
  activity that lets the learner edit, they are not.
- Highlighting addresses atoms and bonds only. Pointing at an individual lone
  pair is not currently possible.
