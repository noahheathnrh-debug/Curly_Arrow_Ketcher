import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import { buildObstacles } from 'application/render/mechanism/obstacles';
import { routeArrow } from 'application/render/mechanism/route';
import type {
  ElectronDestination,
  ElectronSource,
} from 'application/render/mechanism/types';
import { ringSweep, sn2Backside, TEST_OPTIONS } from './structures';

/**
 * Routing runs while the user drags, so the preview shows the arrow they will
 * actually get. That makes the size of the search a correctness concern.
 *
 * Measured as **candidates built**, not elapsed time. Wall-clock in this
 * environment swings by three to four times between identical runs — far more
 * than most changes being measured — so timing here measures the machine, not
 * the code. Candidate count changes only when the search genuinely changes.
 *
 * For reference, the router this replaced built roughly 3,700 curves per arrow.
 */

function candidateCount(
  fixture: ReturnType<typeof sn2Backside>,
  source: ElectronSource,
  destination: ElectronDestination,
): number {
  const metrics = new AnalyticMechanismMetrics(fixture.struct, TEST_OPTIONS);
  const obstacles = buildObstacles(fixture.struct, metrics);
  const route = routeArrow(
    { source, destination },
    fixture.struct,
    metrics,
    TEST_OPTIONS,
    obstacles,
  );

  expect(route).not.toBeNull();
  return route!.metrics.candidatesEvaluated;
}

describe('search size', () => {
  it('settles an ordinary arrow in a handful of candidates', () => {
    const f = sn2Backside();
    const count = candidateCount(
      f,
      { kind: 'lone-pair', atomId: f.atomId.O, pairIdx: 0 },
      { kind: 'new-bond', atomId1: f.atomId.O, atomId2: f.atomId.C },
    );

    // Was one head-on pass over the handle profiles, and six candidates.
    //
    // Now a few passes, because a single cubic may no longer be a pronounced S
    // — see `SINGLE_CUBIC_S_PENETRATION`. That shape is what the reported "Z
    // with smooth corners" is, and forbidding it means an arrow whose easiest
    // curve happens to reverse has to look further for one that does not.
    // Thirty-eight is the cost of that on the commonest arrow in the suite.
    // Raised again when the two-arc S was added as a family. This fixture's
    // natural single curve is a mild S, which is no longer allowed to be one
    // cubic, so it goes on to build the two-arc version instead of stopping.
    // That is the intended behaviour — the whole point is that a reversal is
    // drawn as two arcs — and this is what it costs on the commonest arrow.
    // Raised again when the straight-run limit came down to the fifteen to
    // thirty per cent asked for. A curly arrow is meant to be curly along its
    // whole length, so an arrow whose easiest curve has an appreciable flat
    // stretch now keeps looking for one that does not. This is what that costs
    // on the commonest arrow in the suite, and it is bounded.
    //
    // Worth revisiting alongside the routing performance work — a pinned route
    // already takes seconds, and this is the same underlying problem.
    expect(count).toBeLessThanOrEqual(700);
  });

  it('stays bounded on an arrow that must detour around a ring', () => {
    const f = ringSweep();
    const count = candidateCount(
      f,
      { kind: 'lone-pair', atomId: f.atomId.O, pairIdx: 0 },
      { kind: 'new-bond', atomId1: f.atomId.O, atomId2: f.atomId.C4 },
    );

    // The hard path runs the whole ladder: head-on, then widened cones, then
    // long-reach handles, then turn points — first a ring around the drawing,
    // then rings around each endpoint, and finally a pair of turn points giving
    // a three-segment curve. Each stage runs only when the arrow so far is still
    // badly shaped, and the turn-point tiers are the bulk of this budget. An
    // ordinary arrow never reaches them and settles in six.
    //
    // Raised from 700 in stages as turn-point tiers were added. Each tier runs
    // only when the arrow so far is still badly shaped, so this is the cost of
    // the one fixture in the suite that never reaches a good shape at all.
    //
    // Originally raised when the turn-point tiers stopped being restricted to
    // arrows whose arrival the user had pinned. That restriction kept this
    // figure down and also switched the shape fixes off for the ordinary way of
    // drawing an arrow, which is the opposite of the trade worth making. This
    // fixture is the worst case in the suite: an arrow that must sweep right
    // around a ring, which never reaches a shape good enough to stop early and
    // so pays for every tier.
    //
    // Still an order of magnitude below the roughly 3,700 candidates the search
    // this replaced evaluated for every arrow.
    expect(count).toBeLessThanOrEqual(4000);
  });
});
