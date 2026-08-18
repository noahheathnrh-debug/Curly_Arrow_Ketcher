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
import { Scale } from 'domain/helpers';
import type { Box, Capsule } from './geometry';
import { AnalyticMechanismMetrics } from './metrics';
import type {
  MechanismMetrics,
  MechanismOptions,
  MechanismStruct,
} from './types';

/**
 * The slice of `Render` this needs.
 *
 * Typed structurally rather than importing `Render` itself: the render layer
 * already depends on this module's constants, and `restruct` needs to call the
 * router, so importing `Render` here would close a dependency cycle. A real
 * `Render` satisfies this shape.
 */
export interface RenderLike {
  options: MechanismOptions & {
    microModeScale: number;
    macroModeScale: number;
  };
  ctab: {
    molecule: MechanismStruct & { halfBonds: Map<number, { p: Vec2 }> };
    atoms: Map<
      number,
      {
        showLabel: boolean;
        cachedLabelHalfSize: number;
        hydrogenOnTheLeft: boolean;
      }
    >;
  };
}

/**
 * {@link MechanismMetrics} backed by what the renderer actually measured.
 *
 * Every measurement is optional. Raphael boxes only exist after an object has
 * been painted, and `Visel` clears them on each redraw, so on a fresh load
 * there is nothing to read. Each accessor therefore falls back to the analytic
 * estimate rather than returning a misleading zero — an atom whose label
 * measured as zero-sized would let arrowheads land right on top of it.
 */
export class RenderMechanismMetrics implements MechanismMetrics {
  private readonly fallback: AnalyticMechanismMetrics;
  private readonly scale: number;

  constructor(private readonly render: RenderLike) {
    this.fallback = new AnalyticMechanismMetrics(
      render.ctab.molecule,
      render.options,
    );
    this.scale = render.options.microModeScale;
  }

  hasLabel(atomId: number): boolean {
    const reAtom = this.render.ctab.atoms.get(atomId);
    return reAtom ? reAtom.showLabel : this.fallback.hasLabel(atomId);
  }

  labelHalfSize(atomId: number): number {
    if (!this.hasLabel(atomId)) return 0;

    const measured = this.render.ctab.atoms.get(atomId)?.cachedLabelHalfSize;
    // Zero means "not populated this frame", not "no label" — the renderer only
    // fills it in as a side effect of drawing lone pairs or radicals.
    if (measured && measured > 0) return measured / this.scale;

    return this.fallback.labelHalfSize(atomId);
  }

  /**
   * The label box, widened by whatever the renderer actually measured.
   *
   * `cachedLabelHalfSize` is the only measurement the renderer keeps, and it is
   * a half-*width*, so it cannot say which side the text hangs off. The
   * analytic box knows that from the hydrogen side, so the two are combined:
   * shape from the estimate, scale from the measurement when it is larger.
   */
  labelBox(atomId: number): Box | null {
    const reAtom = this.render.ctab.atoms.get(atomId);
    const box = this.fallback.labelBox(atomId, reAtom?.hydrogenOnTheLeft);
    if (!box) return null;

    const measured = reAtom?.cachedLabelHalfSize;
    if (!measured || measured <= 0) return box;

    const half = measured / this.scale;
    const centre = box.min.add(box.max).scaled(0.5);
    const estimated = (box.max.x - box.min.x) / 2;
    if (half <= estimated) return box;

    const grow = half - estimated;
    return {
      min: new Vec2(box.min.x - grow, Math.min(box.min.y, centre.y - half)),
      max: new Vec2(box.max.x + grow, Math.max(box.max.y, centre.y + half)),
    };
  }

  chargeShape(atomId: number): Capsule | null {
    return this.fallback.chargeShape(atomId);
  }

  /**
   * Delegated to the analytic provider, which derives lone-pair angles from the
   * same solver the renderer uses. The one thing it cannot infer as reliably is
   * which side the implicit hydrogen sits on, so that is taken from the
   * renderer when it has already decided.
   */
  lonePairDots(atomId: number): Vec2[] {
    return this.fallback.lonePairDots(
      atomId,
      this.render.ctab.atoms.get(atomId)?.hydrogenOnTheLeft,
    );
  }

  /** The renderer's own decision when it has painted, the estimate otherwise. */
  hydrogenOnTheLeft(atomId: number): boolean {
    const reAtom = this.render.ctab.atoms.get(atomId);
    return reAtom
      ? reAtom.hydrogenOnTheLeft
      : this.fallback.hydrogenOnTheLeft(atomId);
  }

  visibleLonePairDots(atomId: number): Vec2[] {
    return this.fallback.visibleLonePairDots(
      atomId,
      this.render.ctab.atoms.get(atomId)?.hydrogenOnTheLeft,
    );
  }

  radicalDots(atomId: number): Vec2[] {
    return this.fallback.radicalDots(
      atomId,
      this.render.ctab.atoms.get(atomId)?.hydrogenOnTheLeft,
    );
  }

  /**
   * Prefers the renderer's half-bond endpoints, which are already pulled back
   * to clear the labels at each end — the bond's drawn extent rather than the
   * raw atom-to-atom segment.
   */
  bondExtent(bondId: number): [Vec2, Vec2] | null {
    const struct = this.render.ctab.molecule;
    const bond = struct.bonds.get(bondId);
    if (!bond) return null;

    const hb1 =
      bond.hb1 === undefined ? undefined : struct.halfBonds.get(bond.hb1);
    const hb2 =
      bond.hb2 === undefined ? undefined : struct.halfBonds.get(bond.hb2);

    if (hb1?.p && hb2?.p) {
      return [
        Scale.canvasToModel(hb1.p, this.render.options),
        Scale.canvasToModel(hb2.p, this.render.options),
      ];
    }

    return this.fallback.bondExtent(bondId);
  }

  bondHalfWidth(bondId: number): number {
    return this.fallback.bondHalfWidth(bondId);
  }
}
