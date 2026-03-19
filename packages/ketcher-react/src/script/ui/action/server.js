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

import isHidden from './isHidden';
import { serverTransform } from '../state/server';
import { fromToggleExplicitH, Action } from 'ketcher-core';

const config = {
  layout: {
    shortcut: 'Mod+l',
    title: 'Layout',
    action: {
      thunk: serverTransform('layout'),
    },
    disabled: (editor, server, options) => !options.app.server,
    hidden: (options) => isHidden(options, 'layout'),
  },
  clean: {
    shortcut: 'Mod+Shift+l',
    title: 'Clean Up',
    action: {
      thunk: serverTransform('clean'),
    },
    disabled: (editor, server, options) => !options.app.server,
    hidden: (options) => isHidden(options, 'clean'),
  },
  arom: {
    shortcut: 'Alt+a',
    title: 'Aromatize',
    action: {
      thunk: serverTransform('aromatize'),
    },
    disabled: (editor, server, options) => !options.app.server,
    hidden: (options) => isHidden(options, 'arom'),
  },
  dearom: {
    shortcut: 'Ctrl+Alt+a',
    title: 'Dearomatize',
    action: {
      thunk: serverTransform('dearomatize'),
    },
    disabled: (editor, server, options) => !options.app.server,
    hidden: (options) => isHidden(options, 'dearom'),
  },
  cip: {
    shortcut: 'Mod+p',
    title: 'Calculate CIP',
    action: {
      thunk: serverTransform('calculateCip'),
    },
    disabled: (editor, server, options) => !options.app.server,
    hidden: (options) => isHidden(options, 'cip'),
  },
  check: {
    shortcut: 'Alt+s',
    enabledInViewOnly: true,
    title: 'Check Structure',
    action: { dialog: 'check' },
    disabled: (editor, server, options) => !options.app.server,
    hidden: (options) => isHidden(options, 'check'),
  },
  analyse: {
    shortcut: 'Alt+c',
    enabledInViewOnly: true,
    title: 'Calculated Values',
    action: { dialog: 'analyse' },
    disabled: (editor, server, options) => !options.app.server,
    hidden: (options) => isHidden(options, 'analyse'),
  },
  recognize: {
    title: 'Recognize Molecule',
    action: { dialog: 'recognize' },
    disabled: (editor, server, options) =>
      // TODO: provide the list of disabled functions as array
      !options.app.server || !options.app.imagoVersions?.length > 0,
    hidden: (options) => isHidden(options, 'recognize'),
  },
  miew: {
    title: '3D Viewer',
    enabledInViewOnly: true,
    action: { dialog: 'miew' },
    hidden: (options) => isHidden(options, 'miew'),
  },
  'explicit-hydrogens': {
    title: 'Add/Remove explicit hydrogens',
    action: {
      thunk: (dispatch, getState) => {
        const editor = getState().editor;
        const restruct = editor.render.ctab;
        const molecule = restruct.molecule;

        const hasExplicitHNeighbors = (atomId) =>
          (molecule.atomGetNeighbors(atomId) ?? []).some(({ aid }) => {
            const neiAtom = molecule.atoms.get(aid);
            return neiAtom?.label === 'H' && neiAtom.sgs.size === 0;
          });

        if (!editor.isAllExplicitHShown) {
          // Save which atoms already have explicit H (user per-atom choices)
          const beforeSet = new Set();
          molecule.atoms.forEach((_, atomId) => {
            if (hasExplicitHNeighbors(atomId)) beforeSet.add(atomId);
          });
          editor.atomsWithExplicitHBeforeAllMode = beforeSet;

          // Add H to atoms that don't have it yet
          const atomsToAdd = [];
          molecule.atoms.forEach((atom, atomId) => {
            if (atom.implicitH > 0 && !beforeSet.has(atomId))
              atomsToAdd.push(atomId);
          });

          if (atomsToAdd.length > 0) {
            const combined = new Action();
            atomsToAdd.forEach((atomId) => {
              const action = fromToggleExplicitH(restruct, atomId);
              if (action) combined.mergeWith(action);
            });
            editor.update(combined);
          }

          editor.isAllExplicitHShown = true;
        } else {
          // Remove only the bulk-added H (not user per-atom ones)
          const beforeSet = editor.atomsWithExplicitHBeforeAllMode;

          const atomsToRemove = [];
          molecule.atoms.forEach((_, atomId) => {
            if (hasExplicitHNeighbors(atomId) && !beforeSet.has(atomId))
              atomsToRemove.push(atomId);
          });

          if (atomsToRemove.length > 0) {
            const combined = new Action();
            atomsToRemove.forEach((atomId) => {
              const action = fromToggleExplicitH(restruct, atomId);
              if (action) combined.mergeWith(action);
            });
            editor.update(combined);
          }

          editor.isAllExplicitHShown = false;
          editor.atomsWithExplicitHBeforeAllMode = new Set();
        }
      },
    },
    hidden: (options) => isHidden(options, 'explicit-hydrogens'),
  },
};

export default config;
