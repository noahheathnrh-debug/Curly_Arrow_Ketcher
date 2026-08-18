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

import { Vec2 } from 'domain/entities/vec2';
import { RxnArrowMode } from 'domain/entities/rxnArrow';
import {
  ARROW_CLEARANCE,
  BOND_CLEARANCE,
  CHARGE_CLEARANCE,
  DOT_CLEARANCE,
  LABEL_CLEARANCE,
} from './constants';
import { flattenCubic, makeDisc } from './geometry';
import type {
  MechanismArrowShape,
  MechanismMetrics,
  MechanismStruct,
  Obstacle,
} from './types';

/**
 * How coarsely an existing arrow is turned into collision geometry.
 *
 * An arrow is a soft obstacle — a new arrow should not lie on top of an old
 * one, but tracking its curve to sub-pixel accuracy would cost far more
 * segments than the outcome justifies. Sixteen is enough that the capsule chain
 * never bulges noticeably off the curve at these radii.
 */
const ARROW_SEGMENTS = 16;
const ARROW_FLATTEN_TOLERANCE = 0.02;

/**
 * Everything drawn on the canvas, as inflated collision geometry.
 *
 * The single biggest defect in the previous router was that it only knew about
 * atom *centres*, so bonds were literally invisible to it and arrows routed
 * straight through them. Bonds are capsules here, not points and not infinitely
 * thin segments.
 *
 * Ids are stable and descriptive (`bond:4`, `label:2`, `charge:7`) because
 * routes carry the ids they collided with into metric snapshots, where a
 * meaningful name is worth a great deal when a test fails.
 */
export function buildObstacles(
  struct: MechanismStruct,
  metrics: MechanismMetrics,
  excludeArrow?: MechanismArrowShape,
): Obstacle[] {
  const obstacles: Obstacle[] = [];

  struct.bonds.forEach((bond, bondId) => {
    // Nucleus to nucleus, not the drawn extent.
    //
    // A bond is *drawn* pulled back from each atom so as not to run into its
    // label, which left a corridor of unblocked space between the end of the
    // label's box and the start of the bond's capsule — and arrows threaded
    // straight down it, between a group and the bond it hangs off. Nothing was
    // wrong with either obstacle; the gap was between them.
    //
    // Extending to the centres costs nothing: the space it adds is inside the
    // label, which is already blocked by the label's own box. That was not true
    // when this was written and the label was only a half-width.
    //
    // The notch only *opened* when the atom was the arrow's own endpoint, since
    // that is what exempts its label; with the label standing, its clearance
    // margin covered the gap by itself. `labelCorridor.test.ts` therefore
    // asserts this with the exemption applied, and fails without this line.
    const begin = struct.atoms.get(bond.begin);
    const end = struct.atoms.get(bond.end);
    if (!begin || !end) return;

    obstacles.push({
      id: `bond:${bondId}`,
      cls: 'bond',
      shape: 'capsule',
      capsule: {
        a: begin.pp,
        b: end.pp,
        r: metrics.bondHalfWidth(bondId) + BOND_CLEARANCE,
      },
    });
  });

  struct.atoms.forEach((_atom, atomId) => {
    // The drawn text, not a square guessed from its width. `H3C` sits almost
    // entirely to the left of its own atom, and a symmetric box let arrows run
    // straight through the visible characters.
    const label = metrics.labelBox(atomId);
    if (label) {
      obstacles.push({
        id: `label:${atomId}`,
        cls: 'label',
        shape: 'box',
        box: {
          min: new Vec2(
            label.min.x - LABEL_CLEARANCE,
            label.min.y - LABEL_CLEARANCE,
          ),
          max: new Vec2(
            label.max.x + LABEL_CLEARANCE,
            label.max.y + LABEL_CLEARANCE,
          ),
        },
      });
    }

    const charge = metrics.chargeShape(atomId);
    if (charge) {
      obstacles.push({
        id: `charge:${atomId}`,
        cls: 'charge',
        shape: 'capsule',
        capsule: { ...charge, r: charge.r + CHARGE_CLEARANCE },
      });
    }

    metrics.visibleLonePairDots(atomId).forEach((dot, index) => {
      obstacles.push({
        id: `lonepair:${atomId}:${index}`,
        cls: 'lone-pair',
        shape: 'capsule',
        capsule: makeDisc(dot, DOT_CLEARANCE),
      });
    });

    metrics.radicalDots(atomId).forEach((dot, index) => {
      obstacles.push({
        id: `radical:${atomId}:${index}`,
        cls: 'radical',
        shape: 'capsule',
        capsule: makeDisc(dot, DOT_CLEARANCE),
      });
    });
  });

  struct.rxnArrows?.forEach((arrow, arrowId) => {
    if (arrow === excludeArrow) return;
    appendArrowObstacles(obstacles, arrow, arrowId);
  });

  return obstacles;
}

/**
 * An existing mechanism arrow, as a chain of capsules along its curve.
 *
 * This is what stops a second arrow being drawn on top of the first. Arrows
 * are never jointly optimised — an arrow must not move because a later one was
 * drawn — so the only way the later one knows to give way is by seeing the
 * earlier one here.
 */
function appendArrowObstacles(
  obstacles: Obstacle[],
  arrow: MechanismArrowShape,
  arrowId: number,
): void {
  if (
    arrow.mode !== RxnArrowMode.CurlyMechanism &&
    arrow.mode !== RxnArrowMode.FishhookMechanism
  ) {
    return;
  }

  const [p0, p1] = arrow.pos;
  if (!p0 || !p1) return;

  const points = flattenCubic(
    p0,
    p1,
    arrow.height ?? 0,
    arrow.height2 ?? arrow.height ?? 0,
    ARROW_FLATTEN_TOLERANCE,
    ARROW_SEGMENTS,
    arrow.along1,
    arrow.along2,
  );

  for (let i = 1; i < points.length; i++) {
    obstacles.push({
      id: `arrow:${arrowId}:${i - 1}`,
      cls: 'arrow',
      shape: 'capsule',
      capsule: { a: points[i - 1], b: points[i], r: ARROW_CLEARANCE },
    });
  }
}

/**
 * Obstacle ids belonging to an atom — its label, charge and non-bonding dots.
 *
 * Used to build the local exemptions around an endpoint. A route may enter its
 * own destination atom's immediate vicinity; it may not enter anything else's.
 */
export function obstacleIdsForAtom(
  atomId: number,
  metrics: MechanismMetrics,
): Set<string> {
  // The label is exempt so that an arrow may reach inside it — the SN2
  // backside attack needs that, and dropping it here breaks the fixture.
  //
  // That used to let an arrow squeeze between a group and its own bond, since
  // the bond's capsule stopped short of the label and nothing guarded the space
  // between. It no longer does: `buildObstacles` runs the capsule to the atom
  // centre, so exempting the label uncovers the label's own interior and
  // nothing more. The gap reopens only when the *bond* is exempted too, which
  // happens exactly when that bond is the one breaking — where an arrow curling
  // off it onto its own atom is the thing being drawn.
  const ids = new Set<string>([`label:${atomId}`, `charge:${atomId}`]);

  metrics
    .visibleLonePairDots(atomId)
    .forEach((_dot, index) => ids.add(`lonepair:${atomId}:${index}`));
  metrics
    .radicalDots(atomId)
    .forEach((_dot, index) => ids.add(`radical:${atomId}:${index}`));

  return ids;
}

export function obstacleIdForBond(bondId: number): string {
  return `bond:${bondId}`;
}

/** Bonds incident on an atom, needed when a breaking bond must stop blocking. */
export function bondsAtAtom(struct: MechanismStruct, atomId: number): number[] {
  const ids: number[] = [];
  struct.bonds.forEach((bond, bondId) => {
    if (bond.begin === atomId || bond.end === atomId) ids.push(bondId);
  });
  return ids;
}
