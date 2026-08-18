import fs from 'fs';
import path from 'path';
import { Vec2 } from 'domain/entities/vec2';
import { AnalyticMechanismMetrics } from 'application/render/mechanism/metrics';
import { routeArrowSet } from 'application/render/mechanism/route';
import type {
  MechanismStruct,
  Route,
  RoutingRequest,
} from 'application/render/mechanism/types';
import {
  allylResonance,
  bondIndex,
  carbocationAttack,
  carbonylAddition,
  crossStructureSCurve,
  hydrideShift,
  protonTransfer,
  ringSweep,
  sn2Backside,
  TEST_OPTIONS,
} from './structures';

/**
 * Dev utility: renders every routing fixture to one SVG for eyeballing.
 *
 * This is NOT the product renderer — it draws the same model the router reasons
 * about, so it shows what the router decided rather than what Raphael will
 * paint. Useful for judging whether a route looks right without a full app
 * build; the Playwright suite is what checks the real rendering.
 *
 * Writes only when MECHANISM_PREVIEW is set, so a normal test run is unaffected.
 */

const OUT = process.env.MECHANISM_PREVIEW;
const SCALE = 62;

function pairFacing(struct: MechanismStruct, atomId: number, target: Vec2) {
  const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
  const atom = struct.atoms.get(atomId)!;
  const wanted = target.sub(atom.pp).normalized();

  let best = 0;
  let bestAlignment = -Infinity;
  metrics.lonePairDots(atomId).forEach((dot, index) => {
    const direction = dot.sub(atom.pp).normalized();
    const alignment = direction.x * wanted.x + direction.y * wanted.y;
    if (alignment > bestAlignment) {
      bestAlignment = alignment;
      best = index;
    }
  });
  return best;
}

function panel(
  title: string,
  fixture: { struct: MechanismStruct },
  requests: RoutingRequest[],
): string {
  const { struct } = fixture;
  const metrics = new AnalyticMechanismMetrics(struct, TEST_OPTIONS);
  const routes = routeArrowSet(requests, struct, metrics, TEST_OPTIONS).filter(
    Boolean,
  ) as Route[];

  // Model space has +y downward, matching the canvas, so no flip is needed.
  const points: Vec2[] = [];
  struct.atoms.forEach((atom) => points.push(atom.pp));
  routes.forEach((route) => points.push(...route.polyline, ...route.head));

  const minX = Math.min(...points.map((p) => p.x)) - 0.6;
  const maxX = Math.max(...points.map((p) => p.x)) + 0.6;
  const minY = Math.min(...points.map((p) => p.y)) - 0.9;
  const maxY = Math.max(...points.map((p) => p.y)) + 0.6;

  const X = (v: number) => ((v - minX) * SCALE).toFixed(1);
  const Y = (v: number) => ((v - minY) * SCALE).toFixed(1);

  const parts: string[] = [];
  parts.push(
    `<text x="${X(minX + 0.2)}" y="${Y(
      minY + 0.35,
    )}" font-family="sans-serif" font-size="15" font-weight="600" fill="#333">${title}</text>`,
  );

  struct.bonds.forEach((bond, bondId) => {
    const extent = metrics.bondExtent(bondId);
    if (!extent) return;
    const order = bond.type ?? 1;

    if (order === 2) {
      const axis = extent[1].sub(extent[0]);
      const dir = axis.scaled(1 / (axis.length() || 1));
      const normal = new Vec2(dir.y, -dir.x).scaled(0.06);
      for (const sign of [1, -1]) {
        const a = extent[0].addScaled(normal, sign);
        const b = extent[1].addScaled(normal, sign);
        parts.push(
          `<line x1="${X(a.x)}" y1="${Y(a.y)}" x2="${X(b.x)}" y2="${Y(
            b.y,
          )}" stroke="#111" stroke-width="3" stroke-linecap="round"/>`,
        );
      }
    } else {
      parts.push(
        `<line x1="${X(extent[0].x)}" y1="${Y(extent[0].y)}" x2="${X(
          extent[1].x,
        )}" y2="${Y(
          extent[1].y,
        )}" stroke="#111" stroke-width="3" stroke-linecap="round"/>`,
      );
    }
  });

  struct.atoms.forEach((atom, atomId) => {
    if (metrics.hasLabel(atomId)) {
      parts.push(
        `<circle cx="${X(atom.pp.x)}" cy="${Y(atom.pp.y)}" r="${(
          metrics.labelHalfSize(atomId) * SCALE
        ).toFixed(1)}" fill="#fafafa"/>`,
      );
      parts.push(
        `<text x="${X(atom.pp.x)}" y="${Y(
          atom.pp.y,
        )}" font-family="sans-serif" font-size="20" font-weight="600" fill="#111" text-anchor="middle" dominant-baseline="central">${
          atom.label
        }</text>`,
      );
    }

    const charge = metrics.chargeShape(atomId);
    if (charge) {
      const sign = (atom.charge ?? 0) > 0 ? '+' : '−';
      parts.push(
        `<circle cx="${X(charge.a.x)}" cy="${Y(charge.a.y)}" r="${(
          charge.r * SCALE
        ).toFixed(1)}" fill="none" stroke="#111" stroke-width="1.4"/>`,
      );
      parts.push(
        `<text x="${X(charge.a.x)}" y="${Y(
          charge.a.y,
        )}" font-family="sans-serif" font-size="11" fill="#111" text-anchor="middle" dominant-baseline="central">${sign}</text>`,
      );
    }

    metrics.lonePairDots(atomId).forEach((dot) => {
      parts.push(
        `<circle cx="${X(dot.x)}" cy="${Y(dot.y)}" r="2.6" fill="#8a2be2"/>`,
      );
    });
  });

  routes.forEach((route) => {
    const d = route.polyline
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${X(p.x)},${Y(p.y)}`)
      .join('');
    parts.push(
      `<path d="${d}" fill="none" stroke="#cc0000" stroke-width="2.2" stroke-linecap="round"/>`,
    );
    const head = route.head.map((p) => `${X(p.x)},${Y(p.y)}`).join(' ');
    parts.push(`<polygon points="${head}" fill="#cc0000"/>`);
  });

  const width = (maxX - minX) * SCALE;
  const height = (maxY - minY) * SCALE;
  return `<svg width="${width.toFixed(0)}" height="${height.toFixed(
    0,
  )}" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(
    0,
  )}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#f7f7f7"/>${parts.join(
    '',
  )}</svg>`;
}

/** Skipped unless MECHANISM_PREVIEW names an output directory. */
const previewIt = OUT ? it : it.skip;

describe('mechanism routing preview', () => {
  previewIt('writes an SVG of every fixture', () => {
    const panels: string[] = [];

    {
      const f = carbocationAttack();
      panels.push(
        panel('VT1 — lone pair to carbocation', f, [
          {
            source: {
              kind: 'lone-pair',
              atomId: f.atomId.I,
              pairIdx: pairFacing(
                f.struct,
                f.atomId.I,
                f.struct.atoms.get(f.atomId.C0)!.pp,
              ),
            },
            destination: {
              kind: 'new-bond',
              atomId1: f.atomId.I,
              atomId2: f.atomId.C0,
            },
          },
        ]),
      );
    }

    {
      const f = sn2Backside();
      const cBr = bondIndex(f.bondId, 'C-Br');
      panels.push(
        panel('VT2 — SN2 backside attack', f, [
          {
            source: {
              kind: 'lone-pair',
              atomId: f.atomId.O,
              pairIdx: pairFacing(
                f.struct,
                f.atomId.O,
                f.struct.atoms.get(f.atomId.C)!.pp,
              ),
            },
            destination: {
              kind: 'new-bond',
              atomId1: f.atomId.O,
              atomId2: f.atomId.C,
            },
          },
          {
            source: { kind: 'bond', bondId: cBr },
            destination: { kind: 'atom', atomId: f.atomId.Br },
          },
        ]),
      );
    }

    {
      const f = carbonylAddition();
      const carbonyl = bondIndex(f.bondId, 'C0-O');
      panels.push(
        panel('VT3 — carbonyl addition', f, [
          {
            source: {
              kind: 'lone-pair',
              atomId: f.atomId.Nu,
              pairIdx: pairFacing(
                f.struct,
                f.atomId.Nu,
                f.struct.atoms.get(f.atomId.C0)!.pp,
              ),
            },
            destination: {
              kind: 'new-bond',
              atomId1: f.atomId.Nu,
              atomId2: f.atomId.C0,
            },
          },
          {
            source: {
              kind: 'bond',
              bondId: carbonyl,
              side: -1,
              component: 'pi',
            },
            destination: { kind: 'atom', atomId: f.atomId.O },
          },
        ]),
      );
    }

    {
      const f = hydrideShift();
      panels.push(
        panel('VT5 — 1,2-hydride shift', f, [
          {
            source: { kind: 'bond', bondId: bondIndex(f.bondId, 'C1-H') },
            destination: {
              kind: 'new-bond',
              atomId1: f.atomId.H,
              atomId2: f.atomId.C2,
            },
          },
        ]),
      );
    }

    {
      const f = allylResonance();
      panels.push(
        panel('VT6 — allylic resonance', f, [
          {
            source: {
              kind: 'bond',
              bondId: bondIndex(f.bondId, 'C1-C2'),
              side: 1,
              component: 'pi',
            },
            destination: {
              kind: 'bond',
              bondId: bondIndex(f.bondId, 'C2-C3'),
              side: 1,
            },
          },
        ]),
      );
    }

    {
      const f = protonTransfer();
      panels.push(
        panel('VT7 — proton transfer', f, [
          {
            source: {
              kind: 'lone-pair',
              atomId: f.atomId.O,
              pairIdx: pairFacing(
                f.struct,
                f.atomId.O,
                f.struct.atoms.get(f.atomId.H)!.pp,
              ),
            },
            destination: { kind: 'atom', atomId: f.atomId.H },
          },
          {
            source: { kind: 'bond', bondId: bondIndex(f.bondId, 'H-Br') },
            destination: { kind: 'atom', atomId: f.atomId.Br },
          },
        ]),
      );
    }

    {
      const f = crossStructureSCurve();
      panels.push(
        panel('VT8 — S-curve across two structures', f, [
          {
            source: {
              kind: 'lone-pair',
              atomId: f.atomId.O,
              pairIdx: pairFacing(
                f.struct,
                f.atomId.O,
                f.struct.atoms.get(f.atomId.CH2)!.pp,
              ),
            },
            destination: {
              kind: 'new-bond',
              atomId1: f.atomId.O,
              atomId2: f.atomId.CH2,
            },
          },
        ]),
      );
    }

    {
      const f = ringSweep();
      panels.push(
        panel('VT9 — sweep around a ring', f, [
          {
            source: {
              kind: 'lone-pair',
              atomId: f.atomId.O,
              pairIdx: pairFacing(
                f.struct,
                f.atomId.O,
                f.struct.atoms.get(f.atomId.C4)!.pp,
              ),
            },
            destination: {
              kind: 'new-bond',
              atomId1: f.atomId.O,
              atomId2: f.atomId.C4,
            },
          },
        ]),
      );
    }

    const html = `<!doctype html><meta charset="utf-8"><title>Mechanism routing preview</title><body style="margin:0;padding:24px;background:#fff;font-family:sans-serif"><div style="display:flex;flex-wrap:wrap;gap:20px;align-items:flex-start">${panels
      .map((svg) => `<div style="border:1px solid #ddd">${svg}</div>`)
      .join('')}</div></body>`;

    const dir = path.dirname(OUT as string);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(OUT as string, html, 'utf8');

    // Also emit each fixture on its own, which is easier to look at closely
    // than the combined sheet.
    const slugs = ['vt1', 'vt2', 'vt3', 'vt5', 'vt6', 'vt7', 'vt8', 'vt9'];
    panels.forEach((svg, index) => {
      fs.writeFileSync(
        path.join(dir, `mechanism-${slugs[index]}.svg`),
        svg,
        'utf8',
      );
    });

    // This is inside `previewIt`, which the rule cannot see through to the
    // `it` it resolves to.
    // eslint-disable-next-line jest/no-standalone-expect
    expect(panels).toHaveLength(8);
  });
});
