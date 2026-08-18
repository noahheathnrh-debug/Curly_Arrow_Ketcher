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
import {
  findGaps,
  getAngularObstacles,
  type NonBondingAtom,
} from 'application/render/restruct/lonePairUtils';
import {
  BOND_CLEARANCE,
  BOND_CONE,
  DESTINATION_GRACE_RADIUS,
  PARITY_RAY_ANGLES,
  PARITY_RAY_LENGTH,
  DOT_ANGULAR_HALF_WIDTH,
  LOBE_RADIUS,
  MIN_LOBE_WIDTH,
  LONE_PAIR_CONE,
  HEAD_STANDOFF,
  HEAD_STANDOFF_STEP,
  MAX_HEAD_STANDOFF,
  MAX_ARRIVAL_CONE,
  MAX_SECTORS,
  MIN_CLEAVAGE_BULGE,
  MIN_SECTOR_WIDTH,
  PI_SOURCE_OFFSET,
  SECTOR_EDGE_MARGIN,
  SIDE_SPREAD,
  SIGMA_SOURCE_OFFSET,
  SOURCE_GRACE_RADIUS,
} from './constants';
import {
  type Capsule,
  perpendicularOfChord,
  pointSegmentDistance,
  segmentsIntersect,
} from './geometry';
import { obstacleIdForBond, obstacleIdsForAtom } from './obstacles';
import type {
  ApproachSector,
  DestinationAnchor,
  ElectronDestination,
  ElectronSource,
  MechanismMetrics,
  MechanismOptions,
  MechanismStruct,
  SourceAnchor,
} from './types';

function unitAt(angle: number): Vec2 {
  return new Vec2(Math.cos(angle), Math.sin(angle));
}

function normaliseAngle(angle: number): number {
  let a = angle % (2 * Math.PI);
  if (a > Math.PI) a -= 2 * Math.PI;
  if (a <= -Math.PI) a += 2 * Math.PI;
  return a;
}

function sectorId(atomId: number, centre: number): string {
  const deg = Math.round((normaliseAngle(centre) * 180) / Math.PI);
  const sign = deg < 0 ? '-' : '+';
  return `atom${atomId}@${sign}${String(Math.abs(deg)).padStart(3, '0')}`;
}

/**
 * Free angular wedges around an atom, best-aligned first.
 *
 * `excludeBondIds` is how a breaking bond stops blocking its own arrow: when
 * `C-Br` cleaves, the electrons must reach Br along the C-Br direction, which
 * is exactly the direction that bond occupies.
 */
export function approachSectors(
  struct: MechanismStruct,
  atomId: number,
  preferred: Vec2,
  excludeBondIds?: ReadonlySet<number>,
  keepAngle?: number,
  hydrogenOnTheLeft?: boolean,
): ApproachSector[] {
  const atom = struct.atoms.get(atomId);
  if (!atom) return [];

  const gaps = findGaps(
    // The hydrogen side matters and used to be left unsaid, which defaulted it
    // to the right. An `H3C` has its hydrogens on the *left*, so the space kept
    // clear was the empty side and the text itself was fair game — arrows came
    // in through it and parked their heads in the middle of the letters.
    getAngularObstacles(
      atom,
      struct,
      atomId,
      hydrogenOnTheLeft,
      excludeBondIds,
    ),
  );

  const preferredAngle = Math.atan2(preferred.y, preferred.x);

  const sectors: ApproachSector[] = [];
  for (const gap of gaps) {
    if (gap.size < MIN_SECTOR_WIDTH) continue;

    // Shrink both edges so a route aimed at an edge still has visible room.
    const margin = Math.min(
      SECTOR_EDGE_MARGIN,
      (gap.size - MIN_SECTOR_WIDTH) / 2,
    );

    // Aim where the electrons are actually coming from, provided that lies
    // inside the free wedge; only fall back to an edge when it does not.
    //
    // Aiming at the wedge *centre* regardless is subtly wrong and produces
    // badly overdrawn arrows. In an SN2 the free wedge at the carbon runs from
    // one C-H at 90 degrees to another at 225, so its centre is 157.5 — but the
    // true backside, 180, is inside that same wedge. Aiming at 157.5 forces the
    // arrow to arrive at an angle it cannot reach directly, so it swings up and
    // over the structure to get there.
    let offset = (preferredAngle - gap.start) % (2 * Math.PI);
    if (offset < 0) offset += 2 * Math.PI;

    const clamped = Math.min(Math.max(offset, margin), gap.size - margin);

    // Two aims per wedge, not one.
    //
    // The clamped aim points as close to the source as the wedge allows, which
    // is right whenever a direct approach works. But some arrows must come in
    // from the far side — around the outside of a ring, say, where the direct
    // line crosses the structure. Offering only the clamped aim makes that
    // shape structurally unreachable however expressive the curve family is,
    // because the head is never pointed anywhere a detour could arrive from.
    //
    // So the wedge centre is offered as a second candidate whenever it differs
    // meaningfully, and scoring picks between them. A detour loses on tangent
    // error and length, so it only wins when the direct approach collides.
    const aims = [clamped];
    const middle = gap.size / 2;
    if (Math.abs(middle - clamped) > MIN_SECTOR_WIDTH) aims.push(middle);

    // Round one side or the other of the direct line.
    //
    // A terminal atom has a single free wedge covering almost everything, so
    // the two aims above can easily both land on the same side of the incoming
    // electrons — and then "come in the other way round" is not a worse option,
    // it is not an option at all. These two put an aim either side of the
    // direct approach whenever the wedge is wide enough to hold one.
    for (const spread of [SIDE_SPREAD, -SIDE_SPREAD]) {
      const at = clamped + spread;
      if (at < margin || at > gap.size - margin) continue;
      if (aims.some((existing) => Math.abs(existing - at) < MIN_SECTOR_WIDTH)) {
        continue;
      }
      aims.push(at);
    }

    for (const at of aims) {
      const aim = normaliseAngle(gap.start + at);
      sectors.push({
        id: sectorId(atomId, aim),
        start: normaliseAngle(gap.start + margin),
        end: normaliseAngle(gap.start + gap.size - margin),
        centre: aim,
        outward: unitAt(aim),
      });
    }
  }

  if (sectors.length === 0) {
    // Fully enclosed atom: aim straight at where the source is, and let
    // scoring deal with the collisions rather than refusing to route at all.
    const centre = Math.atan2(preferred.y, preferred.x);
    sectors.push({
      id: sectorId(atomId, centre),
      start: centre - MIN_SECTOR_WIDTH / 2,
      end: centre + MIN_SECTOR_WIDTH / 2,
      centre,
      outward: unitAt(centre),
    });
  }

  const alignment = (sector: ApproachSector) =>
    sector.outward.x * preferred.x + sector.outward.y * preferred.y;

  const ranked = sectors.sort((a, b) => alignment(b) - alignment(a));
  const kept = ranked.slice(0, MAX_SECTORS);

  // Always keep one way round each side of the atom.
  //
  // Ranking purely by alignment fills every slot from the side facing the
  // source, and the arrows that must come in from behind — the sweep around
  // the outside of a ring, an arrival more than 90 degrees off the chord —
  // then have no sector pointing anywhere they could arrive from, however
  // expressive the curve family is. Spending the worst-aligned slot on the
  // best sector from the other side costs nothing when it is not needed:
  // sectors are tried in order and the later ones are only reached when the
  // earlier ones collide.
  const handedness = (sector: ApproachSector) =>
    preferred.x * sector.outward.y - preferred.y * sector.outward.x >= 0;
  if (
    kept.length > 1 &&
    kept.every((s) => handedness(s) === handedness(kept[0]))
  ) {
    const other = ranked.find((s) => handedness(s) !== handedness(kept[0]));
    if (other) kept[kept.length - 1] = other;
  }

  // A wedge the user has actually chosen always gets a place, whatever the
  // ranking made of it. Without this the cap above could drop it entirely and
  // the arrow would arrive somewhere else — through a wedge that scored better
  // but was never offered. The best-ranked aim inside it is taken, which is the
  // one pointing nearest the electrons, so the head arrives from the side the
  // arrow is coming from rather than down the wedge's middle.
  if (
    keepAngle !== undefined &&
    !kept.some((s) => sectorContains(s, keepAngle))
  ) {
    const wanted = ranked.find((s) => sectorContains(s, keepAngle));
    if (wanted) kept[kept.length - 1] = wanted;
  }

  return kept;
}

// ─── source ─────────────────────────────────────────────────────────────────

export function resolveSourceAnchor(
  source: ElectronSource,
  struct: MechanismStruct,
  metrics: MechanismMetrics,
  _options: MechanismOptions,
): SourceAnchor | null {
  if (source.kind === 'lone-pair' || source.kind === 'radical') {
    const atom = struct.atoms.get(source.atomId);
    if (!atom) return null;

    const dots =
      source.kind === 'lone-pair'
        ? metrics.lonePairDots(source.atomId)
        : metrics.radicalDots(source.atomId);

    const index =
      source.kind === 'lone-pair' ? source.pairIdx : source.radicalIdx;
    const position = dots[index];
    if (!position) return null;

    const away = position.sub(atom.pp);
    const length = away.length();

    return {
      position,
      // Leave radially, so the arrow visibly emanates from that pair rather
      // than doubling back across the atom label.
      outward: length < 1e-9 ? new Vec2(1, 0) : away.scaled(1 / length),
      cone: LONE_PAIR_CONE,
      graceRadius: SOURCE_GRACE_RADIUS,
      minimumBulge: 0,
      exempt: obstacleIdsForAtom(source.atomId, metrics),
    };
  }

  const extent = metrics.bondExtent(source.bondId);
  if (!extent) return null;

  const [a, b] = extent;
  const axis = b.sub(a);
  const length = axis.length();
  if (length < 1e-9) return null;

  const dir = axis.scaled(1 / length);
  const side = source.side ?? 1;
  const normal = perpendicularOfChord(dir).scaled(side);

  // Sit just off the bond line so the tail reads as coming from the bond
  // itself, not from either atom it joins — but only just. The departure angle
  // is the tangent's job, not the anchor's: pushing the anchor further out to
  // suggest "sideways" only makes the arrow look detached, floating in space
  // beside a bond it is supposed to be leaving.
  //
  // A pi bond still gets a little more room than a sigma one, so its tail
  // clears the second line of the double bond rather than landing on it.
  const offset =
    metrics.bondHalfWidth(source.bondId) +
    (source.component === 'pi' ? PI_SOURCE_OFFSET : SIGMA_SOURCE_OFFSET);

  return {
    position: a.addScaled(dir, length / 2).addScaled(normal, offset),
    // Peel away from the bond rather than sliding along it.
    outward: normal,
    cone: BOND_CONE,
    graceRadius: SOURCE_GRACE_RADIUS,
    // A bond source is inherently short-chorded, so insist the route bows
    // clear of the bond instead of hugging it.
    minimumBulge: MIN_CLEAVAGE_BULGE,
    exempt: new Set([obstacleIdForBond(source.bondId)]),
  };
}

// ─── destination ────────────────────────────────────────────────────────────

/**
 * Candidate head anchors, best sector first.
 *
 * Returns several so the router can fall back to the next-best approach when
 * the preferred one turns out to need an impossible tangent.
 */
export function resolveDestinationAnchors(
  destination: ElectronDestination,
  source: ElectronSource,
  sourcePosition: Vec2,
  struct: MechanismStruct,
  metrics: MechanismMetrics,
  _options: MechanismOptions,
): DestinationAnchor[] {
  if (destination.kind === 'bond') {
    return bondDestination(destination, metrics);
  }

  const receiverId =
    destination.kind === 'atom' ? destination.atomId : destination.atomId2;
  const receiver = struct.atoms.get(receiverId);
  if (!receiver) return [];

  // For a new bond the head belongs in the gap toward the donor; for a plain
  // atom destination it comes from wherever the electrons are travelling.
  const donor =
    destination.kind === 'new-bond'
      ? struct.atoms.get(destination.atomId1)?.pp
      : undefined;
  const preferredRaw = (donor ?? sourcePosition).sub(receiver.pp);
  const preferredLength = preferredRaw.length();
  const preferred =
    preferredLength < 1e-9
      ? new Vec2(1, 0)
      : preferredRaw.scaled(1 / preferredLength);

  // A bond that is breaking must not block the arrow depicting it breaking.
  const excluded = new Set<number>();
  if (source.kind === 'bond') {
    const bond = struct.bonds.get(source.bondId);
    if (bond && (bond.begin === receiverId || bond.end === receiverId)) {
      excluded.add(source.bondId);
    }
  }

  const exempt = obstacleIdsForAtom(receiverId, metrics);
  for (const bondId of excluded) exempt.add(obstacleIdForBond(bondId));

  const sectors = restrictToApproach(
    approachSectors(
      struct,
      receiverId,
      preferred,
      excluded,
      destination.approach,
      metrics.hydrogenOnTheLeft(receiverId),
    ),
    destination.approach,
  );

  return sectors.map((sector) => ({
    // Route to the atom itself. How far short of it the head stops is
    // `trim`, applied later by splitting the curve — so a label appearing or
    // disappearing slides the tip along a path that does not move.
    position: new Vec2(receiver.pp),
    trim: headStandoff(struct, metrics, receiverId, sector.outward, excluded),
    sector,
    inward: sector.outward.negated(),
    // Half the free wedge, so the head may angle within the sector it was
    // given but never outside it — and capped, however wide that wedge is.
    //
    // A carbon in the middle of a chain has wedges of about 120 degrees, so
    // uncapped this let the head arrive up to 60 degrees off centre. At five
    // points per degree that is cheap next to a long detour, and the arrow
    // ended up skimming past its target rather than pointing into it. The
    // wedge says which way in; it should not license a graze.
    cone: Math.min(
      MAX_ARRIVAL_CONE,
      Math.max(
        MIN_SECTOR_WIDTH / 2,
        Math.abs(normaliseAngle(sector.end - sector.start)) / 2,
      ),
    ),
    graceRadius: DESTINATION_GRACE_RADIUS,
    exempt,
    pinned: destination.approach !== undefined,
  }));
}

/** One approach offered as a drop target during a drag. */
export interface ApproachLobe {
  /**
   * Direction out of the target, in radians. This is what gets stored when the
   * user releases on it — an angle rather than a sector id, because sectors are
   * recomputed whenever the structure changes and their ids change with them.
   */
  angle: number;
  /** Where to draw it, and what the cursor is measured against. */
  position: Vec2;
  outward: Vec2;
  /** For a bond target, which side of the bond this is. */
  side?: -1 | 1;
}

/**
 * The approaches offered as drop targets for a destination.
 *
 * One per usable wedge, at its middle — squarely between the bonds, which is
 * where a reader expects an arrow to come in. Never subdivided: a wedge is one
 * way in, and splitting a wide one into several offered choices that produced
 * the same arrow.
 *
 * A single way in still gets a lobe. It is not a choice, but hiding it made the
 * tool feel arbitrary — sometimes there were targets and sometimes there were
 * not, with no way to tell which from looking. Showing it consistently says
 * "here is where this will land" instead.
 */
export function approachLobes(
  destination: ElectronDestination,
  source: ElectronSource,
  sourcePosition: Vec2,
  struct: MechanismStruct,
  metrics: MechanismMetrics,
  radius = LOBE_RADIUS,
): ApproachLobe[] {
  const lobes =
    destination.kind === 'bond'
      ? bondLobes(destination.bondId, metrics, radius)
      : atomLobes(destination, source, struct, metrics, radius);

  // An approach on the far side of the structure from where the electrons are
  // is not a choice — the arrow would have to cut through something to take it.
  // This applies just as much to the two sides of a bond, one of which is the
  // inside of the ring it belongs to.
  return lobes.filter((lobe) =>
    sameRegion(sourcePosition, lobe.position, struct),
  );
}

/**
 * Either side of the bond, at its midpoint.
 *
 * A bond has no wedges — the arrowhead lands on the line itself — so the only
 * thing to choose is which side of it the arrow comes from, which is exactly
 * what `side` on a bond destination already means. Offering nothing here left
 * the commonest target in a mechanism with no choice at all.
 */
function bondLobes(
  bondId: number,
  metrics: MechanismMetrics,
  radius: number,
): ApproachLobe[] {
  const extent = metrics.bondExtent(bondId);
  if (!extent) return [];

  const [a, b] = extent;
  const axis = b.sub(a);
  const length = axis.length();
  if (length < 1e-9) return [];

  const midpoint = Vec2.centre(a, b);
  const normal = perpendicularOfChord(axis.scaled(1 / length));
  const offset = radius + metrics.bondHalfWidth(bondId);

  return ([1, -1] as const).map((side) => {
    const outward = normal.scaled(side);
    return {
      angle: Math.atan2(outward.y, outward.x),
      position: midpoint.addScaled(outward, offset),
      outward,
      side,
    };
  });
}

function atomLobes(
  destination: ElectronDestination,
  source: ElectronSource,
  struct: MechanismStruct,
  metrics: MechanismMetrics,
  radius: number,
): ApproachLobe[] {
  const receiverId = receiverOf(destination);
  if (receiverId === null) return [];

  const receiver = struct.atoms.get(receiverId);
  if (!receiver) return [];

  const excluded = breakingBonds(source, receiverId, struct);
  const gaps = findGaps(
    blockedDirections(receiver, receiverId, struct, metrics, excluded),
  );

  const lobes: ApproachLobe[] = [];
  for (const gap of gaps) {
    if (gap.size < MIN_LOBE_WIDTH) continue;

    const angle = normaliseAngle(gap.start + gap.size / 2);
    const outward = unitAt(angle);

    lobes.push({
      angle,
      position: receiver.pp.addScaled(outward, radius),
      outward,
    });
  }

  return lobes;
}

/**
 * Directions around an atom that an arrow may not arrive along.
 *
 * The shared solver covers bonds and the implicit-hydrogen label. Lone pairs
 * and radical dots are added here rather than there because that solver is what
 * *places* the dots — asking it to treat them as obstacles would be circular.
 * Without them the arrowhead was free to land on top of a lone pair, which is
 * both ugly and chemically misleading.
 */
function blockedDirections(
  receiver: NonBondingAtom,
  receiverId: number,
  struct: MechanismStruct,
  metrics: MechanismMetrics,
  excluded: ReadonlySet<number>,
) {
  const obstacles = getAngularObstacles(
    receiver,
    struct,
    receiverId,
    metrics.hydrogenOnTheLeft(receiverId),
    excluded,
  );

  const dots = [
    ...metrics.visibleLonePairDots(receiverId),
    ...metrics.radicalDots(receiverId),
  ];
  for (const dot of dots) {
    const away = dot.sub(receiver.pp);
    if (away.length() < 1e-9) continue;
    obstacles.push({
      angle: Math.atan2(away.y, away.x),
      width: DOT_ANGULAR_HALF_WIDTH,
    });
  }

  return obstacles;
}

/**
 * The bonds that can actually enclose anything.
 *
 * Every edge except the bridges — an edge whose removal would disconnect the
 * graph is on no cycle, so no closed region has it as a boundary. Found by the
 * standard depth-first low-link walk; nothing here knows what a ring is, which
 * is the point. Fused systems, macrocycles and cages all fall out of it, and a
 * plain chain yields nothing at all.
 *
 * This is the correction to an earlier attempt that counted crossings against
 * *every* bond. Ray parity only means inside-or-outside for closed curves: a
 * ray can cross an open chain exactly once, and the answer it gives there is
 * not wrong so much as meaningless.
 */
export function enclosingBonds(struct: MechanismStruct): Array<[Vec2, Vec2]> {
  type Edge = { to: number; bondId: number };
  const neighbours = new Map<number, Edge[]>();

  const connect = (from: number, to: number, bondId: number) => {
    const edges = neighbours.get(from);
    if (edges) edges.push({ to, bondId });
    else neighbours.set(from, [{ to, bondId }]);
  };

  struct.bonds.forEach((bond, bondId) => {
    connect(bond.begin, bond.end, bondId);
    connect(bond.end, bond.begin, bondId);
  });

  const discovered = new Map<number, number>();
  const bridges = new Set<number>();
  let counter = 0;

  /** Returns the earliest discovery time reachable from this atom's subtree. */
  const walk = (atomId: number, viaBond: number): number => {
    const arrival = counter++;
    discovered.set(atomId, arrival);
    let lowest = arrival;

    for (const edge of neighbours.get(atomId) ?? []) {
      if (edge.bondId === viaBond) continue;

      const seen = discovered.get(edge.to);
      if (seen === undefined) {
        const childLow = walk(edge.to, edge.bondId);
        lowest = Math.min(lowest, childLow);
        // Nothing below this child reaches back past it, so the edge is the
        // only way through: a bridge, and on no cycle.
        if (childLow > arrival) bridges.add(edge.bondId);
      } else {
        lowest = Math.min(lowest, seen);
      }
    }

    return lowest;
  };

  neighbours.forEach((_edges, atomId) => {
    if (!discovered.has(atomId)) walk(atomId, -1);
  });

  const segments: Array<[Vec2, Vec2]> = [];
  struct.bonds.forEach((bond, bondId) => {
    if (bridges.has(bondId)) return;
    const begin = struct.atoms.get(bond.begin);
    const end = struct.atoms.get(bond.end);
    if (begin && end) segments.push([begin.pp, end.pp]);
  });

  return segments;
}

/**
 * Whether a point sits inside a closed region of the structure.
 *
 * Ray casting: count how many enclosing bonds a ray to infinity properly
 * crosses; odd means inside. Voted across several ray directions because a
 * single ray can pass exactly through a vertex, where the strict crossing test
 * counts neither of the two bonds meeting there. The angles sit away from the
 * 30/60/90/120 degree directions structures are drawn on.
 */
function enclosedBy(point: Vec2, segments: Array<[Vec2, Vec2]>): boolean {
  if (segments.length === 0) return false;

  let insideVotes = 0;
  for (const degrees of PARITY_RAY_ANGLES) {
    const far = point.addScaled(
      unitAt((degrees * Math.PI) / 180),
      PARITY_RAY_LENGTH,
    );

    let crossings = 0;
    for (const [begin, end] of segments) {
      if (segmentsIntersect(point, far, begin, end)) crossings++;
    }
    if (crossings % 2 === 1) insideVotes++;
  }

  return insideVotes * 2 > PARITY_RAY_ANGLES.length;
}

/**
 * Whether an arrow could get from one point to the other at all.
 *
 * Not a question about rings: the rule is that an arrow may not cross the
 * structure, so the two ends have to be on the same side of it. Starting and
 * finishing inside the same ring is fine; starting outside and finishing inside
 * is not, because every way in cuts a bond.
 *
 * Only decides which approaches are worth *offering*. The guarantee is still
 * the collision test on the finished curve, so a disagreement costs a fallback
 * arrow rather than no arrow.
 *
 * Undefined for a point lying exactly on a bond — "which side" has no answer
 * there. Every caller asks about lobe positions and tail anchors, which are off
 * the boundary by construction.
 */
export function sameRegion(a: Vec2, b: Vec2, struct: MechanismStruct): boolean {
  const segments = enclosingBonds(struct);
  return enclosedBy(a, segments) === enclosedBy(b, segments);
}

/** The atom the electrons arrive at, or null for a bond destination. */
function receiverOf(destination: ElectronDestination): number | null {
  if (destination.kind === 'atom') return destination.atomId;
  if (destination.kind === 'new-bond') return destination.atomId2;
  return null;
}

/**
 * The source bond, when it is breaking at the receiving atom.
 *
 * That bond occupies exactly the direction the electrons must travel along, so
 * it has to stop counting as an obstruction — otherwise the one approach a
 * cleavage arrow actually needs is the one never offered.
 */
function breakingBonds(
  source: ElectronSource,
  receiverId: number,
  struct: MechanismStruct,
): Set<number> {
  const excluded = new Set<number>();
  if (source.kind !== 'bond') return excluded;

  const bond = struct.bonds.get(source.bondId);
  if (bond && (bond.begin === receiverId || bond.end === receiverId)) {
    excluded.add(source.bondId);
  }
  return excluded;
}

/**
 * Where a bond-anchored tail could leave from: either side of the bond.
 *
 * The head end has offered a choice since lobes existed, and the tail end has
 * not — a bond source silently took whichever side the code happened to pick.
 * These are the same discrete targets, at the same offset, so both ends of a
 * drag behave alike.
 */
export function departureLobes(
  source: ElectronSource,
  metrics: MechanismMetrics,
  radius = LOBE_RADIUS,
): ApproachLobe[] {
  // A lone pair or radical dot *is* the choice — it was made by grabbing that
  // dot rather than its neighbour — so there is nothing further to offer.
  if (source.kind !== 'bond') return [];

  return bondLobes(source.bondId, metrics, radius);
}

/**
 * Aim the arrow at the approach the user chose.
 *
 * A pinned approach comes from releasing on a lobe, which is an explicit
 * instruction rather than something inferred from the drag — so it decides the
 * direction outright, and the router's remaining freedom is how to curve into
 * it. The rule that collisions outrank neatness still holds; it just applies
 * within the chosen direction instead of choosing between directions.
 *
 * The wedge that contains the angle supplies the bounds, so the head can still
 * angle a little either way, but never so far that it stops reading as the
 * approach that was picked. Matching by containment rather than by sector id is
 * what lets the choice survive editing: the wedge shifts as bonds move and the
 * stored angle still falls inside it. If nothing contains it any more — a bond
 * was added right across it — the nearest wedge takes over.
 */
function restrictToApproach(
  sectors: ApproachSector[],
  approach: number | undefined,
): ApproachSector[] {
  if (approach === undefined || sectors.length === 0) return sectors;

  const containing = sectors.find((sector) => sectorContains(sector, approach));
  const wedge = containing ?? nearestSector(sectors, approach);

  // A sector aimed squarely at the chosen approach, ahead of everything else.
  //
  // Letting the wedge's own aims through instead — so the head could arrive
  // from the side the arrow comes from rather than down the middle — reads
  // better in principle, and was tried. In practice it meant a pinned approach
  // was honoured in two cases out of ten: the aims are ranked towards the
  // source, so both lobes of a target resolved to the same one and the choice
  // stopped meaning anything. Arriving down the middle of the wedge you picked
  // beats arriving wherever the ranking preferred.
  const halfWidth = Math.max(
    MIN_SECTOR_WIDTH / 2,
    Math.min(
      MAX_ARRIVAL_CONE,
      Math.abs(normaliseAngle(wedge.end - wedge.start)) / 2,
    ),
  );

  return [
    {
      id: wedge.id,
      start: normaliseAngle(approach - halfWidth),
      end: normaliseAngle(approach + halfWidth),
      centre: approach,
      outward: unitAt(approach),
    },
    ...sectors,
  ];
}

function nearestSector(
  sectors: ApproachSector[],
  angle: number,
): ApproachSector {
  let best = sectors[0];
  let smallest = Infinity;
  for (const sector of sectors) {
    const delta = Math.abs(normaliseAngle(sector.centre - angle));
    if (delta < smallest) {
      smallest = delta;
      best = sector;
    }
  }
  return best;
}

/**
 * How far short of the atom the arrowhead should stop.
 *
 * A label is only half the story. At a bare skeletal vertex the label has zero
 * width, but three or four bond capsules still converge on that point, so an
 * anchor placed just off the nucleus lands *inside* them and the arrow reads as
 * ploughing through the junction — visible in the SN2 and carbonyl renders,
 * where the head is buried in the tetrahedral centre.
 *
 * So walk outward along the approach direction until the anchor is genuinely
 * clear of every bond meeting this atom. Stepping rather than solving because
 * the clearance condition involves each bond's own width and angle; a closed
 * form would be longer than the loop and no more accurate.
 */
/**
 * How far the atom's label extends in a given direction, from its own centre.
 *
 * Zero at a bare skeletal vertex. Falls back to the symmetric half-width when
 * no box is available, which is never worse than what it replaces.
 */
function labelReach(
  metrics: MechanismMetrics,
  atomId: number,
  centre: Vec2,
  outward: Vec2,
): number {
  const box = metrics.labelBox(atomId);
  if (!box) return metrics.labelHalfSize(atomId);

  // Furthest corner of the box along `outward`, never less than zero — a label
  // entirely behind the arrow costs it nothing.
  let reach = 0;
  for (const x of [box.min.x, box.max.x]) {
    for (const y of [box.min.y, box.max.y]) {
      reach = Math.max(
        reach,
        (x - centre.x) * outward.x + (y - centre.y) * outward.y,
      );
    }
  }
  return reach;
}

function headStandoff(
  struct: MechanismStruct,
  metrics: MechanismMetrics,
  atomId: number,
  outward: Vec2,
  excludedBonds: ReadonlySet<number>,
): number {
  const atom = struct.atoms.get(atomId);
  if (!atom) return metrics.labelHalfSize(atomId) + HEAD_STANDOFF;

  // How far the drawn text reaches *this way*, not how wide it is overall.
  //
  // `H3C` is drawn almost entirely to one side of its own atom, so a symmetric
  // half-width understates the reach on that side by most of the label — and an
  // arrow coming in from there planted its head in the middle of the text.
  const start = labelReach(metrics, atomId, atom.pp, outward) + HEAD_STANDOFF;

  const incident: Capsule[] = [];
  struct.bonds.forEach((bond, bondId) => {
    if (excludedBonds.has(bondId)) return;
    if (bond.begin !== atomId && bond.end !== atomId) return;

    const extent = metrics.bondExtent(bondId);
    if (!extent) return;
    incident.push({
      a: extent[0],
      b: extent[1],
      r: metrics.bondHalfWidth(bondId) + BOND_CLEARANCE,
    });
  });

  if (incident.length === 0) return start;

  for (
    let distance = start;
    distance <= MAX_HEAD_STANDOFF;
    distance += HEAD_STANDOFF_STEP
  ) {
    const candidate = atom.pp.addScaled(outward, distance);
    const clear = incident.every(
      (capsule) =>
        pointSegmentDistance(candidate, capsule.a, capsule.b) >= capsule.r,
    );
    if (clear) return distance;
  }

  return MAX_HEAD_STANDOFF;
}

/**
 * Head anchor for a bond whose order is increasing.
 *
 * It lands beside the middle of the bond, offset to the side where the new
 * line will be drawn — not on the bond axis and not on either atom.
 */
function bondDestination(
  destination: Extract<ElectronDestination, { kind: 'bond' }>,
  metrics: MechanismMetrics,
): DestinationAnchor[] {
  const extent = metrics.bondExtent(destination.bondId);
  if (!extent) return [];

  const [a, b] = extent;
  const axis = b.sub(a);
  const length = axis.length();
  if (length < 1e-9) return [];

  const dir = axis.scaled(1 / length);
  const offset = metrics.bondHalfWidth(destination.bondId) + 0.12;

  // A pinned side goes first, but the other one stays available behind it.
  //
  // Returning the pinned side alone boxed the router in: if nothing could
  // reach that face without cutting through the bond, every candidate collided
  // and the least-bad one — an arrow drawn straight through the structure —
  // won by default. Not crossing the structure outranks honouring the pick,
  // so the pick decides between *clean* routes and no more than that.
  const sides: Array<-1 | 1> =
    destination.side === undefined
      ? [1, -1]
      : [destination.side, destination.side === 1 ? -1 : 1];

  return sides.map((side) => {
    const normal = perpendicularOfChord(dir).scaled(side);
    const centre = a.addScaled(dir, length / 2);
    const angle = Math.atan2(normal.y, normal.x);

    return {
      position: centre.addScaled(normal, offset),
      // A bond destination has no label to hide behind, so nothing to trim.
      trim: 0,
      sector: {
        id: `bond${destination.bondId}@${side > 0 ? 'p' : 'n'}`,
        start: angle - MIN_SECTOR_WIDTH,
        end: angle + MIN_SECTOR_WIDTH,
        centre: angle,
        outward: normal,
      },
      // Arrive from outside, heading back toward the bond.
      inward: normal.negated(),
      cone: MIN_SECTOR_WIDTH,
      graceRadius: DESTINATION_GRACE_RADIUS,
      exempt: new Set([obstacleIdForBond(destination.bondId)]),
      pinned: destination.side !== undefined,
    };
  });
}

/** Whether a point lies inside a sector, allowing for wrap-around at pi. */
export function sectorContains(sector: ApproachSector, angle: number): boolean {
  const delta = normaliseAngle(angle - sector.centre);
  let halfWidth = normaliseAngle(sector.end - sector.start) / 2;
  if (halfWidth < 0) halfWidth += Math.PI;
  return Math.abs(delta) <= Math.abs(halfWidth) + 1e-9;
}
