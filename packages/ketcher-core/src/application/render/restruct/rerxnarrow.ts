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

import { Box2Abs } from 'domain/entities/box2Abs';
import {
  type LonePairAttachment,
  type RadicalAttachment,
  type RxnArrowMode,
  RxnArrow,
} from 'domain/entities/rxnArrow';
import { Vec2 } from 'domain/entities/vec2';

import { LayerMap } from './generalEnumTypes';
import Raphael from '../raphael-ext';
import ReObject from './reobject';
import type ReStruct from './restruct';
import type { Render } from '../raphaelRender';
import { Scale } from 'domain/helpers';
import draw from '../draw';
import util from '../util';
import { toFixed } from 'utilities';
import { getLonePairModelPositions, getRadicalModelPositions } from './lonePairUtils';

type Arrow = {
  pos: Array<Vec2>;
  mode: RxnArrowMode;
  height?: number;
  height2?: number;
  lpAttach?: LonePairAttachment;
  raAttach?: RadicalAttachment;
  arrowId?: number;
};

type ArrowParams = {
  length: number;
  angle: number;
};
interface MinDistanceWithReferencePoint {
  minDist: number;
  refPoint: Vec2 | null;
}

class ReRxnArrow extends ReObject {
  item: Arrow;
  isResizing = false;

  constructor(/* chem.RxnArrow */ arrow: Arrow) {
    super('rxnArrow');
    this.item = arrow;
  }

  static isSelectable(): boolean {
    return true;
  }

  calcDistance(p: Vec2, s: any): MinDistanceWithReferencePoint {
    const point: Vec2 = new Vec2(p.x, p.y);
    const distRef: MinDistanceWithReferencePoint =
      this.getReferencePointDistance(p);
    const item = this.item;
    const pos = item.pos;

    let dist: number = point.calculateDistanceToLine([pos[0], pos[1]]);

    if (RxnArrow.isElliptical(item)) {
      // currently an elliptical arrow is highlighted if a pointer is close to one of the 3 virtual lines
      // that form a triangle from the arrow's 3 reference points
      // TODO: make a better detection (maybe rectangular, so it's similar to visual highlight/selection)
      const refPts = this.getReferencePoints();
      // For cubic mode [pos0, pos1, cp1, mid, cp2] use start+mid and mid+end segments
      const midPt = refPts.length === 5 ? refPts[3] : refPts[2];
      dist = Math.min(
        dist,
        point.calculateDistanceToLine([refPts[0], midPt]),
        point.calculateDistanceToLine([midPt, refPts[1]]),
      );
    }

    const refPoint: Vec2 | null =
      distRef.minDist <= 8 / s ? distRef.refPoint : null;
    // distance is a smallest between dist to figure and it's reference points
    dist = Math.min(distRef.minDist, dist);
    return { minDist: dist, refPoint };
  }

  getReferencePointDistance(p: Vec2): MinDistanceWithReferencePoint {
    const dist: any = [];
    const refPoints = this.getReferencePoints();
    refPoints.forEach((rp) => {
      dist.push({ minDist: Math.abs(Vec2.dist(p, rp)), refPoint: rp });
    });

    const minDist: MinDistanceWithReferencePoint = dist.reduce(
      (acc, current) => {
        if (!acc) {
          return current;
        }

        return acc.minDist < current.minDist ? acc : current;
      },
      null,
    );

    return minDist;
  }

  hoverPath(render: Render) {
    const path = this.generatePath(render, render.options, 'selection');

    return render.paper.path(path);
  }

  drawHover(render: Render) {
    const ret = this.hoverPath(render).attr(render.options.hoverStyle);
    render.ctab.addReObjectPath(LayerMap.hovering, this.visel, ret);
    return ret;
  }

  getReferencePoints(): Array<Vec2> {
    const refPoints: Array<Vec2> = [];
    const item = this.item;
    const [a, b] = item.pos;
    refPoints.push(new Vec2(a.x, a.y));
    refPoints.push(new Vec2(b.x, b.y));

    if (RxnArrow.isElliptical(item)) {
      if (item.height2 !== undefined) {
        // Cubic mode: 5 handles — [pos0, pos1, cp1, mid, cp2]
        const { cp1, mid, cp2 } = computeCubicRefPoints(
          a,
          b,
          item.height ?? 0,
          item.height2,
        );
        refPoints.push(cp1);
        refPoints.push(mid);
        refPoints.push(cp2);
      } else {
        // Quadratic mode: 3 handles — [pos0, pos1, mid]
        const middlePoint = findMiddlePoint(item.height!, a, b);
        refPoints.push(middlePoint);
      }
    }
    return refPoints;
  }

  makeAdditionalInfo(restruct: ReStruct) {
    const scaleFactor = restruct.render.options.microModeScale;
    const refPoints = this.getReferencePoints();
    const selectionSet = restruct.render.paper.set();

    refPoints.forEach((rp) => {
      const scaledRP = Scale.modelToCanvas(rp, restruct.render.options);
      selectionSet.push(
        restruct.render.paper
          .circle(scaledRP.x, scaledRP.y, scaleFactor / 8)
          .attr({ fill: 'black' }),
      );
    });

    return selectionSet;
  }

  makeSelectionPlate(restruct: ReStruct, _paper, styles) {
    const render = restruct.render;
    const options = restruct.render.options;
    const selectionSet = restruct.render.paper.set();

    selectionSet.push(
      render.paper
        .path(this.generatePath(render, options, 'selection'))
        .attr(styles.selectionStyle),
    );
    return selectionSet;
  }

  generatePath(render: Render, options, type) {
    let path;
    const item = this.item;
    const height =
      RxnArrow.isElliptical(item) && item.height
        ? item.height * options.microModeScale
        : 0;
    const height2 =
      RxnArrow.isElliptical(item) && item.height2 !== undefined
        ? item.height2 * options.microModeScale
        : undefined;
    const pos = item.pos.map((p) => {
      return Scale.modelToCanvas(p, options) || new Vec2();
    });

    // Dynamically resolve the start point from the lone pair attachment
    if (item.lpAttach && item.mode === RxnArrowMode.CurlyMechanism) {
      const { atomId, pairIdx } = item.lpAttach;
      const reAtom = render.ctab.atoms.get(atomId);
      const modelAtom = render.ctab.molecule.atoms.get(atomId);
      if (reAtom && modelAtom) {
        const modelPositions = getLonePairModelPositions(
          modelAtom,
          render.ctab.molecule,
          atomId,
          render.options,
          reAtom.hydrogenOnTheLeft,
          reAtom.cachedLabelHalfSize || undefined,
        );
        if (modelPositions[pairIdx]) {
          pos[0] = Scale.modelToCanvas(modelPositions[pairIdx], options);
        }
      }
    }

    // Dynamically resolve the start point from the radical attachment
    if (item.raAttach && item.mode === RxnArrowMode.FishhookMechanism) {
      const { atomId, radicalIdx } = item.raAttach;
      const reAtom = render.ctab.atoms.get(atomId);
      const modelAtom = render.ctab.molecule.atoms.get(atomId);
      if (reAtom && modelAtom) {
        const radPositions = getRadicalModelPositions(
          modelAtom,
          render.ctab.molecule,
          atomId,
          render.options,
          reAtom.hydrogenOnTheLeft,
          reAtom.cachedLabelHalfSize || undefined,
        );
        if (radPositions[radicalIdx]) {
          pos[0] = Scale.modelToCanvas(radPositions[radicalIdx], options);
        }
      }
    }

    const { length, angle } = this.getArrowParams(
      pos[0].x,
      pos[0].y,
      pos[1].x,
      pos[1].y,
    );

    switch (type) {
      case 'selection':
        path = draw.rectangleArrowHighlightAndSelection(
          render.paper,
          { pos, height },
          length,
          angle,
        );
        break;
      case 'arrow':
        path = draw.arrow(
          render.paper,
          { ...item, pos, height, height2 },
          length,
          angle,
          options,
          this.isResizing,
        );
        break;
    }

    return path;
  }

  getArrowParams(x1, y1, x2, y2): ArrowParams {
    const length = Math.hypot(x2 - x1, y2 - y1);
    const angle = Raphael.angle(x1, y1, x2, y2) - 180;

    return { length, angle };
  }

  show(restruct: ReStruct, _id, options) {
    const path = this.generatePath(restruct.render, options, 'arrow');
    path.node?.setAttribute('data-testid', 'rxn-arrow');
    path.node?.setAttribute('data-arrowtype', this.item.mode + '-arrow');
    if (typeof this.item.arrowId === 'number') {
      path.node?.setAttribute('data-arrow-id', String(this.item.arrowId));
    }

    const offset = options.offset;

    // paper.set() (used by CurlyMechanism) has no translateAbs; unwrap its items.
    const isSet = (path as any).type === 'set';
    const items: any[] = isSet ? (path as any).items : [path];

    items[0]?.node?.setAttribute('data-testid', 'rxn-arrow');
    items[0]?.node?.setAttribute('data-arrowtype', this.item.mode + '-arrow');

    for (const p of items) {
      if (offset != null) p.translateAbs(offset.x, offset.y);
      this.visel.add(p, Box2Abs.fromRelBox(util.relBox(p.getBBox())));
    }
  }
}

/**
 * Compute the three cubic Bezier handle positions in model space.
 * perpDir = rotate90CW(chordDir) = (cdy, -cdx) — this matches the positive-height
 * convention used by findMiddlePoint (positive h arches "above" the chord on screen).
 */
function computeCubicRefPoints(
  a: Vec2,
  b: Vec2,
  h1: number,
  h2: number,
): { cp1: Vec2; mid: Vec2; cp2: Vec2 } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) {
    return { cp1: new Vec2(a), mid: new Vec2(a), cp2: new Vec2(a) };
  }
  const cdx = dx / len;
  const cdy = dy / len;
  const pdx = cdy; // perpDir = (cdy, -cdx)
  const pdy = -cdx;
  return {
    cp1: new Vec2(
      a.x + cdx * (len / 3) + pdx * h1,
      a.y + cdy * (len / 3) + pdy * h1,
    ),
    mid: new Vec2(
      a.x + cdx * (len / 2) + pdx * ((h1 + h2) / 2),
      a.y + cdy * (len / 2) + pdy * ((h1 + h2) / 2),
    ),
    cp2: new Vec2(
      a.x + cdx * ((2 * len) / 3) + pdx * h2,
      a.y + cdy * ((2 * len) / 3) + pdy * h2,
    ),
  };
}

function findMiddlePoint(height: number, a: Vec2, b: Vec2) {
  if (+toFixed(height) === 0) {
    const minX = Math.min(a.x, b.x);
    const minY = Math.min(a.y, b.y);
    const x = minX + Math.abs(a.x - b.x) / 2;
    const y = minY + Math.abs(a.y - b.y) / 2;
    return new Vec2(x, y);
  }
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const lengthHyp = Math.hypot(length / 2, height);
  const coordinates1 = util.calcCoordinates(a, b, lengthHyp).pos1;
  const coordinates2 = util.calcCoordinates(a, b, lengthHyp).pos2;

  if (height > 0) {
    if (b.x < a.x) {
      return new Vec2(coordinates1?.x, coordinates1?.y);
    }
    if (b.x > a.x) {
      return new Vec2(coordinates2?.x, coordinates2?.y);
    }
    if (b.x === a.x) {
      if (b.y > a.y) {
        return new Vec2(coordinates2?.x, coordinates2?.y);
      }
      if (b.y < a.y) {
        return new Vec2(coordinates1?.x, coordinates1?.y);
      }
      if (b.y === a.y) {
        return new Vec2(a.x, a.y);
      }
    }
  } else {
    if (b.x > a.x) {
      return new Vec2(coordinates1?.x, coordinates1?.y);
    }
    if (b.x < a.x) {
      return new Vec2(coordinates2?.x, coordinates2?.y);
    }
    if (b.x === a.x) {
      if (b.y > a.y) {
        return new Vec2(coordinates1?.x, coordinates1?.y);
      }
      if (b.y < a.y) {
        return new Vec2(coordinates2?.x, coordinates2?.y);
      }
      if (b.y === a.y) {
        return new Vec2(a.x, a.y);
      }
    }
  }
  return new Vec2(a.x, a.y);
}

export default ReRxnArrow;
