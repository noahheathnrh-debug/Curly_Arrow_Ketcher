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

import type { Capability } from 'ketcher-core';

/**
 * Which capability each editor tool needs.
 *
 * Keyed by *tool name* — the string `Editor.tool()` takes — rather than by
 * toolbar action, because that is the one place every route to a tool converges:
 * the button, the shortcut, and a host calling the API directly. Anything not
 * listed needs no capability and is always available; `select` and `hand` are
 * absent on purpose, since being unable to select or pan a locked structure
 * would make it unreadable.
 */
export const TOOL_CAPABILITY: Readonly<Record<string, Capability>> = {
  atom: 'editAtoms',
  charge: 'editAtoms',
  radical: 'editAtoms',
  enhancedStereo: 'editAtoms',
  apoint: 'editAtoms',

  bond: 'editBonds',
  chain: 'editBonds',
  // Erasing removes atoms and bonds alike; gating it on bonds alone would let a
  // locked structure be dismantled one atom at a time.
  eraser: 'editBonds',

  rotate: 'moveStructures',

  curlyarrow: 'drawMechanismArrows',
  lonepair: 'showLonePairs',

  // Everything below adds document furniture rather than chemistry, but all of
  // it mutates the document, so a locked activity must withhold it too.
  reactionarrow: 'editBonds',
  reactionplus: 'editBonds',
  reactionmap: 'editBonds',
  reactionunmap: 'editBonds',
  sgroup: 'editBonds',
  rgroupatom: 'editAtoms',
  rgroupfragment: 'editAtoms',
  simpleobject: 'editBonds',
  text: 'editBonds',
};

/**
 * Capabilities for entries that carry no tool of their own.
 *
 * Two kinds live here. Document operations — open, save, paste — which are not
 * tools at all. And the *group* entries behind a multi-tool button: `bonds` and
 * `charge` have no `action`, because they only stand for whichever option was
 * last chosen inside them. Without an entry here the group button would look
 * available while every option inside it was refused, which reads as the editor
 * being broken rather than as the activity being locked.
 */
export const ACTION_CAPABILITY: Readonly<Record<string, Capability>> = {
  // Multi-tool group buttons.
  bonds: 'editBonds',
  charge: 'editAtoms',
  arrows: 'editBonds',
  shapes: 'editBonds',
  sgroup: 'editBonds',
  rgroup: 'editAtoms',
  'reaction-mapping-tools': 'editBonds',
  'transform-flip': 'moveStructures',

  open: 'importFiles',
  paste: 'importFiles',
  'chemical-composer': 'importFiles',

  save: 'exportFiles',
  copy: 'exportFiles',
  copies: 'exportFiles',
  'copy-image': 'exportFiles',
  'copy-mol': 'exportFiles',
  'copy-ket': 'exportFiles',
  cut: 'exportFiles',

  'zoom-in': 'panAndZoom',
  'zoom-out': 'panAndZoom',

  layout: 'moveStructures',
  clean: 'moveStructures',
  'transform-rotate': 'moveStructures',
  'transform-flip-h': 'moveStructures',
  'transform-flip-v': 'moveStructures',

  aromatize: 'editBonds',
  dearomatize: 'editBonds',
  clear: 'editBonds',
  'explicit-hydrogens': 'editExplicitHydrogens',
};

/**
 * The capability an action needs, if any.
 *
 * A tool action is judged by the tool it activates, so the tool table stays the
 * single source of truth and a new toolbar entry for an existing tool is gated
 * without anyone remembering to add it here.
 */
export function capabilityForAction(
  actionName: string,
  action?: { tool?: string } | unknown,
): Capability | undefined {
  const toolName =
    action && typeof action === 'object' && 'tool' in action
      ? (action as { tool?: string }).tool
      : undefined;

  if (toolName && TOOL_CAPABILITY[toolName]) return TOOL_CAPABILITY[toolName];
  return ACTION_CAPABILITY[actionName];
}
