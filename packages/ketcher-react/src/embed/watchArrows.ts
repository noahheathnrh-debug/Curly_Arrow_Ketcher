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

import {
  type Ketcher,
  type MechanismArrowDescriptor,
  describeArrows,
} from 'ketcher-core';
import type { MechanismArrowChange } from './types';

/**
 * Tell a host when the mechanism changes, in the host's own terms.
 *
 * The editor's own change event reports *operations* — an arrow was added at
 * index 3, a bond was resized. A teaching activity does not care about any of
 * that; it cares that the learner has now claimed the oxygen's lone pair attacks
 * the carbonyl carbon.
 *
 * So rather than translating operations, this keeps a snapshot of the arrows and
 * diffs it. That is both simpler and more robust: undo, redo, re-routing and a
 * whole document reload all come out as the same kind of answer, and there is no
 * operation vocabulary to keep in step.
 */
export function watchMechanismArrows(
  ketcher: Ketcher,
  onChange: (change: MechanismArrowChange) => void,
): () => void {
  // Keyed by arrow id, which survives undo and reload — the point of persisting
  // it. Falls back to position for an arrow that somehow has none, which is only
  // ever a transient state.
  const keyOf = (arrow: MechanismArrowDescriptor, index: number) =>
    arrow.arrowId ?? `index:${index}`;

  let previous = new Map<string | number, MechanismArrowDescriptor>();

  const snapshot = () => {
    const next = new Map<string | number, MechanismArrowDescriptor>();
    describeArrows(ketcher.editor.struct()).forEach((arrow, index) =>
      next.set(keyOf(arrow, index), arrow),
    );
    return next;
  };

  previous = snapshot();

  const handle = () => {
    const next = snapshot();

    const added: MechanismArrowDescriptor[] = [];
    const removed: MechanismArrowDescriptor[] = [];

    next.forEach((arrow, key) => {
      if (!previous.has(key)) added.push(arrow);
    });
    previous.forEach((arrow, key) => {
      if (!next.has(key)) removed.push(arrow);
    });

    previous = next;

    // A change that left the arrows alone — moving a molecule, say — is not
    // news to a host that is watching the mechanism.
    if (added.length === 0 && removed.length === 0) return;

    onChange({
      added,
      removed,
      arrows: Array.from(next.values()),
    });
  };

  const subscription = ketcher.editor.subscribe('change', handle);

  return () => {
    ketcher.editor.unsubscribe('change', subscription);
  };
}
