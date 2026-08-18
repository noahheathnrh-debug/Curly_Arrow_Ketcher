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

import type { RaphaelPaper, Element } from 'raphael';
import type { HalfBond } from 'domain/entities/halfBond';
import {
  DEFAULT_ALONG_1,
  DEFAULT_ALONG_2,
  RxnArrowMode,
} from 'domain/entities/rxnArrow';
import { Vec2 } from 'domain/entities/vec2';

import { getOptionsWithConvertedUnits } from './options';
import Raphael from './raphael-ext';
import svgPath from 'svgpath';
import util from './util';
import type { ArrowItem, RelativeBox, RenderOptions } from './render.types';
import { toFixed } from 'utilities';
import { PathBuilder } from './pathBuilder';
// Imported from the leaf modules rather than the mechanism barrel: the barrel
// pulls in the router, which would make this a cycle.
import {
  cubicControlPoints,
  headChordDirection,
  parameterAtDistanceFromEnd,
  splitCubic,
} from './mechanism/geometry';
import {
  MECH_ARROW_COLOR,
  MECH_HEAD_HALF_WIDTH,
  MECH_HEAD_LENGTH,
  MECH_HEAD_NOTCH,
  MECH_STROKE_SCALE,
} from './mechanism/constants';

export const ARROW_HEAD_LENGHT = 0.25; // 10
export const ARROW_HEAD_WIDTH = 0.125; // 5
export const ARROW_HEAD_ATTR = 0.1; // 4
export const ARROW_OFFSET = 0.1; // 4
export const ARROW_DASH_INTERVAL = 0.0875; // 3.5
export const ARROW_FAIL_SIGN_WIDTH = 0.2; // 8
export const ARROW_UNBALANCED_OFFSET = 0.2; // 8 (used to be 15)

export function getArrowHeadDimensions(options: RenderOptions) {
  const { microModeScale } = getOptionsWithConvertedUnits(options);

  return {
    arrowHeadLength: ARROW_HEAD_LENGHT * microModeScale,
    arrowHeadWidth: ARROW_HEAD_WIDTH * microModeScale,
    arrowHeadAttr: ARROW_HEAD_ATTR * microModeScale,
    arrowOffset: ARROW_OFFSET * microModeScale,
  };
}

/**
 * Head geometry and stroke for mechanism arrows.
 *
 * Separate from {@link getArrowHeadDimensions} because these arrows sit inside
 * a structure rather than between two of them: a head sized for a reaction
 * arrow completely covers the atom it points at. The constants come from the
 * mechanism module rather than being defined here, because the router scores
 * the head polygon against obstacles and the two must describe the same shape.
 */
export function getMechanismArrowDimensions(options: RenderOptions) {
  const { microModeScale } = getOptionsWithConvertedUnits(options);
  const bondStroke =
    Number(options.lineattr['stroke-width']) || microModeScale / 20;

  return {
    arrowHeadLength: MECH_HEAD_LENGTH * microModeScale,
    arrowHeadWidth: MECH_HEAD_HALF_WIDTH * microModeScale,
    arrowHeadAttr: MECH_HEAD_NOTCH * microModeScale,
    strokeWidth:
      bondStroke * (options.mechanismArrowWidthScale ?? MECH_STROKE_SCALE),
    color: options.mechanismArrowColor ?? MECH_ARROW_COLOR,
  };
}

function getUnbalancedArrowHeadOffset(options: RenderOptions) {
  const { microModeScale } = getOptionsWithConvertedUnits(options);

  return ARROW_UNBALANCED_OFFSET * microModeScale;
}

function rectangle(paper: RaphaelPaper, points: [Vec2, Vec2]) {
  return paper.rect(
    toFixed(Math.min(points[0].x, points[1].x)),
    toFixed(Math.min(points[0].y, points[1].y)),
    toFixed(Math.abs(points[1].x - points[0].x)),
    toFixed(Math.abs(points[1].y - points[0].y)),
  );
}

function rectangleArrowHighlightAndSelection(
  _paper: RaphaelPaper,
  { pos: [start], height }: ArrowItem,
  length: number,
  angle: number,
) {
  const endX = start.x + length;
  const [wOffset, hOffset] = [5, height || 8];

  const path =
    `M${toFixed(start.x - wOffset)},${toFixed(start.y)}` +
    `L${toFixed(start.x - wOffset)},${toFixed(start.y - hOffset)}` +
    `L${toFixed(endX + wOffset)},${toFixed(start.y - hOffset)}` +
    `L${toFixed(endX + wOffset)},${toFixed(
      start.y + (!height ? hOffset : 0),
    )}` +
    `L${toFixed(start.x - wOffset)},${toFixed(
      start.y + (!height ? hOffset : 0),
    )}Z`;

  return svgPath(path).rotate(angle, start.x, start.y).toString();
}

function ellipse(paper: RaphaelPaper, points: [Vec2, Vec2]) {
  const rad = Vec2.diff(points[1], points[0]);
  const rx = rad.x / 2;
  const ry = rad.y / 2;
  return paper.ellipse(
    points[0].x + rx,
    points[0].y + ry,
    Math.abs(rx),
    Math.abs(ry),
  );
}

function polyline(paper: RaphaelPaper, points: Vec2[]) {
  const path = ['M', points[0].x, points[0].y];
  for (const point of points.slice(1)) {
    path.push('L', point.x, point.y);
  }
  return paper.path(path);
}

function line(paper: RaphaelPaper, points: [Vec2, Vec2]) {
  const path = ['M', points[0].x, points[0].y];
  path.push('L', points[1].x, points[1].y);
  return paper.path(path);
}

function arrow(
  paper: RaphaelPaper,
  item: ArrowItem,
  length: number,
  angle: number,
  options: RenderOptions,
  isResizing: boolean,
) {
  const shouldApplySnappingStyle =
    isResizing &&
    ['0', '-0', '90', '-90', '180', '-180'].includes(angle.toFixed());

  switch (item.mode) {
    case RxnArrowMode.OpenAngle: {
      return arrowOpenAngle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.FilledTriangle: {
      return arrowFilledTriangle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.FilledBow: {
      return arrowFilledBow(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.DashedOpenAngle: {
      return arrowDashedOpenAngle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.Failed: {
      return arrowFailed(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.Retrosynthetic: {
      return arrowRetrosynthetic(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.BothEndsFilledTriangle: {
      return arrowBothEndsFilledTriangle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.EquilibriumFilledHalfBow: {
      return arrowEquilibriumFilledHalfBow(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.EquilibriumFilledTriangle: {
      return arrowEquilibriumFilledTriangle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.EquilibriumOpenAngle: {
      return arrowEquilibriumOpenAngle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.UnbalancedEquilibriumFilledHalfBow: {
      return arrowUnbalancedEquilibriumFilledHalfBow(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.UnbalancedEquilibriumOpenHalfAngle: {
      return arrowUnbalancedEquilibriumOpenHalfAngle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.UnbalancedEquilibriumLargeFilledHalfBow: {
      return arrowUnbalancedEquilibriumLargeFilledHalfBow(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.UnbalancedEquilibriumFilledHalfTriangle: {
      return arrowUnbalancedEquilibriumFilledHalfTriangle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.EllipticalArcFilledBow: {
      return arrowEllipticalArcFilledBow(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.EllipticalArcFilledTriangle: {
      return arrowEllipticalArcFilledTriangle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.EllipticalArcOpenAngle: {
      return arrowEllipticalArcOpenAngle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.EllipticalArcOpenHalfAngle: {
      return arrowEllipticalArcOpenHalfAngle(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.CurlyMechanism: {
      return arrowCurlyMechanism(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
    case RxnArrowMode.FishhookMechanism: {
      return arrowFishhookMechanism(
        paper,
        item,
        length,
        angle,
        options,
        shouldApplySnappingStyle,
      );
    }
  }
}

function arrowEllipticalArcFilledBow(
  paper: RaphaelPaper,
  { pos: [start], height }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const direction = height >= 0 ? 1 : -1;
  const { arrowHeadLength, arrowHeadWidth, arrowHeadAttr } =
    getArrowHeadDimensions(options);

  const length = direction * arrowHeadLength;
  const width = direction * arrowHeadWidth;
  const attr = direction * arrowHeadAttr;

  const endX = start.x + arrowLength;
  const path =
    `M${toFixed(start.x)},${toFixed(start.y)}` +
    `A${arrowLength / 2},${height},${0},${0},${direction > 0 ? 1 : 0},${toFixed(
      endX,
    )},${toFixed(start.y)}` +
    `L${toFixed(endX - width)},${toFixed(start.y - length)}` +
    `l${toFixed(width)},${toFixed(attr)}` +
    `l${toFixed(width)},${toFixed(-attr)}` +
    `l${toFixed(-width)},${length}`;

  const transformedPath = svgPath(path)
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    ...(shouldApplySnappingStyle && {
      stroke: options.arrowSnappingStyle.stroke,
    }),
  });
}

function arrowEllipticalArcFilledTriangle(
  paper: RaphaelPaper,
  { pos: [start], height }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth } = getArrowHeadDimensions(options);

  const direction = height >= 0 ? 1 : -1;

  const triangleLength = direction * arrowHeadLength;
  const triangleWidth = direction * arrowHeadWidth;

  const endX = start.x + arrowLength;

  const path =
    `M${toFixed(start.x)},${toFixed(start.y)}` +
    `A${arrowLength / 2},${height},${0},${0},${direction > 0 ? 1 : 0},${toFixed(
      endX,
    )},${toFixed(start.y)}` +
    `L${toFixed(endX - triangleWidth)},${toFixed(start.y - triangleLength)}` +
    `l${toFixed(triangleLength)},${toFixed(0)}` +
    `l${toFixed(-triangleWidth)},${toFixed(triangleLength)}`;

  const transformedPath = svgPath(path)
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    ...(shouldApplySnappingStyle && {
      stroke: options.arrowSnappingStyle.stroke,
    }),
  });
}

function arrowEllipticalArcOpenAngle(
  paper: RaphaelPaper,
  { pos: [start], height }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const direction = height >= 0 ? 1 : -1;

  const { arrowHeadLength, arrowHeadWidth } = getArrowHeadDimensions(options);

  const width = direction * arrowHeadWidth;
  const length = direction * arrowHeadLength;

  const endX = start.x + arrowLength;

  const path =
    `M${toFixed(start.x)},${toFixed(start.y)}` +
    `A${arrowLength / 2},${height},${0},${0},${direction > 0 ? 1 : 0},${toFixed(
      endX,
    )},${toFixed(start.y)}` +
    `L${toFixed(endX - width)},${toFixed(start.y - length)}` +
    `M${toFixed(endX)},${toFixed(start.y)}` +
    `L${toFixed(endX + width)}, ${toFixed(start.y - length)}`;

  const transformedPath = svgPath(path)
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    ...(shouldApplySnappingStyle && {
      stroke: options.arrowSnappingStyle.stroke,
    }),
  });
}

function arrowEllipticalArcOpenHalfAngle(
  paper: RaphaelPaper,
  { pos: [start], height }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const direction = height >= 0 ? 1 : -1;

  const { arrowHeadLength, arrowHeadWidth } = getArrowHeadDimensions(options);

  const width = direction * arrowHeadWidth;
  const length = direction * arrowHeadLength;
  const endX = start.x + arrowLength;

  const path =
    `M${toFixed(start.x)},${toFixed(start.y)}` +
    `A${arrowLength / 2},${height},${0},${0},${
      direction > 0 ? 1 : 0
    }, ${toFixed(endX)},${toFixed(start.y)}` +
    `L${toFixed(endX + width)}, ${toFixed(start.y - length)}`;

  const transformedPath = svgPath(path)
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    ...(shouldApplySnappingStyle && {
      stroke: options.arrowSnappingStyle.stroke,
    }),
  });
}

function arrowOpenAngle(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadAttr, arrowHeadLength } = getArrowHeadDimensions(options);
  const pathBuilder = new PathBuilder().addOpenArrowPathParts(
    start,
    arrowLength,
    arrowHeadLength,
    arrowHeadAttr,
  );
  const transformedPath = svgPath(pathBuilder.build())
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    ...(shouldApplySnappingStyle && {
      stroke: options.arrowSnappingStyle.stroke,
    }),
  });
}

function arrowFilledTriangle(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth } = getArrowHeadDimensions(options);

  const endX = start.x + arrowLength;

  const path =
    `M${toFixed(start.x)},${toFixed(start.y)}` +
    `L${toFixed(endX)},${toFixed(start.y)}` +
    `L${toFixed(endX - arrowHeadLength)},${toFixed(start.y + arrowHeadWidth)}` +
    `L${toFixed(endX - arrowHeadLength)},${toFixed(start.y - arrowHeadWidth)}` +
    `L${toFixed(endX)},${toFixed(start.y)}Z`;

  const transformedPath = svgPath(path)
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function arrowFilledBow(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth, arrowHeadAttr } =
    getArrowHeadDimensions(options);

  const endX = start.x + arrowLength;

  const path =
    `M${toFixed(start.x)},${toFixed(start.y)}` +
    `L${toFixed(endX)},${toFixed(start.y)}` +
    `L${toFixed(endX - arrowHeadLength)},${toFixed(start.y + arrowHeadWidth)}` +
    `L${toFixed(endX - arrowHeadLength + arrowHeadAttr)},${toFixed(start.y)}` +
    `L${toFixed(endX - arrowHeadLength)},${toFixed(start.y - arrowHeadWidth)}` +
    `L${toFixed(endX)},${toFixed(start.y)}Z`;

  const transformedPath = svgPath(path)
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function arrowDashedOpenAngle(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth } = getArrowHeadDimensions(options);
  const { microModeScale } = getOptionsWithConvertedUnits(options);

  const dashInterval = ARROW_DASH_INTERVAL * microModeScale;

  const path: string[] = [];

  const endX = start.x + arrowLength;

  // Dashed arrow
  for (let i = 0; i < arrowLength / dashInterval; i++) {
    if (i % 2) {
      path.push(`L${toFixed(start.x + i * dashInterval)},${toFixed(start.y)}`);
    } else {
      path.push(`M${toFixed(start.x + i * dashInterval)},${toFixed(start.y)}`);
    }
  }

  // Arrowhead
  path.push(
    `M${toFixed(endX)},${toFixed(start.y)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y + arrowHeadWidth,
      )}` +
      `M${toFixed(endX)},${toFixed(start.y)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth,
      )}`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function arrowFailed(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth, arrowHeadAttr } =
    getArrowHeadDimensions(options);
  const { microModeScale } = getOptionsWithConvertedUnits(options);

  const failSignWidth = ARROW_FAIL_SIGN_WIDTH * microModeScale;

  const endX = start.x + arrowLength;

  const arrowCenter = endX - (endX - start.x) / 2;

  const path: string[] = [];

  // Arrow with arrowhead
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y)}` +
      `L${toFixed(endX)},${toFixed(start.y)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y + arrowHeadWidth,
      )}` +
      `L${toFixed(endX - arrowHeadLength + arrowHeadAttr)},${toFixed(
        start.y,
      )}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth,
      )}` +
      `L${toFixed(endX)},${toFixed(start.y)}Z`,
  );

  // Failed sign line 1
  path.push(
    `M${toFixed(arrowCenter + failSignWidth)},${toFixed(
      start.y + failSignWidth,
    )}` +
      `L${toFixed(arrowCenter - failSignWidth)},${toFixed(
        start.y - failSignWidth,
      )}`,
  );

  // Failed sign line 2
  path.push(
    `M${toFixed(arrowCenter + failSignWidth)},${toFixed(
      start.y - failSignWidth,
    )}` +
      `L${toFixed(arrowCenter - failSignWidth)},${toFixed(
        start.y + failSignWidth,
      )}`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function arrowRetrosynthetic(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth, arrowOffset } =
    getArrowHeadDimensions(options);

  const endX = start.x + arrowLength;

  const path: string[] = [];

  // First arrow and arrowhead
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth - arrowOffset,
      )}` +
      `L${toFixed(endX + arrowHeadLength)},${toFixed(start.y)}`,
  );

  // Second arrow and arrowhead
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y + arrowHeadWidth + arrowOffset,
      )}` +
      `L${toFixed(endX + arrowHeadLength)},${toFixed(start.y)}`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    ...(shouldApplySnappingStyle && {
      stroke: options.arrowSnappingStyle.stroke,
    }),
  });
}

function arrowBothEndsFilledTriangle(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth } = getArrowHeadDimensions(options);

  const endX = start.x + arrowLength;

  const path =
    `M${toFixed(start.x)},${toFixed(start.y)}` +
    `L${toFixed(endX)},${toFixed(start.y)}` +
    `L${toFixed(endX - arrowHeadLength)},${toFixed(start.y + arrowHeadWidth)}` +
    `L${toFixed(endX - arrowHeadLength)},${toFixed(start.y - arrowHeadWidth)}` +
    `L${toFixed(endX)},${toFixed(start.y)}` +
    `M${toFixed(start.x)},${toFixed(start.y)}` +
    `L${toFixed(start.x + arrowHeadLength)},${toFixed(
      start.y - arrowHeadWidth,
    )}` +
    `L${toFixed(start.x + arrowHeadLength)},${toFixed(
      start.y + arrowHeadWidth,
    )}` +
    `L${toFixed(start.x)},${toFixed(start.y)}`;

  const transformedPath = svgPath(path)
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function arrowEquilibriumFilledHalfBow(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadAttr, arrowOffset, arrowHeadWidth } =
    getArrowHeadDimensions(options);

  const endX = start.x + arrowLength;

  const path: string[] = [];

  // top arrow
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth - arrowOffset,
      )}` +
      `L${toFixed(endX - arrowHeadLength + arrowHeadAttr)},${toFixed(
        start.y - arrowOffset,
      )}Z`,
  );

  // bottom arrow
  path.push(
    `M${toFixed(endX)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x + arrowHeadLength)},${toFixed(
        start.y + arrowHeadWidth + arrowOffset,
      )}` +
      `L${toFixed(start.x + arrowHeadLength - arrowHeadAttr)},${
        start.y + arrowOffset
      }Z`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function arrowEquilibriumFilledTriangle(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowOffset, arrowHeadWidth } =
    getArrowHeadDimensions(options);

  const endX = start.x + arrowLength;

  const path: string[] = [];

  // First arrow
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y + arrowHeadWidth - arrowOffset,
      )}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth - arrowOffset,
      )}` +
      `L${toFixed(endX)},${toFixed(start.y - arrowOffset)}Z`,
  );

  // Second arrow
  path.push(
    `M${toFixed(endX)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x + arrowHeadLength)},${toFixed(
        start.y + arrowHeadWidth + arrowOffset,
      )}` +
      `L${toFixed(start.x + arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth + arrowOffset,
      )}` +
      `L${toFixed(start.x)},${toFixed(start.y + arrowOffset)}Z`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function arrowEquilibriumOpenAngle(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth, arrowOffset } =
    getArrowHeadDimensions(options);

  const endX = start.x + arrowLength;

  const path: string[] = [];

  // First arrow
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth - arrowOffset,
      )}`,
  );

  // Second arrow
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y + arrowOffset)}` +
      `M${toFixed(start.x)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x + arrowHeadLength)},${toFixed(
        start.y + arrowOffset + arrowHeadWidth,
      )}`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    ...(shouldApplySnappingStyle && {
      stroke: options.arrowSnappingStyle.stroke,
    }),
  });
}

function arrowUnbalancedEquilibriumFilledHalfBow(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth, arrowOffset, arrowHeadAttr } =
    getArrowHeadDimensions(options);
  const unbalanceVal = getUnbalancedArrowHeadOffset(options);

  const endX = start.x + arrowLength;

  const path: string[] = [];

  // First arrow
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth - arrowOffset,
      )}` +
      `L${toFixed(endX - arrowHeadLength + arrowHeadAttr)},${toFixed(
        start.y - arrowOffset,
      )}Z`,
  );

  // Second (Unbalanced) arrow
  path.push(
    `M${toFixed(endX - unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x + unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x + unbalanceVal + arrowHeadLength)},${toFixed(
        start.y + arrowHeadWidth + arrowOffset,
      )}` +
      `L${toFixed(start.x + unbalanceVal + arrowHeadLength - arrowHeadAttr)},${
        start.y + arrowOffset
      }Z`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function arrowUnbalancedEquilibriumOpenHalfAngle(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth, arrowOffset } =
    getArrowHeadDimensions(options);
  const unbalanceVal = getUnbalancedArrowHeadOffset(options);

  const endX = start.x + arrowLength;

  const path: string[] = [];

  // First arrow
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth - arrowOffset,
      )}`,
  );

  // Second (Unbalanced) arrow
  path.push(
    `M${toFixed(start.x + unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(endX - unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `M${toFixed(start.x + unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x + arrowHeadLength + unbalanceVal)},${toFixed(
        start.y + arrowOffset + arrowHeadWidth,
      )}`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    ...(shouldApplySnappingStyle && {
      stroke: options.arrowSnappingStyle.stroke,
    }),
  });
}

function arrowUnbalancedEquilibriumLargeFilledHalfBow(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const {
    arrowHeadLength,
    arrowHeadWidth: arrowHeadWidthNormal,
    arrowOffset,
    arrowHeadAttr,
  } = getArrowHeadDimensions(options);
  const unbalanceVal = getUnbalancedArrowHeadOffset(options);

  // Multiplying by 1.5 because it's large variant
  const arrowHeadWidth = arrowHeadWidthNormal * 1.5;

  const endX = start.x + arrowLength;

  const path: string[] = [];

  // First arrow
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth - arrowOffset,
      )}` +
      `L${toFixed(endX - arrowHeadLength + arrowHeadAttr)},${toFixed(
        start.y - arrowOffset,
      )}Z`,
  );

  // Second (Unbalanced) arrow
  path.push(
    `M${toFixed(start.x + unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(endX - unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `M${toFixed(start.x + unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x + arrowHeadLength + unbalanceVal)},${toFixed(
        start.y + arrowHeadWidth + arrowOffset,
      )}` +
      `L${toFixed(start.x + arrowHeadLength - arrowHeadAttr + unbalanceVal)},${
        start.y + arrowOffset
      }Z`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function arrowUnbalancedEquilibriumFilledHalfTriangle(
  paper: RaphaelPaper,
  { pos: [start] }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth, arrowOffset } =
    getArrowHeadDimensions(options);
  const unbalanceVal = getUnbalancedArrowHeadOffset(options);

  const endX = start.x + arrowLength;

  const path: string[] = [];

  // First arrow
  path.push(
    `M${toFixed(start.x)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX)},${toFixed(start.y - arrowOffset)}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(
        start.y - arrowHeadWidth - arrowOffset,
      )}` +
      `L${toFixed(endX - arrowHeadLength)},${toFixed(start.y - arrowOffset)}Z`,
  );

  // Second (Unbalanced) arrow
  path.push(
    `M${toFixed(start.x + unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(endX - unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `M${toFixed(start.x + unbalanceVal)},${toFixed(start.y + arrowOffset)}` +
      `L${toFixed(start.x + arrowHeadLength + unbalanceVal)},${toFixed(
        start.y + arrowHeadWidth + arrowOffset,
      )}` +
      `L${toFixed(start.x + arrowHeadLength + unbalanceVal)},${
        start.y + arrowOffset
      }Z`,
  );

  const transformedPath = svgPath(path.join(''))
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  return paper.path(transformedPath).attr({
    ...options.lineattr,
    fill: '#000',
    ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
  });
}

function plus(paper: RaphaelPaper, point: Vec2, options: RenderOptions) {
  const s = options.microModeScale / 5;
  return paper
    .path(
      'M{0},{4}L{0},{5}M{2},{1}L{3},{1}',
      toFixed(point.x),
      toFixed(point.y),
      toFixed(point.x - s),
      toFixed(point.x + s),
      toFixed(point.y - s),
      toFixed(point.y + s),
    )
    .attr(options.lineattr);
}

function bondSingle(
  paper: RaphaelPaper,
  halfBond1: HalfBond,
  halfBond2: HalfBond,
  options: RenderOptions,
  isSnapping: boolean,
  color = '#000',
) {
  const a = halfBond1.p;
  const b = halfBond2.p;
  return paper
    .path(makeStroke(a, b))
    .attr(options.lineattr)
    .attr({
      fill: color,
      stroke: color,
    })
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondSingleUp(
  paper: RaphaelPaper,
  a: Vec2,
  b2: Vec2,
  b3: Vec2,
  options: RenderOptions,
  isSnapping: boolean,
  color = '#000',
) {
  // eslint-disable-line max-params
  return paper
    .path(
      'M{0},{1}L{2},{3}L{4},{5}Z',
      toFixed(a.x),
      toFixed(a.y),
      toFixed(b2.x),
      toFixed(b2.y),
      toFixed(b3.x),
      toFixed(b3.y),
    )
    .attr(options.lineattr)
    .attr({
      fill: color,
      stroke: color,
    })
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondSingleStereoBold(
  paper: RaphaelPaper,
  a1: Vec2,
  a2: Vec2,
  a3: Vec2,
  a4: Vec2,
  options: RenderOptions,
  isSnapping: boolean,
  color = '#000',
) {
  // eslint-disable-line max-params
  const bond = paper
    .path(
      'M{0},{1}L{2},{3}L{4},{5}L{6},{7}Z',
      toFixed(a1.x),
      toFixed(a1.y),
      toFixed(a2.x),
      toFixed(a2.y),
      toFixed(a3.x),
      toFixed(a3.y),
      toFixed(a4.x),
      toFixed(a4.y),
    )
    .attr(options.lineattr)
    .attr({
      stroke: color,
      fill: color,
    })
    .attr(isSnapping ? options.bondSnappingStyle : {});
  return bond;
}

function bondDoubleStereoBold(
  paper: RaphaelPaper,
  sgBondPath: Element,
  b1: Vec2,
  b2: Vec2,
  options: RenderOptions,
  isSnapping: boolean,
  color = '#000',
) {
  // eslint-disable-line max-params
  return paper.set([
    sgBondPath,
    paper
      .path(
        'M{0},{1}L{2},{3}',
        toFixed(b1.x),
        toFixed(b1.y),
        toFixed(b2.x),
        toFixed(b2.y),
      )
      .attr(options.lineattr)
      .attr({
        stroke: color,
        fill: color,
      })
      .attr(isSnapping ? options.bondSnappingStyle : {}),
  ]);
}

function bondSingleDown(
  paper: RaphaelPaper,
  halfBond1: HalfBond,
  d: Vec2,
  nlines: number,
  step: number,
  options: RenderOptions,
  isSnapping: boolean,
  color = '#000',
) {
  // eslint-disable-line max-params
  const a = halfBond1.p;
  const n = halfBond1.norm;
  const bsp = 0.7 * options.stereoBond;

  let path = '';
  let p;
  let q;
  let r;
  for (let i = 0; i < nlines; ++i) {
    r = a.addScaled(d, step * i);
    p = r.addScaled(n, (bsp * (i + 0.5)) / (nlines - 0.5));
    q = r.addScaled(n, (-bsp * (i + 0.5)) / (nlines - 0.5));
    path += makeStroke(p, q);
  }
  return paper
    .path(path)
    .attr(options.lineattr)
    .attr({
      fill: color,
      stroke: color,
    })
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondSingleEither(
  paper: RaphaelPaper,
  halfBond1: HalfBond,
  d: Vec2,
  nlines: number,
  step: number,
  options: RenderOptions,
  isSnapping: boolean,
  color = '#000',
) {
  // eslint-disable-line max-params
  const a = halfBond1.p;
  const n = halfBond1.norm;
  const bsp = 0.7 * options.stereoBond;

  let path = 'M' + toFixed(a.x) + ',' + toFixed(a.y);
  let r = a;
  for (let i = 0; i < nlines; ++i) {
    r = a
      .addScaled(d, step * (i + 0.5))
      .addScaled(n, ((i & 1 ? -1 : +1) * bsp * (i + 0.5)) / (nlines - 0.5));
    path += 'L' + toFixed(r.x) + ',' + toFixed(r.y);
  }
  return paper
    .path(path)
    .attr(options.lineattr)
    .attr({
      stroke: color,
    })
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondDouble(
  paper: RaphaelPaper,
  a1: Vec2,
  a2: Vec2,
  b1: Vec2,
  b2: Vec2,
  cisTrans: boolean,
  options: RenderOptions,
  isSnapping: boolean,
) {
  // eslint-disable-line max-params
  return paper
    .path(
      cisTrans
        ? 'M{0},{1}L{6},{7}M{4},{5}L{2},{3}'
        : 'M{0},{1}L{2},{3}M{4},{5}L{6},{7}',
      toFixed(a1.x),
      toFixed(a1.y),
      toFixed(b1.x),
      toFixed(b1.y),
      toFixed(a2.x),
      toFixed(a2.y),
      toFixed(b2.x),
      toFixed(b2.y),
    )
    .attr(options.lineattr)
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondSingleOrDouble(
  paper: RaphaelPaper,
  halfBond1: HalfBond,
  halfBond2: HalfBond,
  nSect: number,
  options: RenderOptions,
  isSnapping: boolean,
) {
  // eslint-disable-line max-statements, max-params
  const a = halfBond1.p;
  const b = halfBond2.p;
  const n = halfBond1.norm;
  const bsp = options.bondSpace / 2;

  let path = '';
  let pi;
  let pp = a;
  for (let i = 1; i <= nSect; ++i) {
    pi = Vec2.lc2(a, (nSect - i) / nSect, b, i / nSect);
    if (i & 1) {
      path += makeStroke(pp, pi);
    } else {
      path += makeStroke(pp.addScaled(n, bsp), pi.addScaled(n, bsp));
      path += makeStroke(pp.addScaled(n, -bsp), pi.addScaled(n, -bsp));
    }
    pp = pi;
  }
  return paper
    .path(path)
    .attr(options.lineattr)
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondTriple(
  paper: RaphaelPaper,
  halfBond1: HalfBond,
  halfBond2: HalfBond,
  options: RenderOptions,
  isSnapping: boolean,
  color = '#000',
) {
  const a = halfBond1.p;
  const b = halfBond2.p;
  const n = halfBond1.norm;
  const a2 = a.addScaled(n, options.bondSpace);
  const b2 = b.addScaled(n, options.bondSpace);
  const a3 = a.addScaled(n, -options.bondSpace);
  const b3 = b.addScaled(n, -options.bondSpace);
  return paper
    .path(makeStroke(a, b) + makeStroke(a2, b2) + makeStroke(a3, b3))
    .attr(options.lineattr)
    .attr({
      fill: color,
      stroke: color,
    })
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondAromatic(
  paper: RaphaelPaper,
  paths: string[],
  bondShift: number,
  options: RenderOptions,
  isSnapping: boolean,
) {
  const l1 = paper
    .path(paths[0])
    .attr(options.lineattr)
    .attr(isSnapping ? options.bondSnappingStyle : {});
  const l2 = paper
    .path(paths[1])
    .attr(options.lineattr)
    .attr(isSnapping ? options.bondSnappingStyle : {});
  if (bondShift !== undefined && bondShift !== null) {
    (bondShift > 0 ? l1 : l2).attr({ 'stroke-dasharray': '- ' });
  }

  return paper.set([l1, l2]);
}

function bondAny(
  paper: RaphaelPaper,
  halfBond1: HalfBond,
  halfBond2: HalfBond,
  options: RenderOptions,
  isSnapping: boolean,
) {
  const a = halfBond1.p;
  const b = halfBond2.p;
  return paper
    .path(makeStroke(a, b))
    .attr(options.lineattr)
    .attr({ 'stroke-dasharray': '- ' })
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondHydrogen(
  paper: RaphaelPaper,
  halfBond1: HalfBond,
  halfBond2: HalfBond,
  options: RenderOptions,
  isSnapping: boolean,
) {
  const a = halfBond1.p;
  const b = halfBond2.p;
  return paper
    .path(makeStroke(a, b))
    .attr(options.lineattr)
    .attr({
      'stroke-dasharray': '.',
      'stroke-linecap': 'square',
    })
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondOneElectron(
  paper: RaphaelPaper,
  halfBond1: HalfBond,
  halfBond2: HalfBond,
  options: RenderOptions,
  isSnapping: boolean,
) {
  const a = halfBond1.p;
  const b = halfBond2.p;
  return paper
    .path(makeStroke(a, b))
    .attr(options.lineattr)
    .attr({ 'stroke-dasharray': '--' })
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function bondDative(
  paper: RaphaelPaper,
  halfBond1: HalfBond,
  halfBond2: HalfBond,
  options: RenderOptions,
  isSnapping: boolean,
) {
  const a = halfBond1.p;
  const b = halfBond2.p;

  if (isNaN(a.x) || isNaN(a.y) || isNaN(b.x) || isNaN(b.y)) {
    return paper.path('');
  }

  const directionVec = Vec2.diff(b, a);
  // if bond is too short, draw a symbol instead
  if (directionVec.length() < 5) {
    const angleDegrees =
      Math.atan2(directionVec.y, directionVec.x) * (180 / Math.PI);
    return drawArrowSymbol(paper, b, options, angleDegrees);
  }

  // For normal-length bonds, draw with an arrow
  return paper
    .path(makeStroke(a, b))
    .attr(options.lineattr)
    .attr({ 'arrow-end': 'block-midium-long' })
    .attr(isSnapping ? options.bondSnappingStyle : {});
}

function drawArrowSymbol(
  paper: RaphaelPaper,
  point: Vec2,
  options: RenderOptions,
  angleDegrees: number,
) {
  const baseSize = options.microModeScale * 0.1;
  const arrowHalfWidth = baseSize / 1.32;
  const arrowHeight = baseSize * 2.5;

  const arrowBasePath = `M0,0 L${-arrowHeight},${-arrowHalfWidth} L${-arrowHeight},${arrowHalfWidth} Z`;

  const finalPath = svgPath(arrowBasePath)
    .rotate(angleDegrees, 0, 0)
    .translate(point.x, point.y)
    .toString();

  return paper.path(finalPath).attr({
    ...options.lineattr,
    'stroke-width': 0,
    fill: options.lineattr.stroke,
  });
}

function reactingCenter(
  paper: RaphaelPaper,
  points: Vec2[],
  options: RenderOptions,
) {
  let pathDesc = '';
  for (const [index, point] of points.entries()) {
    if (index % 2 === 0) {
      const nextPoint = points[index + 1];
      if (nextPoint) {
        pathDesc += makeStroke(point, nextPoint);
      }
    }
  }
  return paper.path(pathDesc).attr(options.lineattr);
}

function bondMark(
  paper: RaphaelPaper,
  point: Vec2,
  mark: string | null,
  options: RenderOptions,
) {
  const path = paper.text(point.x, point.y, mark).attr({
    font: options.font,
    'font-size': options.fontszsubInPx,
    fill: '#000',
  });
  const rbb = util.relBox(path.getBBox());
  recenterText(path, rbb);
  return path;
}

function radicalCap(paper: RaphaelPaper, point1: Vec2, options: RenderOptions) {
  const s = options.lineWidth * 0.9;
  const dw = s;
  const dh = 2 * s;
  return paper
    .path(
      'M{0},{1}L{2},{3}L{4},{5}',
      toFixed(point1.x - dw),
      toFixed(point1.y + dh),
      toFixed(point1.x),
      toFixed(point1.y),
      toFixed(point1.x + dw),
      toFixed(point1.y + dh),
    )
    .attr({
      stroke: '#000',
      'stroke-width': options.lineWidth * 0.7,
      'stroke-linecap': 'square',
      'stroke-linejoin': 'miter',
    });
}

function radicalBullet(
  paper: RaphaelPaper,
  point1: Vec2,
  options: RenderOptions,
) {
  return paper
    .circle(toFixed(point1.x), toFixed(point1.y), options.lineWidth)
    .attr({
      stroke: null,
      fill: '#000',
    });
}

function bracket(
  paper: RaphaelPaper,
  bracketAngleDirection: Vec2,
  bracketDirection: Vec2,
  bondCenter: Vec2,
  bracketWidth: number,
  bracketHeight: number,
  options: RenderOptions,
) {
  // eslint-disable-line max-params
  bracketWidth = bracketWidth || 0.25;
  bracketHeight = bracketHeight || 1.0;
  const halfBracketHeight = 0.5;
  const bracketPoint0 = bondCenter.addScaled(
    bracketDirection,
    -halfBracketHeight * bracketHeight,
  );
  const bracketPoint1 = bondCenter.addScaled(
    bracketDirection,
    halfBracketHeight * bracketHeight,
  );
  const bracketArc0 = bracketPoint0.addScaled(
    bracketAngleDirection,
    -bracketWidth,
  );
  const bracketArc1 = bracketPoint1.addScaled(
    bracketAngleDirection,
    -bracketWidth,
  );

  return paper
    .path(
      'M{0},{1}L{2},{3}L{4},{5}L{6},{7}',
      toFixed(bracketArc0.x),
      toFixed(bracketArc0.y),
      toFixed(bracketPoint0.x),
      toFixed(bracketPoint0.y),
      toFixed(bracketPoint1.x),
      toFixed(bracketPoint1.y),
      toFixed(bracketArc1.x),
      toFixed(bracketArc1.y),
    )
    .attr(options.sgroupBracketStyle);
}

function selectionRectangle(
  paper: RaphaelPaper,
  point1: Vec2,
  point2: Vec2,
  options: RenderOptions,
) {
  return paper
    .rect(
      toFixed(Math.min(point1.x, point2.x)),
      toFixed(Math.min(point1.y, point2.y)),
      toFixed(Math.abs(point2.x - point1.x)),
      toFixed(Math.abs(point2.y - point1.y)),
    )
    .attr(options.lassoStyle);
}

function selectionPolygon(
  paper: RaphaelPaper,
  r: Vec2[],
  options: RenderOptions,
) {
  const v = r[r.length - 1];
  let pstr = 'M' + toFixed(v.x) + ',' + toFixed(v.y);
  for (const point of r) {
    pstr += 'L' + toFixed(point.x) + ',' + toFixed(point.y);
  }
  return paper.path(pstr).attr(options.lassoStyle);
}

function selectionLine(
  paper: RaphaelPaper,
  point1: Vec2,
  point2: Vec2,
  options: RenderOptions,
) {
  return paper.path(makeStroke(point1, point2)).attr(options.lassoStyle);
}

function makeStroke(point1: Vec2, point2: Vec2) {
  return (
    'M' +
    toFixed(point1.x) +
    ',' +
    toFixed(point1.y) +
    'L' +
    toFixed(point2.x) +
    ',' +
    toFixed(point2.y) +
    '	'
  );
}

function dashedPath(point1: Vec2, point2: Vec2, dash: number[]) {
  let t0 = 0;
  const t1 = Vec2.dist(point1, point2);
  const d = Vec2.diff(point2, point1).normalized();
  let black = true;
  let path = '';
  let i = 0;

  while (t0 < t1) {
    const len = dash[i % dash.length];
    const t2 = t0 + Math.min(len, t1 - t0);
    if (black) {
      path +=
        'M ' +
        point1.addScaled(d, t0).coordStr() +
        ' L ' +
        point1.addScaled(d, t2).coordStr();
    }
    t0 += len;
    black = !black;
    i++;
  }
  return path;
}

function aromaticBondPaths(
  a2: Vec2,
  a3: Vec2,
  b2: Vec2,
  b3: Vec2,
  mask: number,
  dash: number[] | null,
) {
  // eslint-disable-line max-params
  const l1 = dash && mask & 1 ? dashedPath(a2, b2, dash) : makeStroke(a2, b2);
  const l2 = dash && mask & 2 ? dashedPath(a3, b3, dash) : makeStroke(a3, b3);

  return [l1, l2];
}

function recenterText(path: Element, relativeBox: RelativeBox) {
  // TODO: find a better way
  if (Raphael.vml) {
    const gap = relativeBox.height * 0.16;
    path.translateAbs(0, gap);
    relativeBox.y += gap;
  }
}

function rgroupAttachmentPoint(
  paper: RaphaelPaper,
  shiftedAtomPositionVector: Vec2,
  attachmentPointEnd: Vec2,
  directionVector: Vec2,
  options: RenderOptions,
) {
  const linePath = paper.path(
    'M{0},{1}L{2},{3}',
    toFixed(shiftedAtomPositionVector.x),
    toFixed(shiftedAtomPositionVector.y),
    toFixed(attachmentPointEnd.x),
    toFixed(attachmentPointEnd.y),
  );

  const curvePath = paper.path(
    getSvgCurveShapeAttachmentPoint(
      attachmentPointEnd,
      directionVector,
      options.microModeScale,
    ),
  );

  const resultShape = paper
    .set([curvePath, linePath])
    .attr(options.lineattr)
    .attr({ 'stroke-width': options.bondThicknessInPx });

  return resultShape;
}

function getSvgCurveShapeAttachmentPoint(
  centerPosition: Vec2,
  directionVector: Vec2,
  basicSize: number,
): string {
  // declared here https://github.com/epam/ketcher/issues/2165
  // this path has (0,0) in the position of attachment point atom
  const attachmentPointSvgPathString = `M13 1.5l-1.5 3.7c-0.3 0.8-1.5 0.8-1.9 0l-1.7-4.4c-0.3-0.8-1.5-0.8-1.9 0l-1.7 4.4c-0.3 0.8-1.5 0.8-1.8 0l-1.8-4.4c-0.3-0.8-1.5-0.8-1.9 0l-1.7 4.4c-0.3 0.8-1.5 0.8-1.9 0l-1.7-4.4c-0.3-0.8-1.5-0.8-1.9 0l-1.6 4.2c-0.3 0.9-1.6 0.8-1.9 0l-1.2-3.5`;
  const attachmentPointSvgPathSize = 39.8;

  const shapeScale = basicSize / attachmentPointSvgPathSize;
  const angleDegrees =
    (Math.atan2(directionVector.y, directionVector.x) * 180) / Math.PI - 90;

  return svgPath(attachmentPointSvgPathString)
    .rotate(angleDegrees)
    .scale(shapeScale)
    .translate(centerPosition.x, centerPosition.y)
    .toString();
}

function rgroupAttachmentPointLabel(
  paper: RaphaelPaper,
  labelPosition: Vec2,
  labelText: string,
  options: RenderOptions,
  fill: string,
) {
  const labelPath = paper
    .text(labelPosition.x, labelPosition.y, labelText)
    .attr({
      font: options.font,
      'font-size': options.fontszInPx * 0.9,
      fill,
    });
  return labelPath;
}

function arrowCurlyMechanism(
  paper: RaphaelPaper,
  item: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { pos, height, height2, along1, along2 } = item;
  const [start] = pos;
  const { arrowHeadLength, arrowHeadWidth, arrowHeadAttr, strokeWidth, color } =
    getMechanismArrowDimensions(options);

  // A two-segment arrow is drawn in plain canvas coordinates rather than the
  // rotated chord frame the single-segment path uses: with a waypoint there is
  // no single chord to rotate about, and the two halves have to be laid out
  // where the router actually put them.
  if (item.leads?.length) {
    return segmentedMechanismArrow(
      paper,
      item as ArrowItem & { leads: NonNullable<ArrowItem['leads']> },
      options,
      {
        arrowHeadLength,
        arrowHeadWidth,
        arrowHeadAttr,
        strokeWidth,
        color,
        shouldApplySnappingStyle,
      },
    );
  }

  const endX = start.x + arrowLength;
  let shaftPath: string;
  let tx: number, ty: number, px: number, py: number;

  if (height2 !== undefined) {
    // Cubic Bezier — two independent control handles
    // cp1 = (arrowLength/3, -h1*4/3), cp2 = (2*arrowLength/3, -h2*4/3)
    // Scale factor 4/3 ensures symmetric cubic (h1==h2) matches old quadratic visually.
    const h1 = height;
    const h2 = height2;
    // Control points are free in two dimensions: `along1`/`along2` slide them
    // up and down the chord, `h1`/`h2` push them sideways. Defaulting the
    // along-values to the classic thirds makes an arrow drawn before they
    // existed render byte-identically.
    const a1 = along1 ?? DEFAULT_ALONG_1;
    const a2 = along2 ?? DEFAULT_ALONG_2;
    const from = new Vec2(start.x, start.y);
    const tip = new Vec2(endX, start.y);
    const shape = { h1, h2, along1: a1, along2: a2 };

    // The way the arrow came in over the head's own length rather than the
    // tangent at the very tip, so the shaft runs into the head's point instead
    // of along one of its edges.
    const arrival = headChordDirection(from, tip, shape, arrowHeadLength);
    tx = arrival.x;
    ty = arrival.y;
    px = -ty;
    py = tx;

    // The shaft stops where the head begins, and it stops by *splitting* the
    // curve there. Pulling the endpoint back while keeping the control points
    // — which is what this used to do — is a different cubic entirely, so the
    // line that was drawn was not the line that had been checked against the
    // structure. A sub-curve is exact and lies on the original.
    const split = splitCubic(
      from,
      tip,
      shape,
      parameterAtDistanceFromEnd(from, tip, shape, arrowHeadLength),
    );
    const [s1, s2] = cubicControlPoints(
      from,
      split.end,
      split.shape.h1,
      split.shape.h2,
      split.shape.along1,
      split.shape.along2,
    );

    shaftPath = svgPath(
      `M${toFixed(start.x)},${toFixed(start.y)}C${toFixed(s1.x)},${toFixed(
        s1.y,
      )},${toFixed(s2.x)},${toFixed(s2.y)},${toFixed(split.end.x)},${toFixed(
        split.end.y,
      )}`,
    )
      .rotate(arrowAngle, start.x, start.y)
      .toString();
  } else {
    // Quadratic Bezier (backward compat — no height2)
    const curv = height ? height * 2 : arrowLength * 0.25;
    const cpX = start.x + arrowLength * 0.5;
    const cpY = start.y - curv;

    // Tangent direction at bezier end (t=1): 2*(end - cp)
    const rawTanX = endX - cpX; // arrowLength / 2
    const rawTanY = start.y - cpY; // curv
    const tLen = Math.hypot(rawTanX, rawTanY);
    tx = rawTanX / tLen;
    ty = rawTanY / tLen;
    px = -ty;
    py = tx;

    const bx = endX - arrowHeadLength * tx;
    const by = start.y - arrowHeadLength * ty;

    shaftPath = svgPath(
      `M${toFixed(start.x)},${toFixed(start.y)}Q${toFixed(cpX)},${toFixed(
        cpY,
      )},${toFixed(bx)},${toFixed(by)}`,
    )
      .rotate(arrowAngle, start.x, start.y)
      .toString();
  }

  const headPath = svgPath(
    `M${toFixed(endX)},${toFixed(start.y)}` +
      `L${toFixed(endX - arrowHeadLength * tx + arrowHeadWidth * px)},${toFixed(
        start.y - arrowHeadLength * ty + arrowHeadWidth * py,
      )}` +
      `L${toFixed(endX - (arrowHeadLength - arrowHeadAttr) * tx)},${toFixed(
        start.y - (arrowHeadLength - arrowHeadAttr) * ty,
      )}` +
      `L${toFixed(endX - arrowHeadLength * tx - arrowHeadWidth * px)},${toFixed(
        start.y - arrowHeadLength * ty - arrowHeadWidth * py,
      )}Z`,
  )
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  const result = paper.set();
  result.push(
    paper.path(shaftPath).attr({
      ...options.lineattr,
      stroke: color,
      'stroke-width': strokeWidth,
      fill: 'none',
      ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
    }),
  );
  result.push(
    paper.path(headPath).attr({
      fill: color,
      stroke: color,
      'stroke-width': strokeWidth,
      ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
    }),
  );
  return result;
}

/**
 * Highlight and selection outline for a mechanism arrow: a thick translucent
 * band following the curve itself.
 *
 * The generic elliptical-arrow plate is a rotated rectangle spanning the whole
 * chord, which for a curly arrow covers a large area of unrelated structure and
 * says almost nothing about where the arrow actually is — making it hard to see
 * what you have grabbed or where to grab it.
 */
/**
 * A mechanism arrow that turns at a waypoint.
 *
 * Both halves are built from the same construction the router validated, so the
 * drawn curve is the curve that was checked against the structure. The shaft
 * runs the whole way to the tip and the head is filled over it — no pulling the
 * endpoint back, which would change the shape of the curve rather than shorten
 * it.
 */
/**
 * The shaft of a mechanism arrow with interior turn points, as one path.
 *
 * Built in plain canvas coordinates rather than the rotated chord frame a
 * single cubic uses, because a chain of segments has no single chord to rotate
 * into. Shared by the arrow itself and its hover outline so the two cannot
 * disagree about where the curve runs.
 */
function segmentedShaftPath(
  item: ArrowItem & { leads: NonNullable<ArrowItem['leads']> },
): string {
  const [start, end] = item.pos;
  const at = (v: Vec2) => `${toFixed(v.x)},${toFixed(v.y)}`;

  let path = `M${at(start)}`;
  let from = start;

  for (const turnPoint of item.leads) {
    const [c1, c2] = cubicControlPoints(
      from,
      turnPoint.at,
      turnPoint.height,
      turnPoint.height2,
      turnPoint.along1,
      turnPoint.along2,
    );
    path += `C${at(c1)},${at(c2)},${at(turnPoint.at)}`;
    from = turnPoint.at;
  }

  const [c1, c2] = cubicControlPoints(
    from,
    end,
    item.height,
    item.height2 ?? item.height,
    item.along1,
    item.along2,
  );
  return path + `C${at(c1)},${at(c2)},${at(end)}`;
}

function segmentedMechanismArrow(
  paper: RaphaelPaper,
  item: ArrowItem & { leads: NonNullable<ArrowItem['leads']> },
  options: RenderOptions,
  style: {
    arrowHeadLength: number;
    arrowHeadWidth: number;
    arrowHeadAttr: number;
    strokeWidth: number;
    color: string;
    shouldApplySnappingStyle: boolean;
  },
) {
  const [, end] = item.pos;
  const join = item.leads[item.leads.length - 1].at;
  const shaftPath = segmentedShaftPath(item);
  const at = (v: Vec2) => `${toFixed(v.x)},${toFixed(v.y)}`;

  // The way the arrow came in over the head's own length, not the tangent at
  // the very tip: a head is a narrow triangle, and on a tightly curving arrival
  // the tip tangent leans far enough off that the shaft grazes one edge of it
  // rather than running into its point.
  const t = headChordDirection(
    join,
    end,
    {
      h1: item.height,
      h2: item.height2 ?? item.height,
      along1: item.along1 ?? DEFAULT_ALONG_1,
      along2: item.along2 ?? DEFAULT_ALONG_2,
    },
    style.arrowHeadLength,
  );
  const p = new Vec2(-t.y, t.x);

  const backLeft = end
    .addScaled(t, -style.arrowHeadLength)
    .addScaled(p, style.arrowHeadWidth);
  const notch = end.addScaled(
    t,
    -(style.arrowHeadLength - style.arrowHeadAttr),
  );
  const backRight = end
    .addScaled(t, -style.arrowHeadLength)
    .addScaled(p, -style.arrowHeadWidth);

  const result = paper.set();
  result.push(
    paper.path(shaftPath).attr({
      ...options.lineattr,
      stroke: style.color,
      'stroke-width': style.strokeWidth,
      fill: 'none',
      ...(style.shouldApplySnappingStyle && options.arrowSnappingStyle),
    }),
  );
  result.push(
    paper
      .path(`M${at(end)}L${at(backLeft)}L${at(notch)}L${at(backRight)}Z`)
      .attr({
        fill: style.color,
        stroke: style.color,
        'stroke-width': style.strokeWidth,
        ...(style.shouldApplySnappingStyle && options.arrowSnappingStyle),
      }),
  );
  return result;
}

/**
 * The hover/selection outline for a mechanism arrow: the curve itself, to be
 * drawn as a thick soft stroke.
 *
 * Returns a path *string*, like every other highlight generator here, and
 * deliberately not a painted element. Returning an element bypassed the visel
 * that owns an object's drawn artifacts, so the highlight was never anybody's
 * to erase: every hover left another green smear behind, and deleting the
 * arrow removed only the arrow.
 */
function arrowMechanismHighlight(
  _paper: RaphaelPaper,
  item: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
) {
  const { pos, height, height2, along1, along2 } = item;
  const [start] = pos;

  // An arrow that turns at a waypoint is two segments in plain canvas
  // coordinates, not one in a rotated chord frame — so the outline has to be
  // built the same way the arrow itself is. Built from the chord instead, the
  // highlight traced a curve the arrow does not follow and ended up sitting
  // well away from it.
  if (item.leads?.length) {
    return segmentedShaftPath(
      item as ArrowItem & { leads: NonNullable<ArrowItem['leads']> },
    );
  }

  const a1 = along1 ?? DEFAULT_ALONG_1;
  const a2 = along2 ?? DEFAULT_ALONG_2;
  const h1 = height;
  const h2 = height2 ?? height;

  return svgPath(
    `M${toFixed(start.x)},${toFixed(start.y)}C${toFixed(
      start.x + arrowLength * a1,
    )},${toFixed(start.y - h1 * (4 / 3))},${toFixed(
      start.x + arrowLength * a2,
    )},${toFixed(start.y - h2 * (4 / 3))},${toFixed(
      start.x + arrowLength,
    )},${toFixed(start.y)}`,
  )
    .rotate(arrowAngle, start.x, start.y)
    .toString();
}

/**
 * Attributes that turn the curve path above into a highlight.
 *
 * An open curve cannot be filled the way the rectangular highlights are, so the
 * band is made of stroke width instead — hence the explicit `fill: none`, which
 * overrides the fill the shared hover and selection styles carry.
 */
function mechanismHighlightStyle(options: RenderOptions) {
  const { microModeScale } = getOptionsWithConvertedUnits(options);
  return {
    fill: 'none',
    'stroke-width': microModeScale * 0.2,
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
  };
}

function arrowFishhookMechanism(
  paper: RaphaelPaper,
  { pos: [start], height, height2, along1, along2 }: ArrowItem,
  arrowLength: number,
  arrowAngle: number,
  options: RenderOptions,
  shouldApplySnappingStyle: boolean,
) {
  const { arrowHeadLength, arrowHeadWidth, strokeWidth, color } =
    getMechanismArrowDimensions(options);

  const endX = start.x + arrowLength;
  let shaftPath: string;
  let tx: number, ty: number, px: number, py: number;

  if (height2 !== undefined) {
    // Cubic Bezier
    const h1 = height;
    const h2 = height2;
    // Control points are free in two dimensions: `along1`/`along2` slide them
    // up and down the chord, `h1`/`h2` push them sideways. Defaulting the
    // along-values to the classic thirds makes an arrow drawn before they
    // existed render byte-identically.
    const a1 = along1 ?? DEFAULT_ALONG_1;
    const a2 = along2 ?? DEFAULT_ALONG_2;
    const cp1X = start.x + arrowLength * a1;
    const cp1Y = start.y - h1 * (4 / 3);
    const cp2X = start.x + arrowLength * a2;
    const cp2Y = start.y - h2 * (4 / 3);

    const rawTanX = endX - cp2X;
    const rawTanY = start.y - cp2Y;
    const tLen = Math.hypot(rawTanX, rawTanY);
    tx = tLen > 1e-9 ? rawTanX / tLen : 1;
    ty = tLen > 1e-9 ? rawTanY / tLen : 0;
    px = -ty;
    py = tx;

    const bx = endX - arrowHeadLength * tx;
    const by = start.y - arrowHeadLength * ty;

    shaftPath = svgPath(
      `M${toFixed(start.x)},${toFixed(start.y)}C${toFixed(cp1X)},${toFixed(
        cp1Y,
      )},${toFixed(cp2X)},${toFixed(cp2Y)},${toFixed(bx)},${toFixed(by)}`,
    )
      .rotate(arrowAngle, start.x, start.y)
      .toString();
  } else {
    // Quadratic Bezier (backward compat)
    const curv = height ? height * 2 : arrowLength * 0.25;
    const cpX = start.x + arrowLength * 0.5;
    const cpY = start.y - curv;

    // Tangent direction at bezier end (t=1): 2*(end - cp)
    const rawTanX = endX - cpX;
    const rawTanY = start.y - cpY;
    const tLen = Math.hypot(rawTanX, rawTanY);
    tx = rawTanX / tLen;
    ty = rawTanY / tLen;
    px = -ty;
    py = tx;

    const bx = endX - arrowHeadLength * tx;
    const by = start.y - arrowHeadLength * ty;

    shaftPath = svgPath(
      `M${toFixed(start.x)},${toFixed(start.y)}Q${toFixed(cpX)},${toFixed(
        cpY,
      )},${toFixed(bx)},${toFixed(by)}`,
    )
      .rotate(arrowAngle, start.x, start.y)
      .toString();
  }

  // Half-bow head: only the +px wing (single-headed fishhook)
  const headPath = svgPath(
    `M${toFixed(endX)},${toFixed(start.y)}` +
      `L${toFixed(endX - arrowHeadLength * tx + arrowHeadWidth * px)},${toFixed(
        start.y - arrowHeadLength * ty + arrowHeadWidth * py,
      )}` +
      `L${toFixed(endX - arrowHeadLength * tx)},${toFixed(
        start.y - arrowHeadLength * ty,
      )}Z`,
  )
    .rotate(arrowAngle, start.x, start.y)
    .toString();

  const result = paper.set();
  result.push(
    paper.path(shaftPath).attr({
      ...options.lineattr,
      stroke: color,
      'stroke-width': strokeWidth,
      fill: 'none',
      ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
    }),
  );
  result.push(
    paper.path(headPath).attr({
      fill: color,
      stroke: color,
      'stroke-width': strokeWidth,
      ...(shouldApplySnappingStyle && options.arrowSnappingStyle),
    }),
  );
  return result;
}

export default {
  arrowMechanismHighlight,
  mechanismHighlightStyle,
  recenterText,
  arrow,
  plus,
  aromaticBondPaths,
  bondSingle,
  bondSingleUp,
  bondSingleStereoBold,
  bondDoubleStereoBold,
  bondSingleDown,
  bondSingleEither,
  bondDouble,
  bondSingleOrDouble,
  bondTriple,
  bondAromatic,
  bondAny,
  bondHydrogen,
  bondOneElectron,
  bondDative,
  reactingCenter,
  bondMark,
  radicalCap,
  radicalBullet,
  bracket,
  selectionRectangle,
  selectionPolygon,
  selectionLine,
  ellipse,
  rectangle,
  rectangleArrowHighlightAndSelection,
  polyline,
  line,
  rgroupAttachmentPoint,
  rgroupAttachmentPointLabel,
};
