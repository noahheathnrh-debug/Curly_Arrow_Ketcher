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

import { Vec2, radicalElectrons } from 'domain/entities';
import { Elements } from 'domain/constants';

type NonBondingAtom = {
  label: string;
  charge?: number | null;
  valence?: number | null;
  radical?: number | null;
  implicitH?: number | null;
  pp: Vec2;
  isQuery?: () => boolean;
  badConn?: boolean;
};
interface Obstacle {
  angle: number;
  width: number;
}

type LonePairStruct = {
  atoms: Map<number, NonBondingAtom>;
  bonds: Map<number, { begin: number; end: number }>;
};

type LonePairOptions = {
  microModeScale?: number;
  scale?: number;
  lonePairSize?: number;
  lineWidth: number;
  lonePairDistance?: number;
  fontszInPx: number;
};

function getObstacles(
  atom: NonBondingAtom,
  struct: LonePairStruct,
  aid: number,
  hydrogenOnTheLeft?: boolean,
): Obstacle[] {
  const obstacles: Obstacle[] = [];
  const BOND_HALF_WIDTH = 0.2;
  const HYDROGEN_HALF_WIDTH = 0.6;

  struct.bonds.forEach((bond) => {
    if (bond.begin === aid || bond.end === aid) {
      const neighborId = bond.begin === aid ? bond.end : bond.begin;
      const neighbor = struct.atoms.get(neighborId);

      if (neighbor) {
        obstacles.push({
          angle: Math.atan2(
            neighbor.pp.y - atom.pp.y,
            neighbor.pp.x - atom.pp.x,
          ),
          width: BOND_HALF_WIDTH,
        });
      }
    }
  });

  if ((atom.implicitH ?? 0) > 0 && atom.label !== 'H') {
    obstacles.push({
      angle: hydrogenOnTheLeft ? Math.PI : 0,
      width: HYDROGEN_HALF_WIDTH,
    });
  }

  return obstacles;
}

function findGaps(
  obstacles: Obstacle[],
): { start: number; end: number; size: number }[] {
  if (obstacles.length === 0) {
    return [{ start: 0, end: 2 * Math.PI, size: 2 * Math.PI }];
  }

  const intervals: { start: number; end: number }[] = [];
  obstacles.forEach((obs) => {
    let angle = obs.angle % (2 * Math.PI);
    if (angle < 0) angle += 2 * Math.PI;

    const start = angle - obs.width;
    const end = angle + obs.width;

    if (start < 0) {
      intervals.push({ start: start + 2 * Math.PI, end: 2 * Math.PI });
      intervals.push({ start: 0, end });
    } else if (end > 2 * Math.PI) {
      intervals.push({ start, end: 2 * Math.PI });
      intervals.push({ start: 0, end: end - 2 * Math.PI });
    } else {
      intervals.push({ start, end });
    }
  });

  intervals.sort((a, b) => a.start - b.start);

  const merged: { start: number; end: number }[] = [];
  let current = intervals[0];

  for (let i = 1; i < intervals.length; i++) {
    const next = intervals[i];
    if (next.start <= current.end + 1e-6) {
      current.end = Math.max(current.end, next.end);
    } else {
      merged.push(current);
      current = next;
    }
  }
  merged.push(current);

  // Wrap-around merge
  if (
    merged.length > 1 &&
    merged[merged.length - 1].end >= 2 * Math.PI - 1e-6 &&
    merged[0].start <= 1e-6
  ) {
    merged[0].start = merged[merged.length - 1].start - 2 * Math.PI;
    merged.pop();
  }

  if (
    merged.length === 1 &&
    merged[0].end - merged[0].start >= 2 * Math.PI - 1e-6
  ) {
    return [];
  }

  const gaps: { start: number; end: number; size: number }[] = [];
  for (let i = 0; i < merged.length; i++) {
    const endOfCurrent = merged[i].end;
    const startOfNext = merged[(i + 1) % merged.length].start;

    let gapSize = startOfNext - endOfCurrent;
    if (gapSize < 0) {
      gapSize += 2 * Math.PI;
    }

    if (gapSize > 1e-4) {
      gaps.push({
        start: endOfCurrent,
        end: endOfCurrent + gapSize,
        size: gapSize,
      });
    }
  }

  return gaps;
}

function allocateItemsToGaps(
  gaps: { start: number; end: number; size: number }[],
  itemCount: number,
): number[] {
  const allocation = new Array(gaps.length).fill(0);

  for (let i = 0; i < itemCount; i++) {
    let bestGapIndex = -1;
    let maxSpacing = -1;

    for (let j = 0; j < gaps.length; j++) {
      const spacing = gaps[j].size / (allocation[j] + 1);
      if (spacing > maxSpacing) {
        maxSpacing = spacing;
        bestGapIndex = j;
      }
    }

    if (bestGapIndex !== -1) {
      allocation[bestGapIndex]++;
    }
  }

  return allocation;
}

export type NonBondingLayout = {
  radicalAngles: number[];
  lonePairAngles: number[];
};

function getLonePairCount(atom: NonBondingAtom) {
  const element = Elements.get(atom.label);
  if (!element || !element.group) {
    return 0;
  }

  const group = element.group;
  if (group < 1 || group > 8) {
    return 0;
  }

  if (atom.isQuery?.() || atom.badConn) {
    return 0;
  }

  const atomValence = atom.valence;
  if (atomValence == null || atomValence < 0) {
    return 0;
  }

  const charge = atom.charge ?? 0;
  const negChargeBonus = Math.max(0, -charge);
  const nonBondingElectrons = group - charge - atomValence + negChargeBonus;

  if (nonBondingElectrons <= 0) {
    return 0;
  }

  return Math.min(Math.floor(nonBondingElectrons / 2), 4);
}

export function calcNonBondingLayout(
  atom: NonBondingAtom,
  struct: LonePairStruct,
  aid: number,
  hydrogenOnTheLeft?: boolean,
): NonBondingLayout | null {
  const radicalCount = radicalElectrons(atom.radical);
  const lonePairCount = getLonePairCount(atom);
  const totalSlots = radicalCount + lonePairCount;

  if (totalSlots <= 0) {
    return null;
  }

  const obstacles = getObstacles(atom, struct, aid, hydrogenOnTheLeft);
  let gaps = findGaps(obstacles);

  if (gaps.length === 0) {
    gaps = [{ start: 0, end: 2 * Math.PI, size: 2 * Math.PI }];
  }

  const allocations = allocateItemsToGaps(gaps, totalSlots);
  const resultAngles: number[] = [];

  for (let i = 0; i < gaps.length; i++) {
    const gap = gaps[i];
    const count = allocations[i];
    if (count > 0) {
      const step = gap.size / (count + 1);
      for (let j = 1; j <= count; j++) {
        let angle = gap.start + j * step;
        angle = angle % (2 * Math.PI);
        if (angle > Math.PI) angle -= 2 * Math.PI;
        else if (angle < -Math.PI) angle += 2 * Math.PI;
        resultAngles.push(angle);
      }
    }
  }

  const baseAngle = hydrogenOnTheLeft === false ? 0 : Math.PI;

  resultAngles.sort((a, b) => {
    let diffA = Math.abs(a - baseAngle);
    if (diffA > Math.PI) diffA = 2 * Math.PI - diffA;
    let diffB = Math.abs(b - baseAngle);
    if (diffB > Math.PI) diffB = 2 * Math.PI - diffB;
    return diffA - diffB;
  });

  return {
    radicalAngles: resultAngles.slice(0, radicalCount),
    lonePairAngles: resultAngles.slice(radicalCount),
  };
}

/**
 * Compute angles for lone pairs around an atom.
 * `hydrogenOnTheLeft` comes from ReAtom (render layer); pass undefined if unavailable.
 */
export function calcLonePairAngles(
  atom: NonBondingAtom,
  struct: LonePairStruct,
  aid: number,
  hydrogenOnTheLeft?: boolean,
): number[] | null {
  const layout = calcNonBondingLayout(atom, struct, aid, hydrogenOnTheLeft);
  return layout?.lonePairAngles.length ? layout.lonePairAngles : null;
}

/**
 * Return model-space Vec2 positions for arrow attachment at each lone pair.
 * Position is the pair center pushed slightly forward (away from atom) by
 * half a dot radius, so arrows visually emanate from the pair.
 *
 * `labelHalfSizePx` should be the actual rendered label half-size in canvas
 * px (label.rbb-derived); falls back to fontszInPx * 0.5 when unavailable.
 */
export function getLonePairModelPositions(
  atom: NonBondingAtom,
  struct: LonePairStruct,
  aid: number,
  options: LonePairOptions,
  hydrogenOnTheLeft?: boolean,
  labelHalfSizePx?: number,
): Vec2[] {
  const layout = calcNonBondingLayout(atom, struct, aid, hydrogenOnTheLeft);
  const angles = layout?.lonePairAngles ?? [];
  if (angles.length === 0) return [];

  const scale = options.microModeScale ?? options.scale ?? 40;
  const sizeFactor = Math.max(1, options.lonePairSize ?? 4);
  const dotRadius = options.lineWidth * 0.9 * (sizeFactor / 4);
  const lpDist = options.lonePairDistance ?? 3;
  const halfSize = labelHalfSizePx ?? options.fontszInPx * 0.5;
  const pairOffset =
    (halfSize + dotRadius * lpDist + options.lineWidth) / scale;
  // Slight forward offset so the arrow tail sits just past the pair centre
  const forwardOffset = (dotRadius * 0.5) / scale;
  const totalOffset = pairOffset + forwardOffset;

  return angles.map(
    (angle) =>
      new Vec2(
        atom.pp.x + Math.cos(angle) * totalOffset,
        atom.pp.y + Math.sin(angle) * totalOffset,
      ),
  );
}

export function getRadicalModelPositions(
  atom: NonBondingAtom,
  struct: LonePairStruct,
  aid: number,
  options: LonePairOptions,
  hydrogenOnTheLeft?: boolean,
  labelHalfSizePx?: number,
): Vec2[] {
  const layout = calcNonBondingLayout(atom, struct, aid, hydrogenOnTheLeft);
  const angles = layout?.radicalAngles ?? [];
  if (angles.length === 0) return [];

  const scale = options.microModeScale ?? options.scale ?? 40;
  const sizeFactor = Math.max(1, options.lonePairSize ?? 4);
  const dotRadius = options.lineWidth * 0.9 * (sizeFactor / 4);
  const lpDist = options.lonePairDistance ?? 3;
  const halfSize = labelHalfSizePx ?? options.fontszInPx * 0.5;
  const offset = (halfSize + dotRadius * lpDist + options.lineWidth) / scale;

  return angles.map(
    (angle) =>
      new Vec2(
        atom.pp.x + Math.cos(angle) * offset,
        atom.pp.y + Math.sin(angle) * offset,
      ),
  );
}
