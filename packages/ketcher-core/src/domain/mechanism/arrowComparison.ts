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

import type { Struct } from 'domain/entities/struct';
import {
  RxnArrow,
  RxnArrowMode,
  type ElectronDestination,
} from 'domain/entities/rxnArrow';

/**
 * Comparing mechanism arrows, without knowing anything about courses or marks.
 *
 * This answers one question — *do these two arrows describe the same electron
 * movement?* — and nothing else. What counts as a correct answer, how many
 * attempts are allowed, what partial credit is worth: all of that belongs to
 * whatever is teaching, not here.
 *
 * The comparison is over chemistry, not drawing. Two arrows that push the same
 * electrons to the same place are equal however differently they are curved,
 * whichever lone pair of a pair the learner happened to grab, and whichever side
 * of a bond the tail hangs off.
 */

/** Where the electrons come from. */
export type ArrowSource =
  | { kind: 'lone-pair'; atomId: number; pairIdx: number }
  | { kind: 'radical'; atomId: number; radicalIdx: number }
  | {
      kind: 'bond';
      bondId: number;
      side?: -1 | 1;
      component?: 'sigma' | 'pi';
    };

/**
 * One arrow reduced to its chemical meaning.
 *
 * `kind` distinguishes a curly arrow (an electron *pair*) from a fishhook (a
 * single electron). They are never interchangeable: homolytic and heterolytic
 * cleavage are different chemistry, and a learner who draws one for the other
 * has not given a nearly-right answer.
 */
export interface MechanismArrowDescriptor {
  arrowId?: number;
  kind: 'curly' | 'fishhook';
  source: ArrowSource;
  destination: ElectronDestination;
}

export interface ArrowCompareOptions {
  /**
   * Treat a `new-bond` destination as undirected.
   *
   * Off by default. `atomId1` is the donor and `atomId2` the receiver, and which
   * is which is the substance of the answer — "the alkene attacks the proton"
   * and "the proton attacks the alkene" are not the same claim.
   */
  ignoreBondDirection?: boolean;
  /**
   * Accept a lone-pair tail where a radical tail was expected, and vice versa.
   *
   * Off by default, and rarely appropriate: it erases the difference between
   * pushing a pair and pushing a single electron.
   */
  ignoreElectronCount?: boolean;
}

/**
 * Read an arrow off a structure.
 *
 * Returns null for anything that is not a mechanism arrow, or for a mechanism
 * arrow that is missing an end — a half-drawn arrow has no meaning to compare.
 */
export function describeArrow(
  arrow: RxnArrow,
): MechanismArrowDescriptor | null {
  if (!RxnArrow.isMechanism(arrow)) return null;
  if (!arrow.destAttach) return null;

  let source: ArrowSource | null = null;
  if (arrow.lpAttach) {
    source = {
      kind: 'lone-pair',
      atomId: arrow.lpAttach.atomId,
      pairIdx: arrow.lpAttach.pairIdx,
    };
  } else if (arrow.raAttach) {
    source = {
      kind: 'radical',
      atomId: arrow.raAttach.atomId,
      radicalIdx: arrow.raAttach.radicalIdx,
    };
  } else if (arrow.bdAttach) {
    source = {
      kind: 'bond',
      bondId: arrow.bdAttach.bondId,
      side: arrow.bdAttach.side,
      component: arrow.bdAttach.component,
    };
  }
  if (!source) return null;

  return {
    arrowId: arrow.arrowId,
    kind: arrow.mode === RxnArrowMode.FishhookMechanism ? 'fishhook' : 'curly',
    source,
    destination: arrow.destAttach,
  };
}

/** Every mechanism arrow on a structure, in document order. */
export function describeArrows(struct: Struct): MechanismArrowDescriptor[] {
  const described: MechanismArrowDescriptor[] = [];
  struct.rxnArrows.forEach((arrow) => {
    const descriptor = describeArrow(arrow);
    if (descriptor) described.push(descriptor);
  });
  return described;
}

function sameSource(
  a: ArrowSource,
  b: ArrowSource,
  options: ArrowCompareOptions,
): boolean {
  // A lone pair and a radical on the same atom are different chemistry, so the
  // kinds must match unless the caller has explicitly said otherwise.
  if (a.kind !== b.kind) {
    if (!options.ignoreElectronCount) return false;
    const nonBonding = ['lone-pair', 'radical'];
    if (!nonBonding.includes(a.kind) || !nonBonding.includes(b.kind)) {
      return false;
    }
    return (
      (a as { atomId: number }).atomId === (b as { atomId: number }).atomId
    );
  }

  switch (a.kind) {
    case 'lone-pair':
      // `pairIdx` is deliberately not compared. It is a position in a layout
      // that is recomputed from the atom's geometry, not an identity — which
      // lone pair of an oxygen's two the learner grabbed says nothing about
      // whether they understand the mechanism.
      return a.atomId === (b as typeof a).atomId;
    case 'radical':
      return a.atomId === (b as typeof a).atomId;
    case 'bond':
      // `side` and `component` are documented renderer metadata: they choose
      // where the tail is drawn, never which bond it means.
      return a.bondId === (b as typeof a).bondId;
    default:
      return false;
  }
}

function sameDestination(
  a: ElectronDestination,
  b: ElectronDestination,
  options: ArrowCompareOptions,
): boolean {
  if (a.kind !== b.kind) return false;

  switch (a.kind) {
    case 'atom':
      // `approach` names the wedge the arrowhead arrives through — a drawing
      // choice the router is free to refine.
      return a.atomId === (b as typeof a).atomId;
    case 'bond':
      return a.bondId === (b as typeof a).bondId;
    case 'new-bond': {
      const other = b as typeof a;
      if (a.atomId1 === other.atomId1 && a.atomId2 === other.atomId2) {
        return true;
      }
      return Boolean(
        options.ignoreBondDirection &&
          a.atomId1 === other.atomId2 &&
          a.atomId2 === other.atomId1,
      );
    }
    default:
      return false;
  }
}

/** Whether two arrows describe the same electron movement. */
export function compareArrows(
  a: MechanismArrowDescriptor,
  b: MechanismArrowDescriptor,
  options: ArrowCompareOptions = {},
): boolean {
  if (a.kind !== b.kind && !options.ignoreElectronCount) return false;
  return (
    sameSource(a.source, b.source, options) &&
    sameDestination(a.destination, b.destination, options)
  );
}

export interface ArrowSetMatch {
  /** `[drawnIndex, expectedIndex]` for each arrow that found its counterpart. */
  matched: Array<[number, number]>;
  /** Indices into `expected` that nothing drawn accounts for. */
  missing: number[];
  /** Indices into `drawn` that answer nothing expected. */
  extra: number[];
  /** True when every expected arrow was drawn and nothing else was. */
  complete: boolean;
}

/**
 * Match a set of drawn arrows against a set of expected ones.
 *
 * Order-independent: a mechanism step's arrows happen at once, and insisting a
 * learner draw them in a particular sequence would test recall of this tool
 * rather than of the chemistry. A caller that genuinely needs an ordering can
 * compare step by step instead.
 *
 * Matching is greedy and one-to-one — each expected arrow is answered by at most
 * one drawn arrow — so drawing the same correct arrow twice leaves the duplicate
 * reported as extra rather than quietly accepted.
 */
export function matchArrowSet(
  drawn: MechanismArrowDescriptor[],
  expected: MechanismArrowDescriptor[],
  options: ArrowCompareOptions = {},
): ArrowSetMatch {
  const matched: Array<[number, number]> = [];
  const takenExpected = new Set<number>();
  const takenDrawn = new Set<number>();

  drawn.forEach((drawnArrow, drawnIndex) => {
    const expectedIndex = expected.findIndex(
      (expectedArrow, index) =>
        !takenExpected.has(index) &&
        compareArrows(drawnArrow, expectedArrow, options),
    );
    if (expectedIndex === -1) return;

    takenExpected.add(expectedIndex);
    takenDrawn.add(drawnIndex);
    matched.push([drawnIndex, expectedIndex]);
  });

  const missing = expected
    .map((_, index) => index)
    .filter((index) => !takenExpected.has(index));
  const extra = drawn
    .map((_, index) => index)
    .filter((index) => !takenDrawn.has(index));

  return {
    matched,
    missing,
    extra,
    complete: missing.length === 0 && extra.length === 0,
  };
}

/**
 * The atoms and bonds an arrow touches.
 *
 * Useful to a host that wants to point at what a wrong arrow did — highlighting
 * works in atoms and bonds, so this is the translation from an arrow's meaning
 * to the things that can be shown.
 */
export function arrowTouches(descriptor: MechanismArrowDescriptor): {
  atoms: number[];
  bonds: number[];
} {
  const atoms: number[] = [];
  const bonds: number[] = [];

  const { source, destination } = descriptor;
  if (source.kind === 'lone-pair' || source.kind === 'radical') {
    atoms.push(source.atomId);
  } else {
    bonds.push(source.bondId);
  }

  if (destination.kind === 'atom') atoms.push(destination.atomId);
  if (destination.kind === 'bond') bonds.push(destination.bondId);
  if (destination.kind === 'new-bond') {
    atoms.push(destination.atomId1, destination.atomId2);
  }

  return { atoms, bonds };
}
