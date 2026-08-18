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

import type { Struct } from 'domain/entities/struct';
import type { RxnArrow, MechanismAnchorRefs } from 'domain/entities/rxnArrow';
import { KetcherLogger } from 'utilities';

/**
 * Mechanism arrows anchor to atoms and bonds by Pool id, but a Pool id does not
 * survive the trip to KET. `KetSerializer.serialize` renumbers the atoms three
 * times — once per fragment on the way into the drawing-entity model, again as
 * those fragments are merged into a fresh `Struct`, and again when
 * `prepareStructForKet` clones each fragment out — and `moleculeToKet` then
 * writes them positionally, with no identity of their own.
 *
 * None of those hops rewrite the anchors. A structure whose fragments happen to
 * be numbered contiguously survives by luck; one built the way a person
 * actually draws (a nucleophile, then a substrate, then another atom on the
 * nucleophile) has interleaved ids, and every anchor lands on a different atom.
 * Deleting an atom does the same thing, because `Pool` never reuses a number.
 *
 * So each atom and bond an arrow references is stamped with a token that rides
 * along through all of it, and the numeric anchors are recomputed from those
 * tokens once the structure has been fully reassembled.
 *
 * Only referenced entities are stamped, so a structure with no mechanism arrows
 * serializes byte-for-byte as it did before.
 */

const ATOM_PREFIX = 'a';
const BOND_PREFIX = 'b';

/** Ids already in use, so a re-save does not mint a second token for one atom. */
function highestSuffix(existing: Iterable<string | undefined>, prefix: string) {
  let highest = -1;
  for (const id of existing) {
    if (!id || !id.startsWith(prefix)) continue;
    const suffix = Number(id.slice(prefix.length));
    if (Number.isInteger(suffix)) highest = Math.max(highest, suffix);
  }
  return highest;
}

function atomIdsReferencedBy(arrow: RxnArrow): number[] {
  const ids: number[] = [];
  if (arrow.lpAttach) ids.push(arrow.lpAttach.atomId);
  if (arrow.raAttach) ids.push(arrow.raAttach.atomId);

  const dest = arrow.destAttach;
  if (dest?.kind === 'atom') ids.push(dest.atomId);
  if (dest?.kind === 'new-bond') ids.push(dest.atomId1, dest.atomId2);

  return ids;
}

function bondIdsReferencedBy(arrow: RxnArrow): number[] {
  const ids: number[] = [];
  if (arrow.bdAttach) ids.push(arrow.bdAttach.bondId);
  if (arrow.destAttach?.kind === 'bond') ids.push(arrow.destAttach.bondId);
  return ids;
}

/**
 * Stamp a `stableId` on every atom and bond a mechanism arrow points at, and
 * record each arrow's anchors in terms of those ids.
 *
 * Both halves happen here, together, because they are only correct while the
 * numeric anchors still agree with the struct — that is, before any of the
 * renumbering described above. Once an arrow carries `anchorRefs` the work is
 * done, so calling this again later in the pipeline (on a struct whose ids have
 * moved) is a no-op rather than a fresh, wrong, stamping.
 */
export function ensureStableIdsForAnchors(struct: Struct): void {
  const arrows = Array.from(struct.rxnArrows.values());
  if (arrows.length === 0) return;

  const mechanismArrows = arrows.filter(
    (arrow) =>
      arrow.lpAttach || arrow.raAttach || arrow.bdAttach || arrow.destAttach,
  );
  if (mechanismArrows.length === 0) return;
  // Already resolved against the ids that were live at the time. Re-deriving
  // now would read a renumbered struct and produce nonsense.
  if (mechanismArrows.every((arrow) => arrow.anchorRefs)) return;

  const atomIds = new Set<number>();
  const bondIds = new Set<number>();
  arrows.forEach((arrow) => {
    atomIdsReferencedBy(arrow).forEach((id) => atomIds.add(id));
    bondIdsReferencedBy(arrow).forEach((id) => bondIds.add(id));
  });
  if (atomIds.size === 0 && bondIds.size === 0) return;

  let nextAtom =
    highestSuffix(
      Array.from(struct.atoms.values(), (atom) => atom.stableId),
      ATOM_PREFIX,
    ) + 1;
  let nextBond =
    highestSuffix(
      Array.from(struct.bonds.values(), (bond) => bond.stableId),
      BOND_PREFIX,
    ) + 1;

  atomIds.forEach((id) => {
    const atom = struct.atoms.get(id);
    if (atom && !atom.stableId) atom.stableId = `${ATOM_PREFIX}${nextAtom++}`;
  });
  bondIds.forEach((id) => {
    const bond = struct.bonds.get(id);
    if (bond && !bond.stableId) bond.stableId = `${BOND_PREFIX}${nextBond++}`;
  });

  mechanismArrows.forEach((arrow) => {
    arrow.anchorRefs = collectAnchorRefs(struct, arrow);
  });
}

/**
 * The arrow's anchors expressed as stable ids, or `undefined` when it anchors
 * to nothing that carries one (a plain reaction arrow, or a file written before
 * stable ids existed).
 */
export function collectAnchorRefs(
  struct: Struct,
  arrow: RxnArrow,
): MechanismAnchorRefs | undefined {
  const atomRef = (id: number) => struct.atoms.get(id)?.stableId;
  const bondRef = (id: number) => struct.bonds.get(id)?.stableId;

  const refs: MechanismAnchorRefs = {};
  if (arrow.lpAttach) refs.lpAtom = atomRef(arrow.lpAttach.atomId);
  if (arrow.raAttach) refs.raAtom = atomRef(arrow.raAttach.atomId);
  if (arrow.bdAttach) refs.bdBond = bondRef(arrow.bdAttach.bondId);

  const dest = arrow.destAttach;
  if (dest?.kind === 'atom') refs.destAtom = atomRef(dest.atomId);
  if (dest?.kind === 'bond') refs.destBond = bondRef(dest.bondId);
  if (dest?.kind === 'new-bond') {
    refs.destAtom1 = atomRef(dest.atomId1);
    refs.destAtom2 = atomRef(dest.atomId2);
  }

  const hasAny = Object.values(refs).some((value) => value !== undefined);
  return hasAny ? refs : undefined;
}

/**
 * Rewrite every arrow's numeric anchors from its stable-id refs.
 *
 * Called once, on the fully-merged struct, after every node of the KET file has
 * been read — which is the whole point: at that moment the ids are final, so
 * one pass is enough and there is no per-hop bookkeeping to get wrong.
 *
 * An unresolvable ref leaves the numeric anchor alone. That is the right
 * failure: the number is no better or worse than it was before, and dropping
 * the anchor would silently turn a curly arrow back into a bare curve.
 */
export function resolveStableIdAnchors(struct: Struct): void {
  const arrows = Array.from(struct.rxnArrows.values());
  if (arrows.length === 0) return;
  if (!arrows.some((arrow) => arrow.anchorRefs)) return;

  const atomByStableId = new Map<string, number>();
  struct.atoms.forEach((atom, id) => {
    if (atom.stableId) atomByStableId.set(atom.stableId, id);
  });
  const bondByStableId = new Map<string, number>();
  struct.bonds.forEach((bond, id) => {
    if (bond.stableId) bondByStableId.set(bond.stableId, id);
  });

  arrows.forEach((arrow) => {
    const refs = arrow.anchorRefs;
    if (!refs) return;

    const resolve = (
      ref: string | undefined,
      lookup: Map<string, number>,
      apply: (id: number) => void,
    ) => {
      if (ref === undefined) return;
      const id = lookup.get(ref);
      if (id === undefined) {
        KetcherLogger.warn(
          `Mechanism arrow anchor "${ref}" could not be resolved; keeping the stored id.`,
        );
        return;
      }
      apply(id);
    };

    resolve(refs.lpAtom, atomByStableId, (id) => {
      if (arrow.lpAttach) arrow.lpAttach = { ...arrow.lpAttach, atomId: id };
    });
    resolve(refs.raAtom, atomByStableId, (id) => {
      if (arrow.raAttach) arrow.raAttach = { ...arrow.raAttach, atomId: id };
    });
    resolve(refs.bdBond, bondByStableId, (id) => {
      if (arrow.bdAttach) arrow.bdAttach = { ...arrow.bdAttach, bondId: id };
    });

    const dest = arrow.destAttach;
    if (dest?.kind === 'atom') {
      resolve(refs.destAtom, atomByStableId, (id) => {
        arrow.destAttach = { ...dest, atomId: id };
      });
    }
    if (dest?.kind === 'bond') {
      resolve(refs.destBond, bondByStableId, (id) => {
        arrow.destAttach = { ...dest, bondId: id };
      });
    }
    if (dest?.kind === 'new-bond') {
      resolve(refs.destAtom1, atomByStableId, (id) => {
        arrow.destAttach = {
          ...(arrow.destAttach as typeof dest),
          atomId1: id,
        };
      });
      resolve(refs.destAtom2, atomByStableId, (id) => {
        arrow.destAttach = {
          ...(arrow.destAttach as typeof dest),
          atomId2: id,
        };
      });
    }

    // Consumed. Keeping it would let a stale ref override a later edit.
    arrow.anchorRefs = undefined;
  });
}
