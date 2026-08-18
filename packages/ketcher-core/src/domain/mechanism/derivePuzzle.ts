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

import { KetSerializer } from 'domain/serializers/ket/ketSerializer';
import { describeArrows } from './arrowComparison';
import {
  MECHANISM_PUZZLE_SCHEMA_VERSION,
  type MechanismPuzzle,
  type MechanismPuzzleStep,
} from './puzzle';

/**
 * Turn a *worked* mechanism into an exercise.
 *
 * A document that already has its arrows drawn is a solved puzzle: the question
 * is the structures, and the answer is the arrows. So an exercise is derived by
 * taking the arrows out of the document and keeping their meaning as the
 * expected answer.
 *
 * This is worth doing rather than authoring puzzles by hand because a worked
 * mechanism can be checked by eye in the editor — you can see whether the arrows
 * are right — whereas a hand-written list of anchor ids cannot.
 *
 * The arrows are removed from the document as JSON rather than by loading and
 * re-saving it. Re-saving would rewrite the whole file through the serializer,
 * which is both more than is wanted and dependent on editor state that a build
 * script has no reason to set up.
 */

interface DeriveOptions {
  id: string;
  title: string;
  difficulty?: MechanismPuzzle['difficulty'];
  tags?: readonly string[];
  prompt?: string;
  hints?: readonly string[];
  explanation?: string;
  /** Split the arrows across several steps, in the given group sizes. */
  stepSizes?: readonly number[];
  provenance?: MechanismPuzzle['provenance'];
}

/** The same document with every arrow removed. */
function documentWithoutArrows(ketJson: string): string {
  const parsed = JSON.parse(ketJson);
  const nodes = parsed?.root?.nodes;

  if (Array.isArray(nodes)) {
    parsed.root.nodes = nodes.filter(
      (node: { type?: string }) => node?.type !== 'arrow',
    );
  }

  return JSON.stringify(parsed, null, 4);
}

/**
 * Derive an exercise from a solved mechanism document.
 *
 * Throws when the document has no mechanism arrows: a puzzle with no answer is
 * a mistake worth hearing about at build time rather than a silent empty task.
 */
export function derivePuzzleFromSolvedKet(
  solvedKet: string,
  options: DeriveOptions,
): MechanismPuzzle {
  const serializer = new KetSerializer();
  const solved = serializer.deserializeMicromolecules(solvedKet);
  const arrows = describeArrows(solved);

  if (arrows.length === 0) {
    throw new Error(
      `Cannot derive puzzle "${options.id}": the document has no mechanism arrows, so there is no answer to check against.`,
    );
  }

  // Removing arrow nodes leaves every molecule node untouched, so the atom and
  // bond ids the anchors name are the same ones the learner's editor will have.
  const document = documentWithoutArrows(solvedKet);

  const sizes = options.stepSizes ?? [arrows.length];
  const steps: MechanismPuzzleStep[] = [];
  let taken = 0;

  sizes.forEach((size, index) => {
    const slice = arrows.slice(taken, taken + size);
    taken += size;
    if (slice.length === 0) return;

    steps.push({
      prompt: index === 0 ? options.prompt : undefined,
      expectedArrows: slice,
      hints: index === 0 ? options.hints : undefined,
      explanation: index === sizes.length - 1 ? options.explanation : undefined,
      profile: 'puzzle-arrow-only',
    });
  });

  // Anything the step sizes did not account for still has to be answered,
  // otherwise arrows would silently vanish from the expected set.
  if (taken < arrows.length) {
    steps.push({
      expectedArrows: arrows.slice(taken),
      explanation: options.explanation,
      profile: 'puzzle-arrow-only',
    });
  }

  return {
    schemaVersion: MECHANISM_PUZZLE_SCHEMA_VERSION,
    id: options.id,
    title: options.title,
    difficulty: options.difficulty,
    tags: options.tags,
    document,
    steps,
    provenance: options.provenance,
  };
}
