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
  Atom,
  fromAtomsAttrs,
  fromFragmentDeletion,
  FunctionalGroup,
} from 'ketcher-core';
import Editor from '../Editor';
import { Tool } from './Tool';

const RADICAL_CYCLE = [
  Atom.PATTERN.RADICAL.NONE,
  Atom.PATTERN.RADICAL.DOUPLET,
  Atom.PATTERN.RADICAL.SINGLET,
  Atom.PATTERN.RADICAL.TRIPLET,
];

type MoleculeLike = {
  atoms: Map<number, Atom>;
  atomGetNeighbors: (
    atomId: number,
  ) => Array<{ aid: number; bid?: number }> | undefined;
};

export function getNextRadicalState(currentRadical: number | null | undefined) {
  const currentIndex = RADICAL_CYCLE.indexOf(currentRadical ?? 0);
  const nextIndex =
    currentIndex === -1 ? 1 : (currentIndex + 1) % RADICAL_CYCLE.length;

  return RADICAL_CYCLE[nextIndex];
}

export function findDeletableHydrogenNeighbor(
  molecule: MoleculeLike,
  atomId: number,
) {
  const hydrogenNeighbor = (molecule.atomGetNeighbors(atomId) ?? []).find(
    ({ aid }) => {
      const neighbor = molecule.atoms.get(aid);
      if (
        !neighbor ||
        neighbor.label !== 'H' ||
        neighbor.atomList ||
        neighbor.rglabel ||
        neighbor.sgs.size > 0
      ) {
        return false;
      }

      return (molecule.atomGetNeighbors(aid)?.length ?? 0) === 1;
    },
  );

  return hydrogenNeighbor?.aid ?? null;
}

class RadicalTool implements Tool {
  private readonly editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.editor.selection(null);
  }

  mousemove(event: PointerEvent) {
    const struct = this.editor.render.ctab;
    const molecule = struct.molecule;
    const ci = this.editor.findItem(event, ['atoms']);
    const atom = ci && ci.map === 'atoms' ? molecule.atoms.get(ci.id) : null;

    if (atom && this.isRadicalApplicableAtom(atom)) {
      this.editor.hover(ci);
    } else {
      this.editor.hover(null, null, event);
    }

    return true;
  }

  click(event: PointerEvent) {
    const editor = this.editor;
    const struct = this.editor.render.ctab;
    const molecule = struct.molecule;
    const functionalGroups = molecule.functionalGroups;
    const rnd = editor.render;
    const ci = editor.findItem(event, ['atoms']);
    const atomResult: Array<number> = [];
    const result: Array<number> = [];

    if (ci && functionalGroups.size && ci.map === 'atoms') {
      const atomId = FunctionalGroup.atomsInFunctionalGroup(
        functionalGroups,
        ci.id,
      );
      const isAtomSuperatomLeavingGroup = Atom.isSuperatomLeavingGroupAtom(
        molecule,
        ci.id,
      );
      if (isAtomSuperatomLeavingGroup) {
        return true;
      }

      if (atomId !== null) {
        atomResult.push(atomId);
      }
    }

    if (atomResult.length > 0) {
      for (const id of atomResult) {
        const fgId = FunctionalGroup.findFunctionalGroupByAtom(
          functionalGroups,
          id,
        );

        if (fgId !== null && !result.includes(fgId)) {
          result.push(fgId);
        }
      }

      if (result.length > 0) {
        this.editor.event.removeFG.dispatch({ fgIds: result });
        return true;
      }
    }

    if (!ci || ci.map !== 'atoms') {
      return true;
    }

    const atom = molecule.atoms.get(ci.id);
    if (!atom || !this.isRadicalApplicableAtom(atom)) {
      return true;
    }

    const nextRadical = getNextRadicalState(atom.radical);
    let deleteHydrogenAction: ReturnType<typeof fromFragmentDeletion> | null =
      null;

    if (nextRadical !== Atom.PATTERN.RADICAL.NONE) {
      const hydrogenId = findDeletableHydrogenNeighbor(molecule, ci.id);

      if (hydrogenId !== null) {
        deleteHydrogenAction = fromFragmentDeletion(rnd.ctab, {
          atoms: [hydrogenId],
        });
      }
    }

    const radicalAction = fromAtomsAttrs(
      rnd.ctab,
      ci.id,
      {
        radical: nextRadical,
      },
      null,
    );

    this.editor.hover(ci);
    this.editor.update(
      deleteHydrogenAction
        ? deleteHydrogenAction.mergeWith(radicalAction)
        : radicalAction,
    );

    return true;
  }

  private isRadicalApplicableAtom(atom: Atom): boolean {
    return !atom.atomList && !atom.rglabel;
  }
}

export default RadicalTool;
