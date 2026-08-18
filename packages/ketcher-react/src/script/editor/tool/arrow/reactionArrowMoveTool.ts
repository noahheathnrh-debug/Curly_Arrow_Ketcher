import type {
  ArrowMoveTool,
  CommonArrowDragContext,
  ReactionArrowClosestItem,
} from './arrow.types';
import {
  CoordinateTransformation,
  fromArrowResizing,
  fromMultipleMove,
  assert,
  getLonePairModelPositions,
  getRadicalModelPositions,
  type LonePairAttachment,
  RxnArrowMode,
  Vec2,
} from 'ketcher-core';
import { ArrowTool } from './arrowTool';

export class ReactionArrowMoveTool
  extends ArrowTool
  implements ArrowMoveTool<ReactionArrowClosestItem>
{
  private updateResizingState(
    closestItem: ReactionArrowClosestItem,
    isResizing: boolean,
  ) {
    if (closestItem.map === 'rxnArrows') {
      const reArrow = this.reStruct.rxnArrows.get(closestItem.id);
      assert(reArrow != null);
      reArrow.isResizing = isResizing;
    }
  }

  mousedown(event: PointerEvent, closestItem: ReactionArrowClosestItem) {
    return {
      originalPosition: CoordinateTransformation.pageToModel(
        event,
        this.editor.render,
      ),
      action: null,
      closestItem,
    };
  }

  mousemove(
    event: PointerEvent,
    dragContext: CommonArrowDragContext<ReactionArrowClosestItem>,
  ) {
    const { closestItem, originalPosition } = dragContext;
    let current = CoordinateTransformation.pageToModel(event, this.render);
    const offset = this.getOffset(event, originalPosition);
    if (!closestItem.ref) {
      return fromMultipleMove(
        this.reStruct,
        this.editor.selection() ?? {},
        offset,
      );
    } else {
      this.updateResizingState(closestItem, true);
      let isSnappingEnabled = !event.ctrlKey;

      let newLpAttach: LonePairAttachment | null | undefined;

      if (closestItem.map === 'rxnArrows') {
        const reArrow = this.reStruct.rxnArrows.get(closestItem.id);
        const mode = reArrow?.item.mode;
        const isMechanism =
          mode === RxnArrowMode.CurlyMechanism ||
          mode === RxnArrowMode.FishhookMechanism;

        if (reArrow && isMechanism) {
          const arrow = reArrow.item;
          const ref = closestItem.ref as Vec2;
          // ref equals pos[0] → dragging the start handle (tail at lone pair)
          // ref equals pos[1] → dragging the end handle (head at atom)
          const isDraggingStart =
            Math.abs(ref.x - arrow.pos[0].x) < 1e-3 &&
            Math.abs(ref.y - arrow.pos[0].y) < 1e-3;
          const isDraggingEnd =
            Math.abs(ref.x - arrow.pos[1].x) < 1e-3 &&
            Math.abs(ref.y - arrow.pos[1].y) < 1e-3;

          if (isDraggingStart) {
            // A fishhook carries a single electron, so its tail belongs on a
            // radical dot; only an electron-pair arrow snaps to a lone pair.
            isSnappingEnabled = false;
            if (mode === RxnArrowMode.FishhookMechanism) {
              const snap = this.snapToRadical(current);
              if (snap) current = snap;
            } else {
              const snap = this.snapToLonePair(current);
              if (snap) {
                current = snap.pos;
                newLpAttach = snap.lpAttach;
              } else {
                newLpAttach = null;
              }
            }
          } else if (isDraggingEnd) {
            // Snap end to nearest atom center
            isSnappingEnabled = false;
            current = this.snapToAtom(current) ?? current;
          }
          // Middle handle (curvature): no special snapping
        }
      }

      return fromArrowResizing(
        this.reStruct,
        closestItem.id,
        offset,
        current,
        closestItem.ref,
        isSnappingEnabled,
        newLpAttach,
      );
    }
  }

  private snapToLonePair(
    cursor: Vec2,
  ): { pos: Vec2; lpAttach: LonePairAttachment } | null {
    const molecule = this.reStruct.molecule;
    const options = this.render.options;
    let bestPos: Vec2 | null = null;
    let bestAttach: LonePairAttachment | null = null;
    let bestDist = Infinity;

    molecule.atoms.forEach((atom, atomId) => {
      const reAtom = this.reStruct.atoms.get(atomId);
      const positions = getLonePairModelPositions(
        atom,
        molecule,
        atomId,
        options,
        reAtom?.hydrogenOnTheLeft,
        reAtom?.cachedLabelHalfSize || undefined,
      );
      positions.forEach((pos, pairIdx) => {
        const dist = Vec2.dist(cursor, pos);
        if (dist < bestDist) {
          bestDist = dist;
          bestPos = pos;
          bestAttach = { atomId, pairIdx };
        }
      });
    });

    if (bestPos && bestAttach) {
      return { pos: bestPos, lpAttach: bestAttach };
    }
    return null;
  }

  /**
   * Nearest radical dot, for re-anchoring a fishhook tail.
   *
   * Returns only a position: unlike `lpAttach`, the resize operation has no
   * `newRaAttach` channel to persist the new anchor through undo, so the tail
   * moves visually but keeps its original `raAttach`. Wiring that through is a
   * separate change to `RxnArrowResize`; snapping to the dot is still a strict
   * improvement over the previous behaviour, which ignored fishhooks entirely.
   */
  private snapToRadical(cursor: Vec2): Vec2 | null {
    const molecule = this.reStruct.molecule;
    const options = this.render.options;
    let bestPos: Vec2 | null = null;
    let bestDist = Infinity;

    molecule.atoms.forEach((atom, atomId) => {
      const reAtom = this.reStruct.atoms.get(atomId);
      const positions = getRadicalModelPositions(
        atom,
        molecule,
        atomId,
        options,
        reAtom?.hydrogenOnTheLeft,
        reAtom?.cachedLabelHalfSize || undefined,
      );
      positions.forEach((pos) => {
        const dist = Vec2.dist(cursor, pos);
        if (dist < bestDist) {
          bestDist = dist;
          bestPos = pos;
        }
      });
    });

    return bestPos ? new Vec2(bestPos) : null;
  }

  private snapToAtom(cursor: Vec2): Vec2 | null {
    const molecule = this.reStruct.molecule;
    let bestPos: Vec2 | null = null;
    let bestDist = Infinity;

    molecule.atoms.forEach((atom) => {
      const dist = Vec2.dist(cursor, atom.pp);
      if (dist < bestDist) {
        bestDist = dist;
        bestPos = atom.pp;
      }
    });

    // Return a copy — NOT a reference to atom.pp.
    // RxnArrowResize.execute() mutates `current` in-place for undo toggling;
    // returning the live reference would corrupt the atom's position.
    return bestPos ? new Vec2(bestPos) : null;
  }

  mouseup(
    _event: PointerEvent,
    dragContext: CommonArrowDragContext<ReactionArrowClosestItem>,
  ) {
    if (dragContext.action) {
      this.updateResizingState(dragContext.closestItem, false);
    }
    return dragContext.action;
  }
}
