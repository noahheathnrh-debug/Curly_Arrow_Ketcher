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

import type { CapabilityProfileName } from 'application/capabilities/types';
import type { MechanismArrowDescriptor } from './arrowComparison';

/**
 * The shape of a mechanism exercise.
 *
 * The division of labour is deliberate and load-bearing: **KET owns the
 * chemistry** — the molecules, their geometry, the arrows of a worked answer —
 * and this envelope owns everything *pedagogical* around it: the question, the
 * accepted answers, the hints, the wording of feedback.
 *
 * The type lives here, in the editor's own package, only because both the editor
 * and whatever is teaching need to agree on it. Nothing in the editor reads the
 * hints or the difficulty, and nothing here knows about marks, attempts, unlocks
 * or courses. Those belong to the host.
 */

export const MECHANISM_PUZZLE_SCHEMA_VERSION = 1;

export interface MechanismPuzzleStep {
  /** Shown to the learner as the task for this step. */
  readonly prompt?: string;
  /**
   * The arrows that answer this step.
   *
   * Anchors name atoms and bonds by their id *in `document`*, so a puzzle is
   * only meaningful alongside the document it was authored against.
   */
  readonly expectedArrows: readonly MechanismArrowDescriptor[];
  /**
   * Other answers that are equally right — a different but legitimate order of
   * events, or a resonance form. Each entry is a complete alternative set, not
   * an extra arrow.
   */
  readonly acceptedAlternatives?: ReadonlyArray<
    readonly MechanismArrowDescriptor[]
  >;
  /** Offered in order, as the learner asks for more help. */
  readonly hints?: readonly string[];
  /** Shown once the step is answered, whether or not it took hints. */
  readonly explanation?: string;
  /** What the editor should permit while this step is being answered. */
  readonly profile?: CapabilityProfileName;
}

export interface MechanismPuzzle {
  readonly schemaVersion: number;
  readonly id: string;
  readonly title: string;
  readonly difficulty?: 'introductory' | 'intermediate' | 'advanced';
  readonly tags?: readonly string[];
  /** The starting document, as KET: structures, no answer arrows. */
  readonly document: string;
  readonly steps: readonly MechanismPuzzleStep[];
  readonly provenance?: {
    readonly source?: string;
    readonly note?: string;
  };
}

/** A puzzle is unusable without a document and at least one thing to do. */
export function isMechanismPuzzle(value: unknown): value is MechanismPuzzle {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<MechanismPuzzle>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.document === 'string' &&
    Array.isArray(candidate.steps) &&
    candidate.steps.length > 0
  );
}
