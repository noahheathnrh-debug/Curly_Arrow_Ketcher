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

import type { ReStruct } from 'application/render';
import { type LonePairAttachment, RxnArrow } from 'domain/entities/rxnArrow';
import { Vec2 } from 'domain/entities/vec2';
import { Scale } from 'domain/helpers';
import { assert, toFixed } from 'utilities';
import { OperationType } from '../OperationType';
import Base from '../BaseOperation';

export const ARROW_MAX_SNAPPING_ANGLE = Math.PI / 36; // 5°

interface RxnArrowResizeData {
  id: number;
  d: Vec2;
  current: Vec2;
  anchor: Vec2 | null;
  noinvalidate: boolean;
  newLpAttach?: LonePairAttachment | null;
}
export class RxnArrowResize extends Base {
  readonly data: RxnArrowResizeData;
  readonly isSnappingEnabled: boolean;

  constructor(
    id: number,
    d: Vec2,
    current: Vec2,
    anchor: Vec2 | null,
    noinvalidate: boolean,
    isSnappingEnabled: boolean,
    newLpAttach?: LonePairAttachment | null,
  ) {
    super(OperationType.RXN_ARROW_RESIZE);
    this.data = { id, d, current, anchor, noinvalidate };
    // Only include newLpAttach when explicitly provided (including null to clear attachment)
    if (newLpAttach !== undefined) {
      this.data.newLpAttach = newLpAttach;
    }
    this.isSnappingEnabled = isSnappingEnabled;
  }

  execute(restruct: ReStruct): void {
    const struct = restruct.molecule;
    const id = this.data.id;
    let d = this.data.d;
    const current = this.data.current;
    const item = struct.rxnArrows.get(id);
    const reItem = restruct.rxnArrows.get(id);
    assert(item != null && reItem != null);
    const anchor = this.data.anchor;
    if (anchor) {
      const previousPos0 = item.pos[0].get_xy0();
      const previousPos1 = item.pos[1].get_xy0();
      let middlePoint: Vec2 | undefined;

      // Resolve current handle positions (cubic vs quadratic mode)
      let cp1Point: Vec2 | undefined;
      let cp2Point: Vec2 | undefined;
      if (RxnArrow.isElliptical(item)) {
        const refPts = reItem.getReferencePoints();
        if (item.height2 !== undefined) {
          // Cubic mode: [pos0, pos1, cp1, mid, cp2]
          [, , cp1Point, middlePoint, cp2Point] = refPts;
        } else {
          // Quadratic mode: [pos0, pos1, mid]
          middlePoint = refPts[2];
        }
      }

      if (
        /**
         *          (anchor)
         *   (pos[1])   ^
         *              |  ↘ (d)
         *   (pos[0])   o —— > (current)
         *
         * more details: ./RxnArrowResize.doc.png
         */
        toFixed(anchor.x) === toFixed(item.pos[1].x) &&
        toFixed(anchor.y) === toFixed(item.pos[1].y)
      ) {
        if (this.isSnappingEnabled) {
          const currentArrowVector = current.sub(item.pos[0]);
          const snappedArrowVector = getSnappedArrowVector(currentArrowVector);
          const snappedCurrent = item.pos[0].add(snappedArrowVector);
          current.x = snappedCurrent.x;
          current.y = snappedCurrent.y;
        }
        item.pos[1].x = anchor.x = current.x;
        current.x = previousPos1.x;
        item.pos[1].y = anchor.y = current.y;
        current.y = previousPos1.y;
      }

      if (
        /**
         *          (anchor)
         *   (pos[0])   o
         *              |  ↘ (d)
         *   (pos[1])   x —— o  (current)
         *
         * more details: ./RxnArrowResize.doc.png
         */
        toFixed(anchor.x) === toFixed(item.pos[0].x) &&
        toFixed(anchor.y) === toFixed(item.pos[0].y)
      ) {
        if (this.isSnappingEnabled) {
          const currentArrowVector = current.sub(item.pos[1]);
          const snappedArrowVector = getSnappedArrowVector(currentArrowVector);
          const snappedCurrent = item.pos[1].add(snappedArrowVector);
          current.x = snappedCurrent.x;
          current.y = snappedCurrent.y;
        }
        item.pos[0].x = anchor.x = current.x;
        current.x = previousPos0.x;
        item.pos[0].y = anchor.y = current.y;
        current.y = previousPos0.y;
      }

      // Curve handle adjustments (height/height2)
      if (RxnArrow.isElliptical(item)) {
        // Any hand-adjustment of the curve hands ownership of the shape to the
        // user permanently. Without this the next structure edit would clear
        // the route cache and the auto-router would quietly undo their work.
        if (RxnArrow.isMechanism(item)) {
          item.autoRoute = false;
        }

        const { angle } = reItem.getArrowParams(
          item.pos[0].x,
          item.pos[0].y,
          item.pos[1].x,
          item.pos[1].y,
        );
        const angleInRadians = (angle * Math.PI) / 180;
        const cosAngle = Math.cos(angleInRadians);
        const sinAngle = Math.sin(angleInRadians);
        const diffX = current.x - anchor.x;
        const diffY = current.y - anchor.y;
        const diff = diffY * cosAngle - diffX * sinAngle;

        // cp1 handle (cubic mode only) — adjusts height only
        if (
          cp1Point &&
          toFixed(anchor.x) === toFixed(cp1Point.x) &&
          toFixed(anchor.y) === toFixed(cp1Point.y)
        ) {
          if (item.height !== undefined) {
            item.height -= diff;
          }
          const [, , newCp1] = reItem.getReferencePoints();
          anchor.x = newCp1.x;
          anchor.y = newCp1.y;
        }

        // mid handle — adjusts both heights (lazy-activates cubic on first drag)
        if (
          middlePoint &&
          toFixed(anchor.x) === toFixed(middlePoint.x) &&
          toFixed(anchor.y) === toFixed(middlePoint.y)
        ) {
          // Lazy activation: first mid drag in quadratic mode → activate cubic
          if (item.height2 === undefined) {
            item.height2 = item.height;
          }
          if (item.height !== undefined) {
            item.height -= diff;
          }
          if (item.height2 !== undefined) {
            item.height2 -= diff;
          }
          // After activation getReferencePoints returns 5 pts; mid is at index 3
          const newRefPts = reItem.getReferencePoints();
          anchor.x = newRefPts[3].x;
          anchor.y = newRefPts[3].y;
        }

        // cp2 handle (cubic mode only) — adjusts height2 only
        if (
          cp2Point &&
          toFixed(anchor.x) === toFixed(cp2Point.x) &&
          toFixed(anchor.y) === toFixed(cp2Point.y)
        ) {
          if (item.height2 !== undefined) {
            item.height2 -= diff;
          }
          const [, , , , newCp2] = reItem.getReferencePoints();
          anchor.x = newCp2.x;
          anchor.y = newCp2.y;
        }
      }
    } else {
      if (this.isSnappingEnabled) {
        d = getSnappedArrowVector(d);
      }
      item.pos[1].add_(d);
    }

    reItem.visel.translate(Scale.modelToCanvas(d, restruct.render.options));
    this.data.d = d.negated();

    // Swap lpAttach so each execute() call toggles between old and new state
    if ('newLpAttach' in this.data) {
      const oldLpAttach = item.lpAttach;
      item.lpAttach = this.data.newLpAttach ?? undefined;
      this.data.newLpAttach = oldLpAttach;
    }

    if (!this.data.noinvalidate) {
      Base.invalidateItem(restruct, 'rxnArrows', id, 1);
    }
  }

  invert(): Base {
    return new RxnArrowResize(
      this.data.id,
      this.data.d,
      this.data.current,
      this.data.anchor,
      this.data.noinvalidate,
      this.isSnappingEnabled,
      this.data.newLpAttach,
    );
  }

  isDummy() {
    const { d } = this.data;
    return d.x === 0 && d.y === 0;
  }
}

export function getSnappedArrowVector(arrow: Vec2) {
  const AXIS = {
    POSITIVE_X: 0,
    POSITIVE_Y: Math.PI / 2,
    NEGATIVE_X: [Math.PI, -Math.PI],
    NEGATIVE_Y: -Math.PI / 2,
  };
  const oxAngle = arrow.oxAngle();
  const arrowLength = arrow.length();
  const isSnappingToPositiveXAxis =
    Math.abs(oxAngle - AXIS.POSITIVE_X) <= ARROW_MAX_SNAPPING_ANGLE;
  if (isSnappingToPositiveXAxis) {
    return new Vec2(arrowLength, 0);
  }
  const isSnappingToPositiveYAxis =
    Math.abs(oxAngle - AXIS.POSITIVE_Y) <= ARROW_MAX_SNAPPING_ANGLE;
  if (isSnappingToPositiveYAxis) {
    return new Vec2(0, arrowLength);
  }
  const isSnappingToNegativeXAxis =
    Math.abs(oxAngle - AXIS.NEGATIVE_X[0]) <= ARROW_MAX_SNAPPING_ANGLE ||
    Math.abs(oxAngle - AXIS.NEGATIVE_X[1]) <= ARROW_MAX_SNAPPING_ANGLE;
  if (isSnappingToNegativeXAxis) {
    return new Vec2(-arrowLength, 0);
  }
  const isSnappingToNegativeYAxis =
    Math.abs(oxAngle - AXIS.NEGATIVE_Y) <= ARROW_MAX_SNAPPING_ANGLE;
  if (isSnappingToNegativeYAxis) {
    return new Vec2(0, -arrowLength);
  }
  return arrow;
}
