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

import { useCallback, useEffect, useRef } from 'react';
import type {
  CapabilitySpec,
  Ketcher,
  StructServiceProvider,
} from 'ketcher-core';
import { Editor } from '../Editor';
import { createMechanismEditorApi } from './createApi';
import { watchMechanismArrows } from './watchArrows';
import type { MechanismArrowChange, MechanismEditorApi } from './types';

export interface MechanismEditorProps {
  structServiceProvider: StructServiceProvider;
  staticResourcesUrl: string;
  errorHandler?: (message: string) => void;

  /** The document to start from. */
  ket?: string;
  /** What the user is allowed to do. Omitted means the ordinary editor. */
  capabilities?: CapabilitySpec;

  /** Called once the editor is mounted and the document is loaded. */
  onReady?: (api: MechanismEditorApi) => void;
  /** Called whenever the set of mechanism arrows changes. */
  onArrowsChange?: (change: MechanismArrowChange) => void;
}

/**
 * Ketcher, mounted for an activity rather than for general drawing.
 *
 * Everything it adds over the plain editor is about the boundary with a host:
 * the document is loaded for you, the capability profile is applied before the
 * user can touch anything, and changes are reported as *mechanism* changes
 * instead of as editor operations.
 *
 * It deliberately does not know what a puzzle is. Questions, answers, hints and
 * marks live in whatever is teaching; this only knows how to be a well-behaved
 * embedded editor.
 */
export const MechanismEditor = ({
  structServiceProvider,
  staticResourcesUrl,
  errorHandler,
  ket,
  capabilities,
  onReady,
  onArrowsChange,
}: MechanismEditorProps) => {
  const apiRef = useRef<MechanismEditorApi | null>(null);
  const unwatchRef = useRef<(() => void) | null>(null);

  // Held in refs so that a host passing inline callbacks does not tear down and
  // rebuild the subscription on every render.
  const onReadyRef = useRef(onReady);
  const onArrowsChangeRef = useRef(onArrowsChange);
  onReadyRef.current = onReady;
  onArrowsChangeRef.current = onArrowsChange;

  const handleInit = useCallback(
    async (ketcher: Ketcher) => {
      const api = createMechanismEditorApi(ketcher);
      apiRef.current = api;

      // Applied before the document, so there is no moment where a locked
      // activity is briefly editable.
      if (capabilities) api.setCapabilities(capabilities);

      if (ket) await api.loadKet(ket);

      unwatchRef.current = watchMechanismArrows(ketcher, (change) =>
        onArrowsChangeRef.current?.(change),
      );

      onReadyRef.current?.(api);
    },
    // Intentionally mount-only: `ket` and `capabilities` are handled by their
    // own effects below, so that changing them updates the live editor rather
    // than remounting it and losing the learner's work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => () => unwatchRef.current?.(), []);

  useEffect(() => {
    if (apiRef.current && capabilities) {
      apiRef.current.setCapabilities(capabilities);
    }
  }, [capabilities]);

  useEffect(() => {
    if (apiRef.current && ket) {
      // Fire and forget: a failed load surfaces through the editor's own error
      // handler, which the host supplies.
      apiRef.current.loadKet(ket).catch(() => undefined);
    }
  }, [ket]);

  return (
    <Editor
      staticResourcesUrl={staticResourcesUrl}
      structServiceProvider={structServiceProvider}
      capabilities={capabilities}
      errorHandler={errorHandler ?? (() => undefined)}
      onInit={handleInit}
      // An activity is a small-molecule task; the macromolecules editor and its
      // mode toggle would only be a way to leave it.
      disableMacromoleculesEditor
    />
  );
};
