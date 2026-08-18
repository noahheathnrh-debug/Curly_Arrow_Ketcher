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

import {
  fromArrowAddition,
  getLonePairModelPositions,
  getRadicalModelPositions,
  routeArrow,
  approachLobes,
  departureLobes,
  resolveSourceAnchor,
  buildObstacles,
  cubicControlPoints,
  LENGTH_LIMIT_OFFSET,
  LENGTH_LIMIT_SCALE,
  MECH_ARROW_COLOR,
  RenderMechanismMetrics,
  type ApproachLobe,
  type Obstacle,
  type Route,
  type BondAttachment,
  type ElectronDestination,
  type ElectronSource,
  type LonePairAttachment,
  type MechanismStruct,
  type RadicalAttachment,
  RxnArrowMode,
  CoordinateTransformation,
  Vec2,
  Scale,
  type Render,
} from 'ketcher-core';
import type Editor from '../Editor';
import type { Tool } from './Tool';

type RaphaelArtifact = { remove: () => void; [key: string]: unknown };

/** Whatever `findItem` hands back — an atom or bond hit, or nothing. */
type FoundItem = ReturnType<Editor['findItem']>;

/**
 * Minimum pointer travel, in screen pixels, before a drag counts as drawing an
 * arrow rather than a stray click.
 *
 * This replaces a model-space test on the distance between the *snapped*
 * endpoints. That test was structurally broken for one of the commonest
 * mechanism arrows: from a bond's midpoint to one of that bond's own atoms the
 * snapped distance is `halfBondLength - atomRadius`, roughly 0.2-0.29 model
 * units, always below the old 0.3 threshold. Every SN2 leaving-group arrow was
 * silently discarded. What the guard is actually for is rejecting accidental
 * clicks, and that is a property of the gesture, not of the chemistry.
 */
const MIN_DRAG_DISTANCE_PX = 8;

/** Don't grab a lone pair on the far side of an atom from the cursor. */
const MAX_GRAB_DISTANCE = 0.55;

/** Which electrons the arrow comes from — settled the moment the drag starts. */
interface DragSource {
  p0: Vec2;
  source: ElectronSource;
  lpAttach: LonePairAttachment | null;
  raAttach: RadicalAttachment | null;
  bdAttach: BondAttachment | null;
}

interface DragContext extends DragSource {
  startScreen: { x: number; y: number };
  /** Model-space pointer samples, used only to break ties on curve side. */
  samples: Vec2[];
  previewEl: RaphaelArtifact | null;
  /**
   * Built once when the drag starts. The structure cannot change mid-drag, so
   * rebuilding this every frame would be pure waste.
   */
  obstacles: Obstacle[];
  metrics: RenderMechanismMetrics;
  /** Pending frame, so the preview recomputes at most once per repaint. */
  frame: number | null;
  lastEvent: PointerEvent | null;
  /**
   * Which approaches turn out to need the long way round, by target and lobe.
   *
   * Answering that means routing to the lobe, which is far too much to redo on
   * every frame — but the answer only depends on the target and the tail, and
   * the tail is fixed for the whole drag. So each target is costed once, the
   * first time the pointer reaches it.
   */
  detours: Map<string, boolean>;
}

class CurlyArrowTool implements Tool {
  private readonly editor: Editor;
  private dragCtx: DragContext | null = null;
  private hoverEl: RaphaelArtifact | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.editor.selection(null);
  }

  // ─── idle hover ────────────────────────────────────────────────────────────

  mousemove(event: PointerEvent) {
    if (this.dragCtx) {
      this.dragCtx.samples.push(
        CoordinateTransformation.pageToModel(event, this.editor.render),
      );
      this._schedulePreview(event);
      return true;
    }

    if (this.hoverEl) {
      this.hoverEl.remove();
      this.hoverEl = null;
    }

    const render = this.editor.render;
    const molecule = render.ctab.molecule;
    const ci = this.editor.findItem(event, ['atoms', 'bonds']);

    if (ci && ci.map === 'atoms') {
      const positions = this._attachmentPositions(ci.id);
      if (positions.length > 0) {
        this.editor.hover(ci, null, event);
        this.hoverEl = this._drawLpHover(positions, render);
      } else {
        this.editor.hover(null);
      }
    } else if (ci && ci.map === 'bonds') {
      const bond = molecule.bonds.get(ci.id);
      const a1 = bond && molecule.atoms.get(bond.begin);
      const a2 = bond && molecule.atoms.get(bond.end);
      if (a1 && a2) {
        this.editor.hover(ci, null, event);

        // Which side of the bond the tail leaves from is decided by which side
        // was pressed on. Showing both makes that a visible choice rather than
        // something the user has to already know.
        const cursor = CoordinateTransformation.pageToModel(event, render);
        const departures = departureLobes(
          { kind: 'bond', bondId: ci.id },
          new RenderMechanismMetrics(render),
        );

        const set = render.paper.set();
        set.push(this._drawDotHover(Vec2.centre(a1.pp, a2.pp), render));
        // Unconditionally the nearest, to match what pressing here would
        // actually pick — the side is decided by which side of the bond the
        // press lands on, so there is no "neither" for the display to show.
        this._drawLobes(
          departures,
          this._nearestLobe(departures, cursor),
          set as unknown as RaphaelArtifact,
          render,
        );
        this.hoverEl = set as unknown as RaphaelArtifact;
      } else {
        this.editor.hover(null);
      }
    } else {
      this.editor.hover(null);
    }

    return true;
  }

  // ─── start drag ────────────────────────────────────────────────────────────

  mousedown(event: PointerEvent) {
    const render = this.editor.render;
    const molecule = render.ctab.molecule;
    const ci = this.editor.findItem(event, ['atoms', 'bonds']);
    const cursor = CoordinateTransformation.pageToModel(event, render);

    let context: DragSource | null = null;

    if (ci && ci.map === 'atoms') {
      context = this._grabNonBondingSource(ci.id, cursor);
    } else if (ci && ci.map === 'bonds') {
      const bond = molecule.bonds.get(ci.id);
      const a1 = bond && molecule.atoms.get(bond.begin);
      const a2 = bond && molecule.atoms.get(bond.end);

      if (a1 && a2) {
        const side = sideOfLine(a1.pp, a2.pp, cursor);
        context = {
          p0: Vec2.centre(a1.pp, a2.pp),
          source: { kind: 'bond', bondId: ci.id, side },
          lpAttach: null,
          raAttach: null,
          bdAttach: { bondId: ci.id, side },
        };
      }
    }

    if (!context) return true;

    if (this.hoverEl) {
      this.hoverEl.remove();
      this.hoverEl = null;
    }
    this.editor.hover(null);

    // The structure cannot change mid-drag, so the obstacle set is built once
    // here rather than on every frame of the preview.
    const metrics = new RenderMechanismMetrics(render);
    this.dragCtx = {
      ...context,
      startScreen: { x: event.clientX, y: event.clientY },
      samples: [],
      previewEl: null,
      metrics,
      obstacles: buildObstacles(
        molecule as unknown as MechanismStruct,
        metrics,
      ),
      frame: null,
      lastEvent: null,
      detours: new Map(),
    };
    return true;
  }

  // ─── commit ────────────────────────────────────────────────────────────────

  mouseup(event: PointerEvent) {
    const drag = this.dragCtx;
    if (!drag) return true;

    if (drag.frame !== null) cancelAnimationFrame(drag.frame);
    if (drag.previewEl) drag.previewEl.remove();
    this.dragCtx = null;

    const travel = Math.hypot(
      event.clientX - drag.startScreen.x,
      event.clientY - drag.startScreen.y,
    );
    if (travel < MIN_DRAG_DISTANCE_PX) return true;

    const render = this.editor.render;
    const target = this._destinationAt(event, drag);
    const mode = drag.raAttach
      ? RxnArrowMode.FishhookMechanism
      : RxnArrowMode.CurlyMechanism;

    // A mechanism arrow exists to say where a specific pair of electrons went.
    // An arrow to nowhere says nothing, so a drop with no chemical target under
    // the pointer is discarded rather than committed as a free-floating curve —
    // the ordinary reaction-arrow tools are the way to draw one of those.
    if (!target) return true;
    const destination = target.destination;

    const route = routeArrow(
      {
        source: drag.source,
        destination,
        gestureSide: this._gestureSide(drag),
      },
      render.ctab.molecule as unknown as MechanismStruct,
      drag.metrics,
      render.options,
      drag.obstacles,
    );
    if (!route) return true;

    this.editor.update(
      fromArrowAddition(
        render.ctab,
        [route.p0, route.p1],
        mode,
        drag.lpAttach ?? undefined,
        drag.raAttach ?? undefined,
        route.h1,
        route.h2,
        {
          along1: route.along1,
          along2: route.along2,
          bdAttach: drag.bdAttach ?? undefined,
          destAttach: destination,
          autoRoute: true,
        },
      ),
    );
    return true;
  }

  cancel() {
    if (this.hoverEl) {
      this.hoverEl.remove();
      this.hoverEl = null;
    }
    if (this.dragCtx?.frame != null) cancelAnimationFrame(this.dragCtx.frame);
    if (this.dragCtx?.previewEl) this.dragCtx.previewEl.remove();
    this.dragCtx = null;
    this.editor.hover(null);
  }

  // ─── source resolution ─────────────────────────────────────────────────────

  private _attachmentPositions(atomId: number): Vec2[] {
    const { lonePairs, radicals } = this._nonBondingPositions(atomId);
    return [...lonePairs, ...radicals];
  }

  private _nonBondingPositions(atomId: number): {
    lonePairs: Vec2[];
    radicals: Vec2[];
  } {
    const render = this.editor.render;
    const molecule = render.ctab.molecule;
    const atom = molecule.atoms.get(atomId);
    if (!atom) return { lonePairs: [], radicals: [] };

    const reAtom = render.ctab.atoms.get(atomId);
    const args = [
      atom,
      molecule,
      atomId,
      render.options,
      reAtom?.hydrogenOnTheLeft,
      reAtom?.cachedLabelHalfSize || undefined,
    ] as const;

    return {
      lonePairs: getLonePairModelPositions(...args),
      radicals: getRadicalModelPositions(...args),
    };
  }

  /**
   * Pick the lone pair or radical dot nearest the cursor.
   *
   * Both kinds compete on distance so that an atom carrying a radical *and*
   * lone pairs lets you drag either. The grab radius stops a click on one side
   * of an atom from silently anchoring to a pair on the opposite side.
   */
  private _grabNonBondingSource(
    atomId: number,
    cursor: Vec2,
  ): DragSource | null {
    const { lonePairs, radicals } = this._nonBondingPositions(atomId);

    let best: { position: Vec2; isRadical: boolean; index: number } | null =
      null;
    let bestDistance = MAX_GRAB_DISTANCE;

    lonePairs.forEach((position, index) => {
      const distance = Vec2.dist(cursor, position);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { position, isRadical: false, index };
      }
    });
    radicals.forEach((position, index) => {
      const distance = Vec2.dist(cursor, position);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = { position, isRadical: true, index };
      }
    });

    if (!best) return null;
    const grabbed = best as {
      position: Vec2;
      isRadical: boolean;
      index: number;
    };

    if (grabbed.isRadical) {
      return {
        p0: grabbed.position,
        source: { kind: 'radical', atomId, radicalIdx: grabbed.index },
        lpAttach: null,
        raAttach: { atomId, radicalIdx: grabbed.index },
        bdAttach: null,
      };
    }

    return {
      p0: grabbed.position,
      source: { kind: 'lone-pair', atomId, pairIdx: grabbed.index },
      lpAttach: { atomId, pairIdx: grabbed.index },
      raAttach: null,
      bdAttach: null,
    };
  }

  // ─── destination resolution ────────────────────────────────────────────────

  /**
   * Turn whatever is under the pointer into a chemical destination.
   *
   * The distinction that matters is between electrons *arriving on* an atom
   * and electrons *forming a bond to* it. Dropping on an atom that already
   * belongs to the source bond is a cleavage — the electrons become a lone
   * pair there. Dropping anywhere else means a new bond, which puts the
   * arrowhead in the gap between the two atoms rather than on the nucleus.
   */
  private _resolveDestination(
    ci: { map?: string; id?: number } | null,
    source: ElectronSource,
  ): ElectronDestination | null {
    if (!ci || ci.id === undefined) return null;
    const molecule = this.editor.render.ctab.molecule;

    if (ci.map === 'bonds') {
      const bond = molecule.bonds.get(ci.id);
      if (!bond) return null;
      return { kind: 'bond', bondId: ci.id };
    }

    if (ci.map !== 'atoms') return null;
    const targetId = ci.id;
    if (!molecule.atoms.get(targetId)) return null;

    if (source.kind === 'bond') {
      const bond = molecule.bonds.get(source.bondId);
      if (!bond) return null;

      // Heterolytic cleavage: the electrons stay on one of the bond's own atoms.
      if (bond.begin === targetId || bond.end === targetId) {
        return { kind: 'atom', atomId: targetId };
      }

      // A 1,2-shift. The migrating atom is the end of the source bond that
      // carries the least else — the H in a hydride shift, the methyl in an
      // alkyl shift — and it is that atom which acquires the new bond.
      const migrating = this._lessConnectedAtom(bond.begin, bond.end);
      return { kind: 'new-bond', atomId1: migrating, atomId2: targetId };
    }

    if (source.atomId === targetId) return null;
    return { kind: 'new-bond', atomId1: source.atomId, atomId2: targetId };
  }

  // ─── approach lobes ────────────────────────────────────────────────────────

  /**
   * The destination under the pointer, together with the way round the arrow
   * would come in.
   *
   * Preview and commit both go through here, so what is released on is exactly
   * what was on screen. The side is chosen the same way a lone pair is chosen
   * at the other end of the arrow — by which discrete target the cursor is
   * nearest — rather than from a continuous angle, so the same drop always
   * produces the same arrow.
   */
  private _destinationAt(
    event: PointerEvent,
    drag: DragContext,
  ): {
    item: FoundItem;
    /** The target before any approach was pinned onto it. */
    base: ElectronDestination;
    destination: ElectronDestination;
    lobes: ApproachLobe[];
    chosen: ApproachLobe | null;
  } | null {
    const item = this.editor.findItem(event, ['atoms', 'bonds']);
    const base = this._resolveDestination(item, drag.source);
    if (!base) return null;

    const render = this.editor.render;
    const struct = render.ctab.molecule as unknown as MechanismStruct;

    // The router's own tail anchor, not `drag.p0`. For a bond source those
    // differ in exactly the way that matters here: `p0` is the bond midpoint,
    // which lies *on* the structure, and asking which side of a ring a point on
    // the ring is on has no answer. The anchor is offset to the side the drag
    // began, which is the side the arrow actually leaves from.
    const anchor = resolveSourceAnchor(
      drag.source,
      struct,
      drag.metrics,
      render.options,
    );

    const lobes = approachLobes(
      base,
      drag.source,
      anchor?.position ?? drag.p0,
      struct,
      drag.metrics,
    );

    // Always the nearest, with no radius to fall outside of.
    //
    // Leaving the cursor "between" the lobes used to mean nothing was pinned,
    // and the router then chose its own aim — which is generally the direction
    // nearest the source rather than the middle of a wedge, so the arrow
    // arrived somewhere no lobe advertised. Pinning unconditionally means every
    // direction the arrow can take is one that is drawn.
    const chosen = this._nearestLobe(
      lobes,
      CoordinateTransformation.pageToModel(event, render),
    );

    // A bond target's lobes name a side of the line, not a wedge around an
    // atom, so the choice is recorded in the field that already means that.
    let destination = base;
    if (chosen) {
      destination =
        base.kind === 'bond'
          ? { ...base, side: chosen.side }
          : { ...base, approach: chosen.angle };
    }

    return { item, base, destination, lobes, chosen };
  }

  /**
   * Whichever lobe is nearest the given point.
   *
   * No radius to fall outside of. There used to be one, and leaving the cursor
   * between the lobes meant no approach was pinned — the router then chose its
   * own aim, which is generally the direction nearest the source rather than
   * the middle of a wedge, so the arrow arrived somewhere no lobe advertised.
   */
  private _nearestLobe(
    lobes: ApproachLobe[],
    cursor: Vec2,
  ): ApproachLobe | null {
    let chosen: ApproachLobe | null = null;
    let nearest = Infinity;

    for (const lobe of lobes) {
      const distance = Vec2.dist(cursor, lobe.position);
      if (distance < nearest) {
        nearest = distance;
        chosen = lobe;
      }
    }

    return chosen;
  }

  /**
   * The lobes, drawn as the choice they are: an outline for each side that is
   * available, filled for the one the cursor has claimed.
   */
  private _drawLobes(
    lobes: ApproachLobe[],
    chosen: ApproachLobe | null,
    set: RaphaelArtifact,
    render: Render,
    longWayRound?: (lobe: ApproachLobe) => boolean,
  ): void {
    const options = render.options;
    const radius = options.microModeScale * 0.1;

    for (const lobe of lobes) {
      const at = Scale.modelToCanvas(lobe.position, options);
      const active = chosen !== null && lobe.angle === chosen.angle;

      // An approach only reachable by going around the whole structure is
      // still offered — it is a legitimate arrow and the choice is the user's —
      // but it is drawn dashed and pale so that the cost is visible before
      // committing rather than after.
      const distant = longWayRound?.(lobe) ?? false;

      // Selected and expensive are independent: fill says which one is chosen,
      // the dashes say what it costs. Conflating them left a chosen lobe that
      // happened to need the long way round looking exactly like an unchosen
      // one, so nothing appeared selected at all.
      (set as unknown as { push: (element: unknown) => void }).push(
        render.paper.circle(at.x, at.y, radius).attr({
          fill: active ? MECH_ARROW_COLOR : 'none',
          stroke: MECH_ARROW_COLOR,
          'stroke-width': active ? 1.5 : 1,
          'stroke-dasharray': distant ? '2,2' : '',
          opacity: active ? (distant ? 0.6 : 0.85) : distant ? 0.3 : 0.45,
        }),
      );
    }
  }

  /**
   * Whether reaching this approach means going the long way round.
   *
   * Measured from the route itself rather than guessed from the geometry: an
   * arrow that has to turn at a waypoint, or that travels far further than the
   * distance between its own ends, is one the user should see marked before
   * they release on it.
   *
   * Cached per target for the life of the drag; the tail never moves, so the
   * answer cannot change.
   */
  private _needsDetour(
    drag: DragContext,
    base: ElectronDestination,
    lobe: ApproachLobe,
    render: Render,
  ): boolean {
    const key = `${JSON.stringify(base)}|${lobe.angle.toFixed(4)}`;
    const cached = drag.detours.get(key);
    if (cached !== undefined) return cached;

    const destination =
      base.kind === 'bond'
        ? { ...base, side: lobe.side }
        : { ...base, approach: lobe.angle };

    const route = routeArrow(
      { source: drag.source, destination },
      render.ctab.molecule as unknown as MechanismStruct,
      drag.metrics,
      render.options,
      drag.obstacles,
    );

    const wanders =
      route !== null &&
      (route.leads !== undefined && route.leads.length > 0) ||
      (route !== null &&
        route.metrics.pathLengthOverChord * Vec2.dist(route.p0, route.p1) >
          LENGTH_LIMIT_SCALE * Vec2.dist(route.p0, route.p1) +
            LENGTH_LIMIT_OFFSET);

    drag.detours.set(key, wanders);
    return wanders;
  }

  private _lessConnectedAtom(a: number, b: number): number {
    const molecule = this.editor.render.ctab.molecule;
    const degree = (atomId: number) => {
      let count = 0;
      molecule.bonds.forEach((bond) => {
        if (bond.begin === atomId || bond.end === atomId) count++;
      });
      return count;
    };
    return degree(a) <= degree(b) ? a : b;
  }

  /**
   * Which side the pointer swept, expressed in the same sign convention as the
   * curve offsets. Only ever breaks ties between otherwise equal routes — a
   * gesture never justifies crossing a bond.
   */
  private _gestureSide(drag: DragContext): -1 | 1 | undefined {
    const last = drag.samples[drag.samples.length - 1];
    if (!last || drag.samples.length < 3) return undefined;

    const chord = last.sub(drag.p0);
    const length = chord.length();
    if (length < 1e-6) return undefined;

    const dir = chord.scaled(1 / length);
    let total = 0;
    for (const sample of drag.samples) {
      const offset = sample.sub(drag.p0);
      total += dir.x * offset.y - dir.y * offset.x;
    }

    if (Math.abs(total) < 1e-9) return undefined;
    // perp is (dir.y, -dir.x), so an offset along +perp yields a negative cross.
    return total < 0 ? 1 : -1;
  }

  // ─── preview ───────────────────────────────────────────────────────────────

  /**
   * Recompute the preview at most once per repaint.
   *
   * Pointer moves fire far more often than the screen refreshes, so routing on
   * every one would do the same work several times over for a single visible
   * frame.
   */
  private _schedulePreview(event: PointerEvent) {
    const drag = this.dragCtx;
    if (!drag) return;

    drag.lastEvent = event;
    if (drag.frame !== null) return;

    drag.frame = requestAnimationFrame(() => {
      if (!this.dragCtx) return;
      this.dragCtx.frame = null;
      const pending = this.dragCtx.lastEvent;
      if (pending) this._updateDragPreview(pending);
    });
  }

  /**
   * Draw the arrow the user is actually going to get.
   *
   * Previously this drew a fixed-curvature placeholder that bore no relation to
   * the committed result, so releasing the mouse replaced one curve with a
   * different one and the outcome felt arbitrary. Running the real router here
   * means the preview *is* the arrow: where the head lands, which way it bends
   * and which approach it takes are all visible before letting go.
   *
   * It also makes the tool legible. Dragging past a point where a different
   * route becomes better shows the arrow visibly switch, which is the system
   * showing its reasoning rather than hiding it.
   */
  private _updateDragPreview(event: PointerEvent) {
    const drag = this.dragCtx;
    if (!drag) return;

    const render = this.editor.render;
    const options = render.options;

    if (drag.previewEl) drag.previewEl.remove();
    drag.previewEl = null;

    const target = this._destinationAt(event, drag);
    this.editor.hover(target ? target.item : null, null, event);

    const route = target
      ? routeArrow(
          {
            source: drag.source,
            destination: target.destination,
            gestureSide: this._gestureSide(drag),
          },
          render.ctab.molecule as unknown as MechanismStruct,
          drag.metrics,
          options,
          drag.obstacles,
        )
      : null;

    if (!route || !target) {
      drag.previewEl = this._drawUnanchoredPreview(drag, event, render);
      return;
    }

    const set = this._drawRoutePreview(route, render);

    // Highlight the approach the arrow *actually took*, not the one the cursor
    // is nearest. A pinned approach is only a preference among routes that
    // avoid the structure, so it can be overruled — and when it is, showing the
    // cursor's pick lit up says the opposite of what is about to happen.
    this._drawLobes(
      target.lobes,
      this._nearestLobe(target.lobes, route.p1),
      set,
      render,
      (lobe) => this._needsDetour(drag, target.base, lobe, render),
    );
    drag.previewEl = set;
  }

  /** The real routed curve, plus its head, in the colour it will commit as. */
  private _drawRoutePreview(route: Route, render: Render): RaphaelArtifact {
    const options = render.options;
    const paper = render.paper;
    const set = paper.set();

    const toCanvas = (v: Vec2) => Scale.modelToCanvas(v, options);
    const at = (v: Vec2) => `${toCanvas(v).x},${toCanvas(v).y}`;

    // An arrow that takes the long way round turns at one or more waypoints, so
    // the preview has to draw every segment — otherwise the shape under the
    // cursor is not the shape that gets committed.
    const turnPoints = route.leads ?? [];
    const start = turnPoints.length
      ? turnPoints[turnPoints.length - 1].at
      : route.p0;
    let shaft = `M${at(route.p0)}`;

    let from = route.p0;
    for (const turnPoint of turnPoints) {
      const [l1, l2] = cubicControlPoints(
        from,
        turnPoint.at,
        turnPoint.h1,
        turnPoint.h2,
        turnPoint.along1,
        turnPoint.along2,
      );
      shaft += `C${at(l1)},${at(l2)},${at(turnPoint.at)}`;
      from = turnPoint.at;
    }

    const [c1, c2] = cubicControlPoints(
      start,
      route.p1,
      route.h1,
      route.h2,
      route.along1,
      route.along2,
    );
    shaft += `C${at(c1)},${at(c2)},${at(route.p1)}`;

    set.push(
      paper.path(shaft).attr({
        stroke: MECH_ARROW_COLOR,
        fill: 'none',
        'stroke-width': options.lineWidth * 0.75,
        'stroke-linecap': 'round',
        opacity: 0.75,
      }),
    );

    const head = route.head.map(toCanvas);
    set.push(
      paper
        .path(
          `M${head[0].x},${head[0].y}` +
            head
              .slice(1)
              .map((point) => `L${point.x},${point.y}`)
              .join('') +
            'Z',
        )
        .attr({ fill: MECH_ARROW_COLOR, stroke: 'none', opacity: 0.75 }),
    );

    return set;
  }

  /**
   * Nothing valid under the pointer. Shown grey and thin, because releasing
   * here discards the drag — a confident-looking arrow that then vanished
   * would read as a bug.
   */
  private _drawUnanchoredPreview(
    drag: DragContext,
    event: PointerEvent,
    render: Render,
  ): RaphaelArtifact {
    const options = render.options;

    const p0c = Scale.modelToCanvas(drag.p0, options);
    const p1c = Scale.modelToCanvas(
      CoordinateTransformation.pageToModel(event, render),
      options,
    );

    const dx = p1c.x - p0c.x;
    const dy = p1c.y - p0c.y;
    const len = Math.hypot(dx, dy) || 1;
    const side = this._gestureSide(drag) ?? 1;
    const curv = len * 0.25;
    const cpX = (p0c.x + p1c.x) / 2 + (dy / len) * side * curv;
    const cpY = (p0c.y + p1c.y) / 2 + (-dx / len) * side * curv;

    return render.paper
      .path(`M${p0c.x},${p0c.y}Q${cpX},${cpY},${p1c.x},${p1c.y}`)
      .attr({
        stroke: '#b0b0b0',
        fill: 'none',
        'stroke-dasharray': '4,2',
        'stroke-width': 1.5,
      });
  }

  /** Draw highlight circles at each lone pair / radical position. */
  private _drawLpHover(positions: Vec2[], render: Render): RaphaelArtifact {
    const paper = render.paper;
    const options = render.options;
    const sizeFactor = Math.max(1, options.lonePairSize ?? 4);
    const dotRadius = options.lineWidth * 0.9 * (sizeFactor / 4);
    const r = dotRadius * 2.2;
    const set = paper.set();

    for (const pos of positions) {
      const c = Scale.modelToCanvas(pos, options);
      set.push(
        paper.circle(c.x, c.y, r).attr({
          stroke: '#1a75ff',
          fill: '#1a75ff',
          'fill-opacity': 0.55,
          'stroke-width': 0,
        }),
      );
    }
    return set;
  }

  /** Draw a highlight circle at a bond midpoint. */
  private _drawDotHover(modelPos: Vec2, render: Render): RaphaelArtifact {
    const paper = render.paper;
    const options = render.options;
    const c = Scale.modelToCanvas(modelPos, options);

    return paper.circle(c.x, c.y, options.fontszInPx * 0.45).attr({
      stroke: '#1a75ff',
      fill: '#1a75ff',
      'fill-opacity': 0.2,
      'stroke-width': 1.5,
    });
  }
}

/** Which side of the directed line a->b the point lies on. */
function sideOfLine(a: Vec2, b: Vec2, point: Vec2): -1 | 1 {
  const axis = b.sub(a);
  const offset = point.sub(a);
  // Matches `perpendicularOfChord`: an offset along +perp gives a negative cross.
  return axis.x * offset.y - axis.y * offset.x < 0 ? 1 : -1;
}

export default CurlyArrowTool;
