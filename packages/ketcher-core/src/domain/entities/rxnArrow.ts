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

import { type Point, Vec2 } from './vec2';
import {
  type initiallySelectedType,
  BaseMicromoleculeEntity,
} from 'domain/entities/BaseMicromoleculeEntity';

export enum RxnArrowMode {
  OpenAngle = 'open-angle',
  FilledTriangle = 'filled-triangle',
  FilledBow = 'filled-bow',
  DashedOpenAngle = 'dashed-open-angle',
  Failed = 'failed',
  Retrosynthetic = 'retrosynthetic',
  BothEndsFilledTriangle = 'both-ends-filled-triangle',
  EquilibriumFilledTriangle = 'equilibrium-filled-triangle',
  EquilibriumFilledHalfBow = 'equilibrium-filled-half-bow',
  EquilibriumOpenAngle = 'equilibrium-open-angle',
  UnbalancedEquilibriumFilledHalfBow = 'unbalanced-equilibrium-filled-half-bow',
  UnbalancedEquilibriumOpenHalfAngle = 'unbalanced-equilibrium-open-half-angle',
  UnbalancedEquilibriumLargeFilledHalfBow = 'unbalanced-equilibrium-large-filled-half-bow',
  UnbalancedEquilibriumFilledHalfTriangle = 'unbalanced-equilibrium-filled-half-triangle',
  EllipticalArcFilledBow = 'elliptical-arc-arrow-filled-bow',
  EllipticalArcFilledTriangle = 'elliptical-arc-arrow-filled-triangle',
  EllipticalArcOpenAngle = 'elliptical-arc-arrow-open-angle',
  EllipticalArcOpenHalfAngle = 'elliptical-arc-arrow-open-half-angle',
  CurlyMechanism = 'curly-mechanism',
  FishhookMechanism = 'fishhook-mechanism',
}

export interface LonePairAttachment {
  atomId: number;
  pairIdx: number;
}

export interface RadicalAttachment {
  atomId: number;
  radicalIdx: number;
}

/**
 * Electron source anchored to a bond: heterolytic cleavage, a migrating sigma
 * bond, or a pi bond donating into an adjacent centre.
 *
 * `side` selects which side of the bond axis the tail sits on (sign of the
 * cross product of the bond direction with the offset). `component` is purely
 * renderer metadata — it picks which line of a double bond the tail hangs off
 * and never affects bond identity.
 */
export interface BondAttachment {
  bondId: number;
  side?: -1 | 1;
  component?: 'sigma' | 'pi';
}

/**
 * Where the electrons land. Mirrors {@link LonePairAttachment} on the head end
 * so the arrowhead survives the target atom moving, and so the router can pick
 * a free approach sector instead of aiming at a raw coordinate.
 *
 * - `atom`     — electrons become a lone pair/radical on that atom (bond
 *                cleavage, protonation target).
 * - `bond`     — bond order increases; `side` picks where the new line appears.
 * - `new-bond` — a bond forms between two atoms; the head belongs in the gap
 *                between them, nearer the receiving atom. `atomId1` is the
 *                donor (the end the electrons come from) and `atomId2` is the
 *                receiver. The order is load-bearing: it decides which end the
 *                arrowhead sits near and which free sector it arrives through.
 *
 * On an atom or new-bond destination `approach` records which way in the user
 * chose — the direction of the lobe they released on, in radians out of the
 * target. It names a free wedge, not an exact heading: the router still picks
 * the precise angle within that wedge, so the choice survives the structure
 * being edited underneath it. Absent means the router chooses the wedge too.
 */
export type ElectronDestination =
  | { kind: 'atom'; atomId: number; approach?: number }
  | { kind: 'bond'; bondId: number; side?: -1 | 1 }
  | { kind: 'new-bond'; atomId1: number; atomId2: number; approach?: number };

/**
 * Everything that makes a mechanism arrow a mechanism arrow, bundled so it can
 * ride through the macromolecule `DrawingEntity` conversion that the default
 * serialize/deserialize path goes through. That conversion rebuilds arrows
 * field by field, so anything not explicitly carried is silently lost.
 */
/**
 * Where the two cubic control points sit *along* the chord, as a fraction of
 * its length. Absent means the classic thirds, so an arrow saved before these
 * existed draws identically.
 *
 * Together with `height`/`height2` (the perpendicular offsets) these free the
 * control points to move in two dimensions instead of only sideways. That is
 * what lets an arrow leave and arrive at arbitrary angles — a sweep around the
 * outside of a ring arrives more than 90 degrees off its own chord, which is
 * unreachable when the control points are pinned at fixed thirds.
 */
export const DEFAULT_ALONG_1 = 1 / 3;
export const DEFAULT_ALONG_2 = 2 / 3;

/**
 * The same anchors as the numeric fields, but naming atoms and bonds by their
 * {@link AtomAttributes.stableId} instead of by Pool id.
 *
 * Carried alongside the numeric fields rather than replacing them: the numbers
 * are what everything downstream reads, and a KET file written before stable
 * ids existed has only the numbers. This is the copy that survives the
 * renumbering, and it is resolved back into the numeric fields once the whole
 * structure has been reassembled.
 */
export interface MechanismAnchorRefs {
  lpAtom?: string;
  raAtom?: string;
  bdBond?: string;
  destAtom?: string;
  destAtom1?: string;
  destAtom2?: string;
  destBond?: string;
}

export interface MechanismArrowData {
  height2?: number;
  along1?: number;
  along2?: number;
  lpAttach?: LonePairAttachment;
  raAttach?: RadicalAttachment;
  bdAttach?: BondAttachment;
  destAttach?: ElectronDestination;
  autoRoute?: boolean;
  anchorRefs?: MechanismAnchorRefs;
}

export interface RxnArrowAttributes {
  mode: RxnArrowMode;
  pos?: Array<Point>;
  height?: number;
  height2?: number;
  along1?: number;
  along2?: number;
  initiallySelected?: initiallySelectedType;
  lpAttach?: LonePairAttachment;
  raAttach?: RadicalAttachment;
  bdAttach?: BondAttachment;
  destAttach?: ElectronDestination;
  autoRoute?: boolean;
  arrowId?: number;
  anchorRefs?: MechanismAnchorRefs;
}

export class RxnArrow extends BaseMicromoleculeEntity {
  mode: RxnArrowMode;
  pos: Array<Vec2>;
  height?: number;
  height2?: number;
  along1?: number;
  along2?: number;
  lpAttach?: LonePairAttachment;
  raAttach?: RadicalAttachment;
  bdAttach?: BondAttachment;
  destAttach?: ElectronDestination;
  /**
   * True while the curve shape is owned by the auto-router. Flipped to false
   * permanently the first time the user drags a curvature handle, so manual
   * edits are never silently overwritten by a re-route.
   */
  autoRoute?: boolean;
  arrowId?: number;
  /**
   * Set while a KET file is being read and cleared once the ids are resolved.
   * Never meaningful on an arrow the user is editing.
   */
  anchorRefs?: MechanismAnchorRefs;

  static isMechanism(arrow: { mode: RxnArrowMode }) {
    return (
      arrow.mode === RxnArrowMode.CurlyMechanism ||
      arrow.mode === RxnArrowMode.FishhookMechanism
    );
  }

  static isElliptical(arrow) {
    return [
      RxnArrowMode.EllipticalArcFilledBow,
      RxnArrowMode.EllipticalArcFilledTriangle,
      RxnArrowMode.EllipticalArcOpenHalfAngle,
      RxnArrowMode.EllipticalArcOpenAngle,
      RxnArrowMode.CurlyMechanism,
      RxnArrowMode.FishhookMechanism,
    ].includes(arrow.mode);
  }

  constructor(attributes: RxnArrowAttributes) {
    super(attributes?.initiallySelected);
    this.pos = [];
    this.arrowId = attributes.arrowId;

    if (attributes.pos) {
      for (let i = 0; i < attributes.pos.length; i++) {
        const currentP = attributes.pos[i];
        this.pos[i] = currentP ? new Vec2(attributes.pos[i]) : new Vec2();
      }
    }
    this.mode = attributes.mode;
    this.lpAttach = attributes.lpAttach;
    this.raAttach = attributes.raAttach;
    this.bdAttach = attributes.bdAttach;
    this.destAttach = attributes.destAttach;
    this.anchorRefs = attributes.anchorRefs;
    this.height2 = attributes.height2;
    this.along1 = attributes.along1;
    this.along2 = attributes.along2;
    // Mechanism arrows are auto-routed until the user says otherwise; every
    // other arrow mode has no router and must never be treated as routable.
    this.autoRoute = RxnArrow.isMechanism(attributes)
      ? attributes.autoRoute ?? true
      : undefined;
    const defaultHeight = RxnArrow.isMechanism(attributes) ? 0.25 : 1;

    if (RxnArrow.isElliptical(this)) {
      this.height = attributes.height ?? defaultHeight;
    }
  }

  clone() {
    return new RxnArrow(this);
  }

  center(): Vec2 {
    return Vec2.centre(this.pos[0], this.pos[1]);
  }

  /** Bundle the mechanism-only fields for transport across a conversion boundary. */
  mechanismData(): MechanismArrowData {
    return {
      height2: this.height2,
      along1: this.along1,
      along2: this.along2,
      lpAttach: this.lpAttach,
      raAttach: this.raAttach,
      bdAttach: this.bdAttach,
      destAttach: this.destAttach,
      autoRoute: this.autoRoute,
      anchorRefs: this.anchorRefs,
    };
  }
}
