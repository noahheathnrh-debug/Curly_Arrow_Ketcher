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
  type LonePairAttachment,
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

class CurlyArrowTool implements Tool {
  private readonly editor: Editor;
  private dragCtx: {
    p0: Vec2;
    previewEl: RaphaelArtifact | null;
    lpAttach: LonePairAttachment | null;
    raAttach: RadicalAttachment | null;
  } | null = null;

  private hoverEl: RaphaelArtifact | null = null;

  constructor(editor: Editor) {
    this.editor = editor;
    this.editor.selection(null);
  }

  // ─── idle hover ────────────────────────────────────────────────────────────

  mousemove(event: PointerEvent) {
    if (this.dragCtx) {
      this._updateDragPreview(event);
      return true;
    }

    if (this.hoverEl) {
      this.hoverEl.remove();
      this.hoverEl = null;
    }

    const render = this.editor.render;
    const options = render.options;
    const molecule = render.ctab.molecule;
    const ci = this.editor.findItem(event, ['atoms', 'bonds']);

    if (ci && ci.map === 'atoms') {
      const atom = molecule.atoms.get(ci.id);
      if (atom) {
        const reAtom = render.ctab.atoms.get(ci.id);
        const lpPositions = getLonePairModelPositions(
          atom,
          molecule,
          ci.id,
          options,
          reAtom?.hydrogenOnTheLeft,
          reAtom?.cachedLabelHalfSize || undefined,
        );
        const radPositions = getRadicalModelPositions(
          atom,
          molecule,
          ci.id,
          options,
          reAtom?.hydrogenOnTheLeft,
          reAtom?.cachedLabelHalfSize || undefined,
        );
        const allPositions = [...lpPositions, ...radPositions];
        if (allPositions.length > 0) {
          this.editor.hover(ci, null, event);
          this.hoverEl = this._drawLpHover(allPositions, render);
        } else {
          this.editor.hover(null);
        }
      } else {
        this.editor.hover(null);
      }
    } else if (ci && ci.map === 'bonds') {
      const bond = molecule.bonds.get(ci.id);
      if (bond) {
        const a1 = molecule.atoms.get(bond.begin);
        const a2 = molecule.atoms.get(bond.end);
        if (a1 && a2) {
          this.editor.hover(ci, null, event);
          const mid = Vec2.centre(a1.pp, a2.pp);
          this.hoverEl = this._drawDotHover(mid, render);
        } else {
          this.editor.hover(null);
        }
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
    const options = render.options;
    const molecule = render.ctab.molecule;
    const ci = this.editor.findItem(event, ['atoms', 'bonds']);
    const cursor = CoordinateTransformation.pageToModel(event, render);

    let p0: Vec2 | null = null;
    let lpAttach: LonePairAttachment | null = null;
    let raAttach: RadicalAttachment | null = null;

    if (ci && ci.map === 'atoms') {
      const atom = molecule.atoms.get(ci.id);
      if (atom) {
        const reAtom = render.ctab.atoms.get(ci.id);
        const lpPositions = getLonePairModelPositions(
          atom,
          molecule,
          ci.id,
          options,
          reAtom?.hydrogenOnTheLeft,
          reAtom?.cachedLabelHalfSize || undefined,
        );
        const radPositions = getRadicalModelPositions(
          atom,
          molecule,
          ci.id,
          options,
          reAtom?.hydrogenOnTheLeft,
          reAtom?.cachedLabelHalfSize || undefined,
        );
        // Pick the closest attachment point among all LP + radical positions.
        // This lets the user drag from a radical even on atoms that also have lone pairs.
        let closestLpIdx = -1;
        let closestRaIdx = -1;
        let minDist = Infinity;
        lpPositions.forEach((pos, i) => {
          const d = Vec2.dist(cursor, pos);
          if (d < minDist) {
            minDist = d;
            closestLpIdx = i;
            closestRaIdx = -1;
          }
        });
        radPositions.forEach((pos, i) => {
          const d = Vec2.dist(cursor, pos);
          if (d < minDist) {
            minDist = d;
            closestRaIdx = i;
            closestLpIdx = -1;
          }
        });
        if (closestLpIdx >= 0) {
          p0 = lpPositions[closestLpIdx];
          lpAttach = { atomId: ci.id, pairIdx: closestLpIdx };
        } else if (closestRaIdx >= 0) {
          p0 = radPositions[closestRaIdx];
          raAttach = { atomId: ci.id, radicalIdx: closestRaIdx };
        }
      }
    } else if (ci && ci.map === 'bonds') {
      const bond = molecule.bonds.get(ci.id);
      if (bond) {
        const a1 = molecule.atoms.get(bond.begin);
        const a2 = molecule.atoms.get(bond.end);
        if (a1 && a2) p0 = Vec2.centre(a1.pp, a2.pp);
      }
    }

    if (!p0) return true;

    if (this.hoverEl) {
      this.hoverEl.remove();
      this.hoverEl = null;
    }
    this.editor.hover(null);
    this.dragCtx = { p0, previewEl: null, lpAttach, raAttach };
    return true;
  }

  // ─── commit ────────────────────────────────────────────────────────────────

  mouseup(event: PointerEvent) {
    if (!this.dragCtx) return true;

    const { p0, previewEl, lpAttach, raAttach } = this.dragCtx;
    if (previewEl) previewEl.remove();
    this.dragCtx = null;

    const render = this.editor.render;
    const molecule = render.ctab.molecule;
    const ci = this.editor.findItem(event, ['atoms', 'bonds']);
    const p1 = this._getEndPoint(ci, molecule, event, render, p0);
    const mode = raAttach
      ? RxnArrowMode.FishhookMechanism
      : RxnArrowMode.CurlyMechanism;

    if (Vec2.dist(p0, p1) > 0.3) {
      const dist = Vec2.dist(p0, p1);

      // Adaptive default height: scales with chord length.
      // Cap at dist*0.25 to keep end-tangent ≤ 45° from chord so the
      // arrowhead visually faces the target even for very short arrows.
      let h1 = Math.max(
        0.05,
        Math.min(0.6, Math.min(dist * 0.25, 0.4 / Math.sqrt(dist))),
      );
      let h2 = h1;

      // Tangent exit: when starting from a lone pair or radical, exit radially
      // from the atom center so the arrow doesn't look like it bends abruptly.
      const sourceAtomId = lpAttach?.atomId ?? raAttach?.atomId ?? null;
      if (sourceAtomId !== null) {
        const sourceAtom = molecule.atoms.get(sourceAtomId);
        if (sourceAtom) {
          const exDx = p0.x - sourceAtom.pp.x;
          const exDy = p0.y - sourceAtom.pp.y;
          const exLen = Math.hypot(exDx, exDy);
          if (exLen > 1e-9) {
            const chordDx = (p1.x - p0.x) / dist;
            const chordDy = (p1.y - p0.y) / dist;
            const perpDx = chordDy; // rotate90CW(chordDir)
            const perpDy = -chordDx;
            const exitAlong =
              (exDx / exLen) * chordDx + (exDy / exLen) * chordDy;
            const exitPerp = (exDx / exLen) * perpDx + (exDy / exLen) * perpDy;
            if (Math.abs(exitAlong) > 0.1) {
              h1 = ((dist / 3) * exitPerp) / exitAlong;
            } else {
              h1 = exitPerp >= 0 ? dist * 0.4 : -dist * 0.4;
            }
            // Cap h1 so a nearly-parallel exit doesn't produce a huge loop
            h1 = Math.max(-dist * 0.7, Math.min(dist * 0.7, h1));
            const h2Mag = Math.max(
              0.05,
              Math.min(0.6, Math.min(dist * 0.25, 0.4 / Math.sqrt(dist))),
            );
            h2 = h1 < 0 ? -h2Mag : h2Mag; // same sign as h1 → C-curve, not S
          }
        }
      }

      // Auto-routing: side-selection then iterative repulsion.
      const destAtomId = ci?.map === 'atoms' ? (ci.id as number) : null;
      const AVOID_R = 0.55;

      // Count collisions for a given (h1, h2) pair
      const countAtomCollisions = (_h1: number, _h2: number): number => {
        let n = 0;
        for (const [atomId, atom] of molecule.atoms) {
          if (atomId === sourceAtomId || atomId === destAtomId) continue;
          for (let ti = 0; ti <= 20; ti++) {
            if (
              Vec2.dist(sampleCubicBezier(p0, p1, _h1, _h2, ti / 20), atom.pp) <
              AVOID_R
            ) {
              n++;
              break;
            }
          }
        }
        return n;
      };

      // Pick the side with fewer collisions
      const scorePos = countAtomCollisions(h1, h2);
      const scoreNeg = countAtomCollisions(-h1, -h2);
      if (scoreNeg < scorePos) {
        h1 = -h1;
        h2 = -h2;
      }

      // Iterative repulsion locked to the chosen side
      const pushSign = h1 >= 0 ? 1 : -1;
      for (let iter = 0; iter < 8; iter++) {
        let collided = false;
        for (const [atomId, atom] of molecule.atoms) {
          if (atomId === sourceAtomId || atomId === destAtomId) continue;
          for (let ti = 0; ti <= 20; ti++) {
            const t = ti / 20;
            const pt = sampleCubicBezier(p0, p1, h1, h2, t);
            const d = Vec2.dist(pt, atom.pp);
            if (d < AVOID_R) {
              const repulse = (AVOID_R - d) * 1.5;
              if (t < 0.5) h1 += pushSign * repulse;
              else h2 += pushSign * repulse;
              collided = true;
              break;
            }
          }
          if (collided) break;
        }
        if (!collided) break;
      }

      this.editor.update(
        fromArrowAddition(
          render.ctab,
          [p0, p1],
          mode,
          lpAttach ?? undefined,
          raAttach ?? undefined,
          h1,
          h2,
        ),
      );
    }
    return true;
  }

  cancel() {
    if (this.hoverEl) {
      this.hoverEl.remove();
      this.hoverEl = null;
    }
    if (this.dragCtx?.previewEl) this.dragCtx.previewEl.remove();
    this.dragCtx = null;
    this.editor.hover(null);
  }

  // ─── private helpers ───────────────────────────────────────────────────────

  /** Redraw the dashed bezier preview while dragging. */
  private _updateDragPreview(event: PointerEvent) {
    if (!this.dragCtx) return;

    const render = this.editor.render;
    const options = render.options;
    const paper = render.paper;
    const molecule = render.ctab.molecule;
    const ci = this.editor.findItem(event, ['atoms', 'bonds']);
    const p1 = this._getEndPoint(ci, molecule, event, render, this.dragCtx.p0);

    if (this.dragCtx.previewEl) this.dragCtx.previewEl.remove();

    const p0c = Scale.modelToCanvas(this.dragCtx.p0, options);
    const p1c = Scale.modelToCanvas(p1, options);
    const dx = p1c.x - p0c.x;
    const dy = p1c.y - p0c.y;
    const len = Math.hypot(dx, dy) || 1;

    // Perpendicular unit vector: rotate arrow direction 90° CW
    // (matches the rendered arrow's default upward curvature)
    const nx = dy / len;
    const ny = -dx / len;
    const curv = len * 0.25;

    const cpX = (p0c.x + p1c.x) / 2 + nx * curv;
    const cpY = (p0c.y + p1c.y) / 2 + ny * curv;

    this.dragCtx.previewEl = paper
      .path(`M${p0c.x},${p0c.y}Q${cpX},${cpY},${p1c.x},${p1c.y}`)
      .attr({
        stroke: '#666',
        fill: 'none',
        'stroke-dasharray': '4,2',
        'stroke-width': 1.5,
      });
  }

  /**
   * Resolve p1:
   * - atom → atom symbol edge (offset from center toward p0 by atomRadius)
   * - bond → bond midpoint
   * - else → cursor model position
   */
  private _getEndPoint(
    ci: { map?: string; id?: number } | null,
    molecule: {
      atoms: Map<number, { pp: Vec2 }>;
      bonds: Map<number, { begin: number; end: number }>;
    },
    event: PointerEvent,
    render: Render,
    p0: Vec2,
  ): Vec2 {
    if (ci && ci.map === 'atoms') {
      const atom = molecule.atoms.get(ci.id as number);
      if (atom) {
        const reAtom = render.ctab.atoms.get(ci.id as number);
        const halfSizePx =
          reAtom?.cachedLabelHalfSize ?? render.options.fontszInPx * 0.5;
        const scale = render.options.microModeScale;
        const dotR =
          render.options.lineWidth *
          0.9 *
          (Math.max(1, render.options.lonePairSize ?? 4) / 4);
        const atomRadius = (halfSizePx + dotR) / scale;
        const dir = p0.sub(atom.pp);
        const dirLen = dir.length();
        if (dirLen > atomRadius) {
          return atom.pp.addScaled(dir.scaled(1 / dirLen), atomRadius);
        }
        return atom.pp;
      }
    }
    if (ci && ci.map === 'bonds') {
      const bond = molecule.bonds.get(ci.id as number);
      if (bond) {
        const a1 = molecule.atoms.get(bond.begin);
        const a2 = molecule.atoms.get(bond.end);
        if (a1 && a2) return Vec2.centre(a1.pp, a2.pp);
      }
    }
    return CoordinateTransformation.pageToModel(event, render);
  }

  /** Draw highlight circles at each lone pair model position. */
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
    const r = options.fontszInPx * 0.45;
    return paper.circle(c.x, c.y, r).attr({
      stroke: '#1a75ff',
      fill: '#1a75ff',
      'fill-opacity': 0.2,
      'stroke-width': 1.5,
    });
  }
}

/**
 * Sample a cubic Bezier at parameter t in model space, using the same
 * chord-relative geometry as the draw function.
 * cp1 = p0 + chordDir*(len/3) + perpDir*h1
 * cp2 = p0 + chordDir*(2*len/3) + perpDir*h2
 */
function sampleCubicBezier(
  p0: Vec2,
  p1: Vec2,
  h1: number,
  h2: number,
  t: number,
): Vec2 {
  const dx = p1.x - p0.x;
  const dy = p1.y - p0.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return new Vec2(p0);
  const cdx = dx / len;
  const cdy = dy / len;
  const pdx = cdy; // perpDir = rotate90CW(chordDir)
  const pdy = -cdx;
  const cp1x = p0.x + cdx * (len / 3) + pdx * h1;
  const cp1y = p0.y + cdy * (len / 3) + pdy * h1;
  const cp2x = p0.x + cdx * ((2 * len) / 3) + pdx * h2;
  const cp2y = p0.y + cdy * ((2 * len) / 3) + pdy * h2;
  const mt = 1 - t;
  return new Vec2(
    mt * mt * mt * p0.x +
      3 * mt * mt * t * cp1x +
      3 * mt * t * t * cp2x +
      t * t * t * p1.x,
    mt * mt * mt * p0.y +
      3 * mt * mt * t * cp1y +
      3 * mt * t * t * cp2y +
      t * t * t * p1.y,
  );
}

export default CurlyArrowTool;
