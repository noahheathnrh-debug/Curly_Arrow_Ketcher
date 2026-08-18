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
  type NonBondingAtom,
  calcChargeAngle,
  getLonePairModelPositions,
  getRadicalModelPositions,
} from 'application/render/restruct/lonePairUtils';
import { Elements } from 'domain/constants';
import { type Box, type Capsule, makeDisc } from './geometry';
import type {
  MechanismMetrics,
  MechanismOptions,
  MechanismStruct,
} from './types';

/**
 * Analytic implementation of {@link MechanismMetrics}.
 *
 * Derives drawn geometry from the structure and render options alone, without
 * needing a render pass. This is what makes the router unit-testable, and it
 * is also the fallback in the app for the first paint, before Raphael has
 * measured anything.
 *
 * It approximates text metrics. The app-side provider overrides those with
 * real measurements where it has them; both agree on everything else, and the
 * Playwright layer exists to catch any drift that matters visually.
 */
export class AnalyticMechanismMetrics implements MechanismMetrics {
  private readonly scale: number;

  constructor(
    private readonly struct: MechanismStruct,
    private readonly options: MechanismOptions,
  ) {
    this.scale = options.microModeScale ?? options.scale ?? 40;
  }

  /**
   * Mirrors the renderer's rule closely enough for collision purposes: a plain
   * carbon with two or more neighbours and nothing to annotate is drawn as a
   * bare vertex, everything else gets a label.
   */
  hasLabel(atomId: number): boolean {
    const atom = this.struct.atoms.get(atomId);
    if (!atom) return false;
    if (atom.label.toLowerCase() !== 'c') return true;
    if ((atom.charge ?? 0) !== 0) return true;
    if ((atom.radical ?? 0) !== 0) return true;

    let neighbours = 0;
    this.struct.bonds.forEach((bond) => {
      if (bond.begin === atomId || bond.end === atomId) neighbours++;
    });
    return neighbours < 2;
  }

  labelHalfSize(atomId: number): number {
    const atom = this.struct.atoms.get(atomId);
    if (!atom || !this.hasLabel(atomId)) return 0;

    const fontPx = this.options.fontszInPx;
    // Glyph advance is roughly 0.65 em for the sans-serif face Ketcher uses.
    const widthPx = Math.max(fontPx, atom.label.length * fontPx * 0.65);
    return (widthPx * 0.5) / this.scale;
  }

  /**
   * The drawn text, including whatever hydrogens are shown with it.
   *
   * The element symbol is centred on the atom; the hydrogens and their count
   * hang off one side, which is what makes this box asymmetric. Estimated from
   * glyph advances here — {@link RenderMechanismMetrics} prefers the box the
   * renderer actually measured whenever there has been a paint.
   */
  labelBox(atomId: number, hydrogenOnTheLeft?: boolean): Box | null {
    const atom = this.struct.atoms.get(atomId);
    if (!atom || !this.hasLabel(atomId)) return null;

    const fontPx = this.options.fontszInPx;
    const advance = (fontPx * 0.65) / this.scale;
    const halfHeight = (fontPx * 0.62) / this.scale;

    const symbolHalfWidth = (atom.label.length * advance) / 2;

    // `H`, plus a subscripted count when there is more than one.
    const implicit = Math.floor(atom.implicitH ?? 0);
    const hydrogenWidth =
      implicit > 0 ? advance * (implicit > 1 ? 1.55 : 1) : 0;

    const left = symbolHalfWidth + (hydrogenOnTheLeft ? hydrogenWidth : 0);
    const right = symbolHalfWidth + (hydrogenOnTheLeft ? 0 : hydrogenWidth);

    return {
      min: new Vec2(atom.pp.x - left, atom.pp.y - halfHeight),
      max: new Vec2(atom.pp.x + right, atom.pp.y + halfHeight),
    };
  }

  /**
   * The lone pairs a reader can actually see.
   *
   * Distinct from {@link lonePairDots}, which says where a pair *is* whether or
   * not it is drawn — a tail anchored to a specific pair needs that position
   * even with the display switched off, and Ketcher reveals just that pair when
   * it happens.
   *
   * What must be dodged, though, is what is on the canvas. Treating hidden
   * pairs as obstacles reserved space around every heteroatom for dots that
   * were not there, and made arrows arrive at odd angles for no visible reason.
   */
  visibleLonePairDots(atomId: number, hOnLeft?: boolean): Vec2[] {
    const atom = this.struct.atoms.get(atomId);
    if (!atom || !this.lonePairsVisible(atom)) return [];
    return this.lonePairDots(atomId, hOnLeft);
  }

  private lonePairsVisible(atom: NonBondingAtom): boolean {
    if (this.options.showLonePairs) return true;
    return (
      ((atom as { revealedLonePairs?: number }).revealedLonePairs ?? 0) > 0
    );
  }

  chargeShape(atomId: number): Capsule | null {
    const atom = this.struct.atoms.get(atomId);
    const charge = atom?.charge ?? 0;
    if (!atom || charge === 0) return null;

    const fontSubPx = Math.ceil(0.5 * this.options.fontszInPx);
    const sizeFactor = Math.max(1, this.options.chargeSize ?? 6) / 6;
    const radius = (fontSubPx * 0.38 * sizeFactor * 0.75) / this.scale;

    // Charges dodge lone pairs rather than the other way round; ask the shared
    // solver where this one actually ended up.
    const angle =
      calcChargeAngle(
        atom,
        this.struct,
        atomId,
        this.hydrogenOnTheLeft(atomId),
      ) ?? -Math.PI / 4;
    const distance = this.labelHalfSize(atomId) + radius + 0.04;

    return makeDisc(
      atom.pp.add(new Vec2(Math.cos(angle), Math.sin(angle)).scaled(distance)),
      radius,
    );
  }

  /** `hOnLeft` lets a caller supply the renderer's decision instead of the estimate. */
  lonePairDots(atomId: number, hOnLeft?: boolean): Vec2[] {
    const atom = this.struct.atoms.get(atomId);
    if (!atom) return [];
    return getLonePairModelPositions(
      atom,
      this.struct,
      atomId,
      this.options,
      hOnLeft ?? this.hydrogenOnTheLeft(atomId),
      this.labelHalfSizePx(atomId),
    );
  }

  radicalDots(atomId: number, hOnLeft?: boolean): Vec2[] {
    const atom = this.struct.atoms.get(atomId);
    if (!atom) return [];
    return getRadicalModelPositions(
      atom,
      this.struct,
      atomId,
      this.options,
      hOnLeft ?? this.hydrogenOnTheLeft(atomId),
      this.labelHalfSizePx(atomId),
    );
  }

  /**
   * Bond endpoints as drawn, pulled back from each atom centre by that atom's
   * label. Routing against the raw atom-to-atom segment would treat the empty
   * space inside a label as blocked.
   */
  bondExtent(bondId: number): [Vec2, Vec2] | null {
    const bond = this.struct.bonds.get(bondId);
    if (!bond) return null;

    const begin = this.struct.atoms.get(bond.begin);
    const end = this.struct.atoms.get(bond.end);
    if (!begin || !end) return null;

    const axis = end.pp.sub(begin.pp);
    const length = axis.length();
    if (length < 1e-9) return [new Vec2(begin.pp), new Vec2(end.pp)];

    const dir = axis.scaled(1 / length);
    const trimStart = Math.min(this.labelHalfSize(bond.begin), length * 0.45);
    const trimEnd = Math.min(this.labelHalfSize(bond.end), length * 0.45);

    return [
      begin.pp.addScaled(dir, trimStart),
      end.pp.addScaled(dir, -trimEnd),
    ];
  }

  bondHalfWidth(bondId: number): number {
    const bond = this.struct.bonds.get(bondId);
    const order = bond?.type ?? 1;
    const spacing =
      (this.options.bondSpacingInPx ?? this.scale / 7) / this.scale;
    const stereoWidth =
      (this.options.stereoBondWidthInPx ?? this.scale / 7) / this.scale;

    // A wedge flares to its full width, so it blocks more than its axis.
    if (bond?.stereo) return stereoWidth * 0.7;
    if (order === 2) return spacing / 2;
    if (order === 3) return spacing;
    return this.options.lineWidth / 2 / this.scale;
  }

  /**
   * Which side the implicit-hydrogen label sits on, mirroring the renderer.
   *
   * This is load-bearing for routing, not cosmetic: the H label reserves an
   * angular slot, so it decides which directions the lone pairs get pushed
   * into. Getting it backwards for an isolated hydroxide puts the H on the
   * side facing the electrophile and every lone pair on the far side, and the
   * attacking arrow then has to loop all the way around to reach a pair.
   */
  hydrogenOnTheLeft(atomId: number): boolean {
    const atom = this.struct.atoms.get(atomId);
    if (!atom) return false;
    if (atom.label === 'D' || atom.label === 'T') return false;

    const neighbours: Vec2[] = [];
    this.struct.bonds.forEach((bond) => {
      const otherId =
        bond.begin === atomId
          ? bond.end
          : bond.end === atomId
          ? bond.begin
          : null;
      if (otherId === null) return;
      const other = this.struct.atoms.get(otherId);
      if (other) neighbours.push(other.pp);
    });

    if (neighbours.length === 0) {
      const element = Elements.get(atom.label);
      return !element || Boolean(element.leftH);
    }
    if (neighbours.length === 1) {
      return neighbours[0].sub(atom.pp).x > 0;
    }
    return false;
  }

  private labelHalfSizePx(atomId: number): number | undefined {
    const half = this.labelHalfSize(atomId);
    return half > 0 ? half * this.scale : undefined;
  }
}
