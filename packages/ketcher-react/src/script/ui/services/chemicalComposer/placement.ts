import { type Struct, Vec2 } from 'ketcher-core';
import type { PlacementDensity } from './types';

const DEFAULT_BOND_LENGTH = 1.5;

const DENSITY_MULTIPLIERS: Record<PlacementDensity, number> = {
  compact: 1.5,
  standard: 2.25,
  comfortable: 2.75,
};

export interface HorizontalPlacementPlan {
  gap: number;
  positions: Vec2[];
}

function hasAtoms(struct: Struct): boolean {
  return struct.atoms.size > 0;
}

function positiveBondLength(struct: Struct): number | null {
  const length = struct.getAvgBondLength();
  return Number.isFinite(length) && length > 0 ? length : null;
}

function structureSize(struct: Struct): { width: number; height: number } {
  const bounds = struct.getCoordBoundingBox();
  return {
    width: Math.max(0, bounds.max.x - bounds.min.x),
    height: Math.max(0, bounds.max.y - bounds.min.y),
  };
}

/**
 * One shared gap is used for the entire inserted batch. Standard density is a
 * fixed edge-to-edge distance in bond-length units. Comfortable density adds
 * a bounded amount of breathing room based on the largest participant, so a
 * large molecule can influence the row without making it excessively sparse.
 */
export function calculateUniformGap(
  canvas: Struct,
  structures: Struct[],
  density: PlacementDensity,
): number {
  const bondLengths = [canvas, ...structures]
    .map(positiveBondLength)
    .filter((length): length is number => length !== null);
  const bondLength = bondLengths.length
    ? Math.max(...bondLengths)
    : DEFAULT_BOND_LENGTH;
  const baseGap = bondLength * DENSITY_MULTIPLIERS[density];

  if (density !== 'comfortable') {
    return baseGap;
  }

  const largestDiagonal = Math.max(
    0,
    ...structures.map((structure) => {
      const { width, height } = structureSize(structure);
      return Math.hypot(width, height);
    }),
  );
  const scaleBonus = Math.min(bondLength * 1.25, largestDiagonal * 0.08);
  return baseGap + scaleBonus;
}

/**
 * Plans a left-to-right row using bounding-box edges, not molecular centres.
 * Every candidate's bounding-box minimum is translated to its returned
 * position. This matches `fromPaste(..., needMoveFromTopLeftPoint = true)`.
 */
export function planHorizontalPlacement(
  canvas: Struct,
  structures: Struct[],
  density: PlacementDensity,
): HorizontalPlacementPlan {
  const gap = calculateUniformGap(canvas, structures, density);
  const canvasHasAtoms = hasAtoms(canvas);
  const canvasBounds = canvas.getCoordBoundingBox();
  const rowY = canvasHasAtoms ? canvasBounds.min.y : 0;
  let nextX = canvasHasAtoms ? canvasBounds.max.x + gap : 0;

  const positions = structures.map((structure) => {
    const position = new Vec2(nextX, rowY);
    const { width } = structureSize(structure);
    nextX += width + gap;
    return position;
  });

  return { gap, positions };
}
