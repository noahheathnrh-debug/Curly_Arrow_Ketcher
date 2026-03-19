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

import { fromAtomsAttrs, Elements } from 'ketcher-core';
import Editor from '../Editor';
import { Tool } from './Tool';

class LonePairTool implements Tool {
  private readonly editor: Editor;

  constructor(editor: Editor) {
    this.editor = editor;
    this.editor.selection(null);
  }

  mousemove(event: PointerEvent) {
    const ci = this.editor.findItem(event, ['atoms']);
    this.editor.hover(ci || null, null, event);
    return true;
  }

  click(event: PointerEvent) {
    const editor = this.editor;
    const rnd = editor.render;
    const ci = editor.findItem(event, ['atoms']);

    if (!ci || ci.map !== 'atoms') return true;

    const molecule = rnd.ctab.molecule;
    const atom = molecule.atoms.get(ci.id);
    if (!atom) return true;

    // Compute max lone pairs from electron count
    const element = Elements.get(atom.label);
    if (!element || !element.group) return true;
    const group = element.group;
    if (group < 1 || group > 8) return true;
    if (atom.isQuery() || atom.badConn) return true;
    const atomValence = atom.valence;
    if (atomValence === null || atomValence === undefined || atomValence < 0)
      return true;

    const charge = atom.charge ?? 0;
    const negChargeBonus = Math.max(0, -charge);
    const nonBondingElectrons = group - charge - atomValence + negChargeBonus;
    if (nonBondingElectrons <= 0) return true;

    const maxPairs = Math.min(Math.floor(nonBondingElectrons / 2), 4);
    if (maxPairs === 0) return true;

    const current = atom.revealedLonePairs ?? 0;
    const newCount = (current + 1) % (maxPairs + 1);

    editor.update(
      fromAtomsAttrs(rnd.ctab, ci.id, { revealedLonePairs: newCount }, null),
    );
    return true;
  }
}

export default LonePairTool;
