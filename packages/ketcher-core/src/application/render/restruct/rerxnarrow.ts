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
  type BondAttachment,
  type ElectronDestination,
  type LonePairAttachment,
  type RadicalAttachment,
  RxnArrowMode,
  RxnArrow,
} from 'domain/entities/rxnArrow';
import { Vec2 } from 'domain/entities/vec2';

import { LayerMap } from './generalEnumTypes';
import Raphael from '../raphael-ext';
import ReObject from './reobject';
import type ReStruct from './restruct';
import type { ArrowItem } from '../render.types';
import type { Render } from '../raphaelRender';
import { Scale } from 'domain/helpers';
import draw from '../draw';
import util from '../util';
import { toFixed } from 'utilities';
import {
  getLonePairModelPositions,
  getRadicalModelPositions,
} from './lonePairUtils';
import { RenderMechanismMetrics } from '../mechanism/renderMetrics';
import { routeArrow } from '../mechanism/route';
import type {
  ElectronSource,
  MechanismStruct,
  Route,
} from '../mechanism/types';

type Arrow = {
  pos: Array<Vec2>;
  mode: RxnArrowMode;
  height?: number;
  height2?: number;
  along1?: number;
  along2?: number;
  lpAttach?: LonePairAttachment;
  raAttach?: RadicalAttachment;
  bdAttach?: BondAttachment;
  destAttach?: ElectronDestination;
  autoRoute?: boolean;
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

/**
 * Everything about how the drawing is displayed that can move an arrow.
 *
 * Lone pairs and hydrogens change which directions are free; font size changes
 * how much room a label takes and so how far back the head must stop.
 */
function routingSettingsKey(options: {
  showLonePairs?: boolean;
  showHydrogenLabels?: unknown;
  fontszInPx?: number;
  microModeScale?: number;
}): string {
  return [
    options.showLonePairs ? 1 : 0,
    String(options.showHydrogenLabels ?? ''),
    options.fontszInPx ?? 0,
    options.microModeScale ?? 0,
  ].join('|');
}

class ReRxnArrow extends ReObject {
  item: Arrow;
  isResizing = false;

  /**
   * Last computed auto-route, held on the render object rather than the model.
   *
   * Routing is far too expensive to redo on every frame, but it must redo when
   * the structure around the arrow changes. Caching here keeps the model clean:
   * `height`/`height2` on the entity stay whatever the user or the last commit
   * put there, and nothing mutates the document during a repaint.
   *
   * `ReStruct.markAtom`/`markBond` clear this whenever an anchored atom or bond
   * is invalidated.
   */
  private routeCache: Route | null = null;

  /**
   * The display settings the cached route was computed against.
   *
   * Routing follows what is actually drawn, so turning lone pairs or hydrogens
   * on changes where an arrow may land. Those settings are not part of the
   * structure and so trigger none of the `markAtom`/`markBond` invalidation —
   * without this the arrows kept their old shapes and the drawing quietly
   * stopped being self-consistent.
   */
  private routeCacheSettings = '';

  constructor(/* chem.RxnArrow */ arrow: Arrow) {
    super('rxnArrow');
    this.item = arrow;
  }

  invalidateRoute(): void {
    this.routeCache = null;
  }

  /**
   * The arrow's geometry as it is actually drawn.
   *
   * An auto-routed arrow is drawn from its freshly computed route, but its
   * stored `pos` still holds whatever was committed when it was created. Those
   * two drift apart as soon as anything nearby moves, and everything that is
   * not the drawing itself — selection handles, the hover outline, hit-testing
   * — used to read the stored values. That is why the handles appeared beside
   * the arrow rather than on it, and why dragging the tip "fixed" the arrow: it
   * overwrote the stored position and turned auto-routing off, so the two
   * finally agreed.
   *
   * Everything now reads geometry from here.
   */
  drawnGeometry(): {
    pos: [Vec2, Vec2];
    height: number;
    height2?: number;
    along1?: number;
    along2?: number;
    /** Interior turn points, ordered from the tail. */
    leads?: Array<{
      at: Vec2;
      h1: number;
      h2: number;
      along1: number;
      along2: number;
    }>;
  } {
    const item = this.item;
    const route = this.routeCache;

    if (route) {
      return {
        pos: [new Vec2(route.p0), new Vec2(route.p1)],
        height: route.h1,
        height2: route.h2,
        along1: route.along1,
        along2: route.along2,
        leads: route.leads?.map((turnPoint) => ({
          ...turnPoint,
          at: new Vec2(turnPoint.at),
        })),
      };
    }

    return {
      pos: [new Vec2(item.pos[0]), new Vec2(item.pos[1])],
      height: item.height ?? 0,
      height2: item.height2,
      along1: item.along1,
      along2: item.along2,
    };
  }

  /** The semantic electron source, reassembled from whichever anchor is set. */
  private electronSource(): ElectronSource | null {
    const item = this.item;
    if (item.lpAttach) {
      return {
        kind: 'lone-pair',
        atomId: item.lpAttach.atomId,
        pairIdx: item.lpAttach.pairIdx,
      };
    }
    if (item.raAttach) {
      return {
        kind: 'radical',
        atomId: item.raAttach.atomId,
        radicalIdx: item.raAttach.radicalIdx,
      };
    }
    if (item.bdAttach) {
      return {
        kind: 'bond',
        bondId: item.bdAttach.bondId,
        side: item.bdAttach.side,
        component: item.bdAttach.component,
      };
    }
    return null;
  }

  /**
   * Re-route if the structure moved under us.
   *
   * Skipped entirely while the arrow is being resized: `RxnArrowResize`
   * identifies which handle is being dragged by comparing the drag anchor
   * against reference points derived from the current curvature, so changing
   * that curvature mid-drag would make the handle unrecognisable.
   */
  private resolveRoute(render: Render): Route | null {
    const item = this.item;
    if (!RxnArrow.isMechanism(item)) return null;
    if (item.autoRoute === false || this.isResizing) return null;
    if (!item.destAttach) return null;

    const settings = routingSettingsKey(render.options);
    if (this.routeCache && settings === this.routeCacheSettings) {
      return this.routeCache;
    }
    this.routeCacheSettings = settings;

    const source = this.electronSource();
    if (!source) return null;

    this.routeCache = routeArrow(
      { source, destination: item.destAttach, excludeArrow: item },
      render.ctab.molecule as unknown as MechanismStruct,
      new RenderMechanismMetrics(render),
      render.options,
    );

    return this.routeCache;
  }

  static isSelectable(): boolean {
    return true;
  }

  calcDistance(p: Vec2, s: any): MinDistanceWithReferencePoint {
    const point: Vec2 = new Vec2(p.x, p.y);
    const distRef: MinDistanceWithReferencePoint =
      this.getReferencePointDistance(p);
    const item = this.item;
    const pos = this.drawnGeometry().pos;

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
    if (RxnArrow.isMechanism(this.item)) {
      ret.attr(draw.mechanismHighlightStyle(render.options));
    }
    render.ctab.addReObjectPath(LayerMap.hovering, this.visel, ret);
    return ret;
  }

  getReferencePoints(): Array<Vec2> {
    const refPoints: Array<Vec2> = [];
    const item = this.item;
    const drawn = this.drawnGeometry();
    const [a, b] = drawn.pos;

    refPoints.push(new Vec2(a.x, a.y));
    refPoints.push(new Vec2(b.x, b.y));

    if (RxnArrow.isElliptical(item)) {
      if (drawn.leads?.length) {
        // An arrow that turns at waypoints: a handle in the middle of every
        // segment, plus each turn itself. Placing them along the chord instead
        // scattered them across empty canvas, nowhere near the curve they are
        // meant to grab.
        let from = a;
        for (const turnPoint of drawn.leads) {
          const { mid } = computeCubicRefPoints(
            from,
            turnPoint.at,
            turnPoint.h1,
            turnPoint.h2,
          );
          refPoints.push(mid);
          refPoints.push(new Vec2(turnPoint.at));
          from = turnPoint.at;
        }
        const { mid: last } = computeCubicRefPoints(
          from,
          b,
          drawn.height,
          drawn.height2 ?? drawn.height,
        );
        refPoints.push(last);
      } else if (drawn.height2 !== undefined) {
        // Cubic mode: 5 handles — [pos0, pos1, cp1, mid, cp2]
        const { cp1, mid, cp2 } = computeCubicRefPoints(
          a,
          b,
          drawn.height,
          drawn.height2,
        );
        refPoints.push(cp1);
        refPoints.push(mid);
        refPoints.push(cp2);
      } else {
        // Quadratic mode: 3 handles — [pos0, pos1, mid]
        refPoints.push(findMiddlePoint(drawn.height, a, b));
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

    const plate = render.paper
      .path(this.generatePath(render, options, 'selection'))
      .attr(styles.selectionStyle);
    if (RxnArrow.isMechanism(this.item)) {
      plate.attr(draw.mechanismHighlightStyle(options));
    }

    selectionSet.push(plate);
    return selectionSet;
  }

  generatePath(render: Render, options, type) {
    let path;
    const item = this.item;
    let height =
      RxnArrow.isElliptical(item) && item.height
        ? item.height * options.microModeScale
        : 0;
    let height2 =
      RxnArrow.isElliptical(item) && item.height2 !== undefined
        ? item.height2 * options.microModeScale
        : undefined;
    // Chord-relative, so unlike the heights these are not scaled to canvas.
    let along1 = item.along1;
    let along2 = item.along2;
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

    // An auto-routed arrow recomputes both endpoints and the curve together:
    // the head anchor depends on which free sector the route arrives through,
    // so resolving the destination without also re-routing would point the
    // arrowhead in the wrong direction.
    const route = this.resolveRoute(render);
    let leads: ArrowItem['leads'];
    if (route) {
      pos[0] = Scale.modelToCanvas(route.p0, options);
      pos[1] = Scale.modelToCanvas(route.p1, options);
      height = route.h1 * options.microModeScale;
      height2 = route.h2 * options.microModeScale;
      along1 = route.along1;
      along2 = route.along2;

      if (route.leads?.length) {
        leads = route.leads.map((turnPoint) => ({
          at: Scale.modelToCanvas(turnPoint.at, options),
          height: turnPoint.h1 * options.microModeScale,
          height2: turnPoint.h2 * options.microModeScale,
          along1: turnPoint.along1,
          along2: turnPoint.along2,
        }));
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
        // Mechanism arrows get an outline that follows the curve; a rectangle
        // spanning the chord would cover half the drawing and give no clue
        // where the arrow itself runs.
        path = RxnArrow.isMechanism(item)
          ? draw.arrowMechanismHighlight(
              render.paper,
              { ...item, pos, height, height2, along1, along2, leads },
              length,
              angle,
            )
          : draw.rectangleArrowHighlightAndSelection(
              render.paper,
              { pos, height },
              length,
              angle,
            );
        break;
      case 'arrow':
        path = draw.arrow(
          render.paper,
          { ...item, pos, height, height2, along1, along2, leads },
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
