import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import {
  approachLobes,
  resolveDestinationAnchors,
  sameRegion,
  sectorContains,
} from 'application/render/mechanism/anchors';
import { routeArrow } from 'application/render/mechanism/route';
import {
  LOBE_RADIUS,
  MIN_LOBE_WIDTH,
} from 'application/render/mechanism/constants';
import type {
  ElectronDestination,
  ElectronSource,
  MechanismStruct,
} from 'application/render/mechanism/types';
import {
  bondIndex,
  protonTransfer,
  ringSweep,
  sn2Backside,
  TEST_OPTIONS,
} from './structures';

/**
 * Approach lobes: the "come in this way" choice offered at the head end of a
 * drag.
 *
 * One per usable wedge, and only when there is more than one. A lobe is a
 * choice; a sole lobe is decoration on a decision already made.
 */

const sn2 = sn2Backside();
const metrics = new AnalyticMechanismMetrics(sn2.struct, TEST_OPTIONS);

const fromHydroxide: ElectronSource = {
  kind: 'lone-pair',
  atomId: sn2.atomId.O,
  pairIdx: 0,
};

const atCarbon: ElectronDestination = { kind: 'atom', atomId: sn2.atomId.C };
const fromHydroxidePosition = metrics.lonePairDots(sn2.atomId.O)[0];
const lobes = approachLobes(
  atCarbon,
  fromHydroxide,
  fromHydroxidePosition,
  sn2.struct,
  metrics,
);

/** Directions blocked at `atomId`, as unit vectors along its bonds. */
function bondDirections(target: MechanismStruct, id: number): Vec2[] {
  const atom = target.atoms.get(id)!;
  const directions: Vec2[] = [];
  target.bonds.forEach((bond) => {
    const otherId =
      bond.begin === id ? bond.end : bond.end === id ? bond.begin : null;
    if (otherId === null) return;
    directions.push(target.atoms.get(otherId)!.pp.sub(atom.pp).normalized());
  });
  return directions;
}

describe('offering the approach', () => {
  it('offers one per wedge at a many-bonded atom', () => {
    expect(lobes.length).toBeGreaterThan(1);
    expect(lobes.length).toBeLessThanOrEqual(
      bondDirections(sn2.struct, sn2.atomId.C).length,
    );
  });

  it('places each lobe just outside the target', () => {
    const target = sn2.struct.atoms.get(sn2.atomId.C)!.pp;
    for (const lobe of lobes) {
      expect(Vec2.dist(lobe.position, target)).toBeCloseTo(LOBE_RADIUS, 9);
    }
  });

  /**
   * A lobe sitting on a bond is worse than no lobe: it invites a drop on a
   * direction the arrow cannot use.
   */
  it('keeps every lobe clear of the bonds at the target', () => {
    for (const lobe of lobes) {
      for (const bond of bondDirections(sn2.struct, sn2.atomId.C)) {
        const alignment = lobe.outward.x * bond.x + lobe.outward.y * bond.y;
        expect(Math.acos(Math.min(1, alignment))).toBeGreaterThanOrEqual(
          MIN_LOBE_WIDTH / 2,
        );
      }
    }
  });

  /**
   * A terminal atom has a single opening, and it is still shown. It is not a
   * choice, but hiding it made the tool feel arbitrary: sometimes a target had
   * drop points and sometimes it had none, with nothing to distinguish them.
   */
  it('still offers the sole way in when there is only one', () => {
    const proton = protonTransfer();
    const protonMetrics = new AnalyticMechanismMetrics(
      proton.struct,
      TEST_OPTIONS,
    );

    expect(
      approachLobes(
        { kind: 'atom', atomId: proton.atomId.H },
        { kind: 'lone-pair', atomId: proton.atomId.O, pairIdx: 0 },
        protonMetrics.lonePairDots(proton.atomId.O)[0],
        proton.struct,
        protonMetrics,
      ),
    ).toHaveLength(1);
  });

  /**
   * A bond has no wedges — the head lands on the line itself — so the choice is
   * which side it comes from. Offering nothing here left the commonest target
   * in a mechanism with no choice at all.
   */
  it('offers both sides of a bond target', () => {
    const bondLobes = approachLobes(
      { kind: 'bond', bondId: bondIndex(sn2.bondId, 'C-Br') },
      fromHydroxide,
      fromHydroxidePosition,
      sn2.struct,
      metrics,
    );

    expect(bondLobes).toHaveLength(2);
    expect(bondLobes.map((lobe) => lobe.side).sort()).toEqual([-1, 1]);
  });

  /**
   * Lone pairs are placed by the same solver that finds these wedges, so it
   * cannot treat them as obstacles itself. They are added afterwards — without
   * that the arrowhead was free to land on top of a lone pair, which in a
   * mechanism means something quite different from pointing at the atom.
   */
  it('will not aim at a lone pair', () => {
    const target = sn2.atomId.Br;
    const brLobes = approachLobes(
      { kind: 'atom', atomId: target },
      fromHydroxide,
      fromHydroxidePosition,
      sn2.struct,
      metrics,
    );

    const centre = sn2.struct.atoms.get(target)!.pp;
    for (const lobe of brLobes) {
      for (const dot of metrics.lonePairDots(target)) {
        const toDot = dot.sub(centre).normalized();
        const alignment = lobe.outward.x * toDot.x + lobe.outward.y * toDot.y;
        expect(Math.acos(Math.min(1, alignment))).toBeGreaterThan(Math.PI / 9);
      }
    }
  });
});

describe('honouring the chosen approach', () => {
  it('takes the arrow in through the wedge that was picked', () => {
    for (const lobe of lobes) {
      const pinned: ElectronDestination = { ...atCarbon, approach: lobe.angle };
      const anchors = resolveDestinationAnchors(
        pinned,
        fromHydroxide,
        fromHydroxidePosition,
        sn2.struct,
        metrics,
        TEST_OPTIONS,
      );

      // The picked wedge is offered first, so it wins whenever it yields a
      // clean arrow. The rest stay behind it: a pin decides between routes
      // that avoid the structure, and can never force one through it.
      expect(anchors.length).toBeGreaterThan(0);
      expect(sectorContains(anchors[0].sector, lobe.angle)).toBe(true);
    }
  });

  it('routes identically twice for the same pinned approach', () => {
    const request = {
      source: fromHydroxide,
      destination: { ...atCarbon, approach: lobes[0].angle },
    };
    const a = routeArrow(request, sn2.struct, metrics, TEST_OPTIONS)!;
    const b = routeArrow(request, sn2.struct, metrics, TEST_OPTIONS)!;

    expect([a.h1, a.h2, a.along1, a.along2]).toEqual([
      b.h1,
      b.h2,
      b.along1,
      b.along2,
    ]);
  });
});

/**
 * Which approaches an arrow can even reach.
 *
 * The rule is not about rings — it is that an arrow may not cross the
 * structure, so both ends have to be on the same side of it. Starting and
 * finishing inside the same ring is perfectly fine; starting outside and
 * finishing inside is not, because every way in cuts a bond.
 */
describe('reachable approaches', () => {
  const ring = ringSweep();
  const ringMetrics = new AnalyticMechanismMetrics(ring.struct, TEST_OPTIONS);
  const ringCarbon = ring.atomId.C0;
  const centre = new Vec2(0, 0);

  /** The lobes offered at the ring carbon for an arrow starting at `from`. */
  function lobesFrom(from: Vec2) {
    return approachLobes(
      { kind: 'atom', atomId: ringCarbon },
      { kind: 'lone-pair', atomId: ring.atomId.O, pairIdx: 0 },
      from,
      ring.struct,
      ringMetrics,
    );
  }

  /** Whether a lobe sits inside the ring. */
  function inward(lobe: { position: Vec2 }) {
    return (
      Vec2.dist(lobe.position, centre) <
      Vec2.dist(ring.struct.atoms.get(ringCarbon)!.pp, centre)
    );
  }

  it('will not offer a way in that the arrow would have to cut a bond to reach', () => {
    const outside = ringMetrics.lonePairDots(ring.atomId.O)[0];
    expect(lobesFrom(outside).some(inward)).toBe(false);
  });

  /**
   * The case the outward-probe version got wrong: it assumed every arrow comes
   * from outside, so it pruned exactly the approaches an arrow already inside
   * the ring needs.
   */
  /**
   * The case the outward-probe version got wrong: it assumed every arrow comes
   * from outside, so it pruned exactly the approaches an arrow already inside
   * the ring needs. Asserted on the rule directly, because a ring carbon offers
   * only one way in from the inside and a single option is never shown.
   */
  it('treats the inside of a ring as reachable from the inside', () => {
    const carbon = ring.struct.atoms.get(ringCarbon)!.pp;
    const inwards = centre.sub(carbon).normalized();
    const insideTheRing = carbon.addScaled(inwards, LOBE_RADIUS);

    expect(sameRegion(centre, insideTheRing, ring.struct)).toBe(true);
  });

  it('does not treat it as reachable from outside', () => {
    const carbon = ring.struct.atoms.get(ringCarbon)!.pp;
    const inwards = centre.sub(carbon).normalized();
    const insideTheRing = carbon.addScaled(inwards, LOBE_RADIUS);
    const outside = ringMetrics.lonePairDots(ring.atomId.O)[0];

    expect(sameRegion(outside, insideTheRing, ring.struct)).toBe(false);
  });

  /**
   * An open chain encloses nothing, so every point beside it is reachable from
   * every other. This falls out rather than being special-cased: a ray crossing
   * an open chain always crosses it an even number of times.
   *
   * Measured a little off each atom, never at one. A point sitting exactly on a
   * vertex is on the boundary itself, where "which side" has no answer — and
   * the rule is only ever asked about lobe positions and tail anchors, which
   * are off it.
   */
  it('puts every point beside an acyclic structure in one region', () => {
    const chain = protonTransfer();
    const faraway = new Vec2(100, 100);

    for (const atom of chain.struct.atoms.values()) {
      const beside = atom.pp.add(new Vec2(0.3, 0.3));
      expect(sameRegion(beside, faraway, chain.struct)).toBe(true);
    }
  });
});
