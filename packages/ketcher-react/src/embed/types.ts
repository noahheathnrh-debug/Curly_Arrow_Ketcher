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

import type {
  CapabilitySpec,
  Ketcher,
  MechanismArrowDescriptor,
} from 'ketcher-core';

/**
 * Highlighting expressed in the host's terms.
 *
 * Atoms and bonds, because those are what the editor can actually shade. A host
 * that wants to point at an *arrow* should ask what that arrow touches and
 * highlight those.
 */
export interface HighlightSpec {
  atoms?: readonly number[];
  bonds?: readonly number[];
  /** Any CSS colour. */
  color: string;
  /** Outline instead of fill — useful for "look here" without claiming right or wrong. */
  outline?: boolean;
}

/**
 * What an embedding host can do with a mounted editor.
 *
 * Deliberately small. Everything here is something a teaching activity actually
 * needs; anything it does not need is left off, because this is the surface that
 * has to stay stable for embedders.
 */
export interface MechanismEditorApi {
  /** The underlying editor, for anything this surface does not cover yet. */
  readonly ketcher: Ketcher;

  /** Replace the document. */
  loadKet(ket: string): Promise<void>;
  /** The current document. */
  getKet(): Promise<string>;

  /** Every mechanism arrow currently drawn, in the editor's own terms. */
  getArrows(): MechanismArrowDescriptor[];

  /** Change what the user is allowed to do, without remounting. */
  setCapabilities(capabilities: CapabilitySpec): void;

  /**
   * Shade atoms and bonds as feedback.
   *
   * Replaces whatever was highlighted before, and never enters the undo history
   * — feedback is not something a learner should be able to undo.
   */
  highlight(specs: readonly HighlightSpec[]): void;
  clearHighlights(): void;
}

export interface MechanismArrowChange {
  /** Arrows added since the previous change. */
  readonly added: readonly MechanismArrowDescriptor[];
  /** Arrows removed since the previous change. */
  readonly removed: readonly MechanismArrowDescriptor[];
  /** Everything currently drawn. */
  readonly arrows: readonly MechanismArrowDescriptor[];
}
