/****************************************************************************
 * Copyright 2021 EPAM Systems
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 ***************************************************************************/

/**
 * What an embedding host allows the user to do.
 *
 * These are *capabilities*, not controls. Hiding a toolbar button is not the
 * same as withholding a capability: the keyboard shortcut, the context menu and
 * the programmatic API all reach the same operation, and a teaching activity
 * that locks the structure has to hold against all of them, not just the one
 * the learner can see.
 *
 * Deliberately coarse. Each entry names something a person would recognise as a
 * thing they can or cannot do, so a host can reason about a profile without
 * knowing which tools or actions implement it.
 */
export type Capability =
  /** Add, replace or delete atoms; change charge, isotope, radical, valence. */
  | 'editAtoms'
  /** Add, delete or retype bonds, including chains and ring templates. */
  | 'editBonds'
  /** Move, rotate or flip existing structures. Independent of editing them. */
  | 'moveStructures'
  /** Draw curly and fishhook electron-pushing arrows. */
  | 'drawMechanismArrows'
  /** Toggle and edit explicit hydrogens. */
  | 'editExplicitHydrogens'
  /** Show lone pairs, and place them with the lone-pair tool. */
  | 'showLonePairs'
  /** Pan and zoom the canvas. Withheld only for a fixed-viewport activity. */
  | 'panAndZoom'
  /** Load structures in: open a file, paste, insert from the composer. */
  | 'importFiles'
  /** Get structures out: save, copy, export an image. */
  | 'exportFiles';

export type CapabilityRecord = Record<Capability, boolean>;

/**
 * A named set of capabilities.
 *
 * Profiles exist so a host asks for an *activity*, not a checklist. The precise
 * capability set behind a profile may be tuned without every embedder having to
 * restate it.
 */
export type CapabilityProfileName =
  /** Ordinary standalone Ketcher. Everything allowed. */
  | 'full'
  /** Mechanism drawing: full chemistry, but the toolbars are narrowed. */
  | 'mechanism'
  /** Chemistry locked; only arrows, lone pairs, explicit H and navigation. */
  | 'puzzle-arrow-only'
  /** The learner builds or edits structures, but draws no arrows. */
  | 'puzzle-construction'
  /** Read-only playback. */
  | 'review'
  /** Mechanism authoring: everything, plus whatever authoring tools exist. */
  | 'author';

export type CapabilitySpec =
  | CapabilityProfileName
  | Partial<CapabilityRecord>
  | { profile: CapabilityProfileName; overrides?: Partial<CapabilityRecord> };
