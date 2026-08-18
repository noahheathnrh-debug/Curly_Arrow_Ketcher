import { RxnArrow, RxnArrowMode, Struct, Vec2 } from 'domain/entities';
import { KetSerializer } from 'domain/serializers';

/**
 * Mechanism arrows carry chemistry on the entity itself — which lone pair the
 * tail hangs off, where the electrons land, and the second curvature handle.
 * Before this suite existed, `prepareStructForKet` wrote only
 * `{mode, pos, height}`, so every save/load silently reverted a curly arrow to
 * an anchorless quadratic. These tests pin the round trip.
 */

const ket = new KetSerializer();

function roundTrip(arrow: RxnArrow): RxnArrow {
  const struct = new Struct();
  struct.addRxnArrow(arrow);

  const restored = ket.deserialize(ket.serialize(struct));
  const arrows = Array.from(restored.rxnArrows.values());
  expect(arrows).toHaveLength(1);
  return arrows[0];
}

describe('KET round trip for mechanism arrows', () => {
  it('preserves the cubic second curvature handle', () => {
    const result = roundTrip(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(1, 2), new Vec2(4, 5)],
        height: 0.31,
        height2: -0.42,
      }),
    );

    expect(result.height).toBeCloseTo(0.31);
    expect(result.height2).toBeCloseTo(-0.42);
  });

  it('preserves a lone pair tail anchor', () => {
    const result = roundTrip(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(0, 0), new Vec2(2, 0)],
        lpAttach: { atomId: 3, pairIdx: 2 },
      }),
    );

    expect(result.lpAttach).toEqual({ atomId: 3, pairIdx: 2 });
  });

  it('preserves a radical tail anchor on a fishhook arrow', () => {
    const result = roundTrip(
      new RxnArrow({
        mode: RxnArrowMode.FishhookMechanism,
        pos: [new Vec2(0, 0), new Vec2(2, 0)],
        raAttach: { atomId: 5, radicalIdx: 0 },
      }),
    );

    expect(result.raAttach).toEqual({ atomId: 5, radicalIdx: 0 });
  });

  it('preserves a bond tail anchor with its side and component', () => {
    const result = roundTrip(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(0, 0), new Vec2(2, 0)],
        bdAttach: { bondId: 4, side: -1, component: 'pi' },
      }),
    );

    expect(result.bdAttach).toEqual({ bondId: 4, side: -1, component: 'pi' });
  });

  it.each([
    ['atom', { kind: 'atom', atomId: 7 }],
    ['bond', { kind: 'bond', bondId: 2, side: 1 }],
    ['new-bond', { kind: 'new-bond', atomId1: 3, atomId2: 8 }],
  ] as const)('preserves a %s destination anchor', (_kind, destAttach) => {
    const result = roundTrip(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(0, 0), new Vec2(2, 0)],
        destAttach,
      }),
    );

    expect(result.destAttach).toEqual(destAttach);
  });

  it('preserves a manual curve edit by keeping autoRoute false', () => {
    const result = roundTrip(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(0, 0), new Vec2(2, 0)],
        autoRoute: false,
      }),
    );

    expect(result.autoRoute).toBe(false);
  });

  it('defaults autoRoute to true for a freshly drawn mechanism arrow', () => {
    const result = roundTrip(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(0, 0), new Vec2(2, 0)],
      }),
    );

    expect(result.autoRoute).toBe(true);
  });

  it('leaves plain reaction arrows without mechanism fields', () => {
    const result = roundTrip(
      new RxnArrow({
        mode: RxnArrowMode.OpenAngle,
        pos: [new Vec2(0, 0), new Vec2(2, 0)],
      }),
    );

    expect(result.mode).toBe(RxnArrowMode.OpenAngle);
    expect(result.autoRoute).toBeUndefined();
    expect(result.height2).toBeUndefined();
    expect(result.destAttach).toBeUndefined();
  });

  it('round trips arrow positions through the Y-axis inversion', () => {
    const result = roundTrip(
      new RxnArrow({
        mode: RxnArrowMode.CurlyMechanism,
        pos: [new Vec2(1.5, -2.5), new Vec2(4, 5)],
      }),
    );

    expect(result.pos[0].x).toBeCloseTo(1.5);
    expect(result.pos[0].y).toBeCloseTo(-2.5);
    expect(result.pos[1].x).toBeCloseTo(4);
    expect(result.pos[1].y).toBeCloseTo(5);
  });
});
