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
  type CapabilitySpec,
  type Ketcher,
  type MechanismArrowDescriptor,
  describeArrows,
  fromHighlightClear,
  fromHighlightCreate,
} from 'ketcher-core';
import type { HighlightSpec, MechanismEditorApi } from './types';

/**
 * The host-facing handle on a mounted editor.
 *
 * A thin translation layer, on purpose. Its job is to let a teaching activity
 * speak in terms of *arrows and feedback* rather than in terms of the editor's
 * internals, so that when those internals change the activity does not.
 */
export function createMechanismEditorApi(ketcher: Ketcher): MechanismEditorApi {
  const restruct = () => ketcher.editor.render.ctab;

  return {
    ketcher,

    async loadKet(ket: string) {
      await ketcher.setMolecule(ket);
    },

    getKet() {
      return ketcher.getKet();
    },

    getArrows(): MechanismArrowDescriptor[] {
      return describeArrows(ketcher.editor.struct());
    },

    setCapabilities(capabilities: CapabilitySpec) {
      ketcher.setCapabilities(capabilities);
    },

    highlight(specs: readonly HighlightSpec[]) {
      const target = restruct();

      // Cleared first so a call describes the whole of what is highlighted,
      // rather than accumulating on top of the last round of feedback.
      fromHighlightClear(target);

      if (specs.length > 0) {
        fromHighlightCreate(
          target,
          specs.map((spec) => ({
            atoms: [...(spec.atoms ?? [])],
            bonds: [...(spec.bonds ?? [])],
            rgroupAttachmentPoints: [],
            color: spec.color,
            outline: spec.outline,
          })),
        );
      }

      // `true` repaints without touching the history: feedback is the host
      // talking, not something the learner did, so undo must not step through it.
      ketcher.editor.update(true);
    },

    clearHighlights() {
      fromHighlightClear(restruct());
      ketcher.editor.update(true);
    },
  };
}
