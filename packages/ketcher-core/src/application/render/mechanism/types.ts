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

import type { Vec2 } from 'domain/entities/vec2';
import type { ElectronDestination } from 'domain/entities/rxnArrow';
import type {
  NonBondingAtom,
  LonePairOptions,
} from 'application/render/restruct/lonePairUtils';
import type { Box, Capsule } from './geometry';

export type { ElectronDestination };

/**
 * Where the electrons come from.
 *
 * A charge glyph is deliberately not a source kind. Textbooks routinely draw a
 * tail from a minus sign when lone pairs are hidden, but that is a *display*
 * choice — chemically the electrons are still a specific lone pair. The
 * renderer resolves the visible tail position; the semantics stay here.
 */
export type ElectronSource =
  | { kind: 'lone-pair'; atomId: number; pairIdx: number }
  | { kind: 'radical'; atomId: number; radicalIdx: number }
  | {
      kind: 'bond';
      bondId: number;
      side?: -1 | 1;
      component?: 'sigma' | 'pi';
    };

export interface MechanismBond {
  begin: number;
  end: number;
  type?: number;
  stereo?: number;
  /**
   * Half-bond ids. Present on a real `Bond` and used to look up the bond's
   * *drawn* extent, which is shortened to clear the atom labels at each end.
   * Absent on hand-built test structures, which fall back to an analytic trim.
   */
  hb1?: number;
  hb2?: number;
}

/**
 * An arrow already on the canvas, in the same chord-relative form the renderer
 * draws it from. Enough to rebuild its curve and treat it as something to
 * steer around.
 */
export interface MechanismArrowShape {
  mode: string;
  pos: Vec2[];
  height?: number;
  height2?: number;
  along1?: number;
  along2?: number;
}

/**
 * The minimum a structure must expose for routing. A real `Struct` satisfies
 * this structurally, and so does a hand-built object literal in a test — which
 * is the point: the router never needs a render pass.
 */
export interface MechanismStruct {
  atoms: Map<number, NonBondingAtom>;
  bonds: Map<number, MechanismBond>;
  /**
   * Arrows already drawn. Optional because a test structure has none, and
   * because the first arrow of a mechanism has nothing to avoid.
   */
  rxnArrows?: Map<number, MechanismArrowShape>;
}

/**
 * Render options the router reads. A superset of what lone-pair layout needs:
 * bond spacing and wedge width decide how wide a bond's collision capsule is,
 * and charge size decides the radius of the charge disc.
 */
export type MechanismOptions = LonePairOptions & {
  chargeSize?: number;
  bondSpacingInPx?: number;
  stereoBondWidthInPx?: number;
  /**
   * Whether lone pairs are actually drawn.
   *
   * Routing follows what is on the canvas, not what the chemistry implies: with
   * the pairs hidden an arrowhead may land anywhere around the atom, and with
   * them shown it must come in between them. Toggling the setting therefore
   * moves arrows, which is the point.
   */
  showLonePairs?: boolean;
};

/**
 * Drawn geometry the router must avoid. Supplied by an implementation that
 * either measures the real rendered output or derives it analytically, so the
 * same routing code serves the app and the test suite.
 */
export interface MechanismMetrics {
  /** Half the drawn label extent, in model units. Zero for a bare skeletal vertex. */
  labelHalfSize(atomId: number): number;
  /**
   * The label's drawn extent as a box, or null for a bare skeletal vertex.
   *
   * Asymmetric, and deliberately not derivable from {@link labelHalfSize}. A
   * label like `H3C` is drawn almost entirely to one side of its own atom, so a
   * square centred on the nucleus both understates its width and puts it in the
   * wrong place — which let arrows run straight through the visible text while
   * technically clearing the obstacle.
   */
  labelBox(atomId: number): Box | null;
  hasLabel(atomId: number): boolean;
  /**
   * Which side of the atom its hydrogens are drawn on.
   *
   * `H3C` puts them left, `CH3` right, and the difference decides which
   * direction an arrow must not arrive from — that text is as solid as a bond.
   */
  hydrogenOnTheLeft(atomId: number): boolean;
  /** Charge glyph as a disc, or null when the atom is uncharged. */
  chargeShape(atomId: number): Capsule | null;
  /** Where the pairs are, drawn or not — a tail may be anchored to any of them. */
  lonePairDots(atomId: number): Vec2[];
  /** The subset actually on the canvas, which is what an arrow must dodge. */
  visibleLonePairDots(atomId: number): Vec2[];
  radicalDots(atomId: number): Vec2[];
  /** Bond endpoints as drawn — shortened to clear the atom labels at each end. */
  bondExtent(bondId: number): [Vec2, Vec2] | null;
  /** Half-width of the drawn bond, covering double-bond spacing and wedge flare. */
  bondHalfWidth(bondId: number): number;
}

export type ObstacleClass =
  | 'bond'
  | 'label'
  | 'charge'
  | 'lone-pair'
  | 'radical'
  | 'arrow';

export type Obstacle =
  | { id: string; cls: ObstacleClass; shape: 'capsule'; capsule: Capsule }
  | { id: string; cls: ObstacleClass; shape: 'box'; box: Box };

/** A free angular wedge around an atom that an arrow may approach through. */
export interface ApproachSector {
  /** Stable label such as `"atom3@030"`, so metric snapshots stay readable. */
  id: string;
  start: number;
  end: number;
  centre: number;
  /** Unit vector pointing out of the atom along the sector centre. */
  outward: Vec2;
}

export interface SourceAnchor {
  position: Vec2;
  /** Direction the tail should initially travel. */
  outward: Vec2;
  /**
   * How far off `outward` the arrow may actually leave, in radians either side.
   * Enforced when the curve is built, not merely penalised afterwards.
   */
  cone: number;
  /**
   * How far the route must depart from its own chord to read as an arrow
   * rather than as decoration on the bond it came from. Non-zero only for
   * short bond sources, where the chord is barely longer than the arrowhead.
   */
  minimumBulge: number;
  /** Obstacles are ignored within this radius of the anchor. */
  graceRadius: number;
  /** Obstacle ids exempted for this route, e.g. the source bond itself. */
  exempt: ReadonlySet<string>;
}

export interface DestinationAnchor {
  /**
   * Where the curve is routed *to* — the atom's own centre, or the midpoint of
   * a new bond's gap. Never pulled back by a label size.
   *
   * Keeping this free of text metrics is what stops a late or missing
   * measurement from corrupting the whole curve; how much of the arrow a label
   * hides is expressed by `trim` instead.
   */
  position: Vec2;
  /** How far back along the curve the arrowhead tip should sit. */
  trim: number;
  sector: ApproachSector;
  /** Direction the head should be travelling on arrival (into the sector). */
  inward: Vec2;
  /** How far off `inward` the arrow may arrive, in radians either side. */
  cone: number;
  graceRadius: number;
  exempt: ReadonlySet<string>;
  /**
   * True when the user chose this arrival direction by dropping on a lobe,
   * rather than leaving the router free to pick the best-aligned one.
   *
   * A pinned arrival is a much harder problem: the head direction is fixed, so
   * when it faces away from the incoming electrons the arrow has to travel
   * across and curl round the target to enter from the far side. The extra turn
   * points that make that constructible are expensive, and this is what keeps
   * them off the path of every ordinary arrow.
   */
  pinned: boolean;
}

export type RouteClass =
  | 'straight'
  | 'c-positive'
  | 'c-negative'
  | 's-positive-negative'
  | 's-negative-positive';

/**
 * The values a fixture test asserts on and a snapshot records. Deliberately
 * excludes raw `h1`/`h2` — those are an implementation detail of the curve
 * parameterisation, and pinning them would turn every scoring improvement into
 * a failed test.
 */
export interface RouteMetrics {
  obstacleIntersections: number;
  penetrationLength: number;
  headPenetration: number;
  minimumClearance: number;
  clearanceDeficit: number;
  sourceTangentErrorDeg: number;
  headTangentErrorDeg: number;
  pathLengthOverChord: number;
  inflections: number;
  /** Ids of obstacles the route or its head actually touches. */
  collidedWith: string[];
  /**
   * How many curves were built and scored to arrive at this one.
   *
   * A deterministic stand-in for cost. Wall-clock timing in the test
   * environment swings by 3-4x between identical runs, which is far larger
   * than most changes being measured — tuning against it means tuning against
   * noise. The candidate count moves only when the search actually changes.
   */
  candidatesEvaluated: number;
}

/**
 * The first half of a two-segment arrow.
 *
 * Present only on arrows that have to take the long way round. The two halves
 * share a tangent direction at `at`, so the join is smooth — one continuous
 * stroke with an extra bend in it, not two arrows drawn end to end.
 *
 * `h1`/`h2`/`along1`/`along2` on the route itself then describe the *second*
 * half, from `at` to the head. That way the arrowhead trim, which only ever
 * touches the final segment, needs no special case.
 */
export interface RouteLead {
  at: Vec2;
  h1: number;
  h2: number;
  along1: number;
  along2: number;
}

export interface Route {
  /** Set when the arrow needs a second segment to reach its target. */
  /**
   * Interior turn points, in order from the tail.
   *
   * Empty for an ordinary arrow, which is a single cubic. One entry is the
   * familiar two-segment curve. Two entries give the shape a single bend cannot
   * reach at all — a real S made of two C shapes with a straight-ish passage
   * between them — which measurement showed is needed for arrows whose arrival
   * direction the user pinned facing away from the electrons.
   *
   * Each entry describes the segment *ending* at its own `at`, so the last
   * segment runs from the final turn point to the head and is described by the
   * route's own `h1`/`h2`/`along1`/`along2`. Keeping the head on the route
   * itself means the arrowhead trim, which only ever touches the final segment,
   * needs no special case however many segments there are.
   */
  leads?: RouteLead[];
  h1: number;
  h2: number;
  /** Control-point positions along the chord, as a fraction of its length. */
  along1: number;
  along2: number;
  p0: Vec2;
  p1: Vec2;
  polyline: Vec2[];
  head: Vec2[];
  sectorId: string;
  routeClass: RouteClass;
  /** True when no collision-free candidate existed and this is the least bad. */
  fallback: boolean;
  metrics: RouteMetrics;
}

/** One arrow's routing problem, fully resolved to geometry. */
export interface RoutingRequest {
  source: ElectronSource;
  destination: ElectronDestination;
  /** Which side the user's drag swept, if known. Breaks ties only. */
  gestureSide?: -1 | 1;
  /**
   * The arrow being re-routed, when it is already on the canvas.
   *
   * Arrows are obstacles to each other, and without this an arrow would be
   * repelled by the curve it drew last frame — a feedback loop that never
   * settles. Compared by identity, so no id plumbing is needed.
   */
  excludeArrow?: MechanismArrowShape;
}
