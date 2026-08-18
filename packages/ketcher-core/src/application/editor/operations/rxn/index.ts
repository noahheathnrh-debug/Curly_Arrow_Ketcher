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
/* eslint-disable @typescript-eslint/no-use-before-define */

import {
  type BondAttachment,
  type ElectronDestination,
  type LonePairAttachment,
  type RadicalAttachment,
  RxnArrow,
  RxnArrowMode,
} from 'domain/entities/rxnArrow';
import { Vec2 } from 'domain/entities/vec2';

import Base from '../BaseOperation';
import { OperationType } from '../OperationType';
import { ReRxnArrow } from '../../../render';
import { KetcherLogger } from 'utilities';
import type Restruct from 'application/render/restruct/restruct';

// todo: separate classes: now here is circular dependency in `invert` method

type AnchorFields = {
  lpAttach?: LonePairAttachment;
  raAttach?: RadicalAttachment;
  bdAttach?: BondAttachment;
  destAttach?: ElectronDestination;
};

/**
 * Redraw everything a mechanism arrow is pinned to. The source atom must
 * repaint so it can show (or drop) the forced lone pair / radical dot the tail
 * hangs off; the destination must repaint because the arrow's approach sector
 * depends on what is drawn around it.
 */
function invalidateAnchoredItems(
  anchors: AnchorFields,
  // Passed in because `Base.invalidateItem` is protected and so unreachable
  // from a module-level function.
  invalidate: (map: 'atoms' | 'bonds', id: number) => void,
): void {
  const atom = (aid?: number) => {
    if (aid != null) invalidate('atoms', aid);
  };
  const bond = (bid?: number) => {
    if (bid != null) invalidate('bonds', bid);
  };

  atom(anchors.lpAttach?.atomId);
  atom(anchors.raAttach?.atomId);
  bond(anchors.bdAttach?.bondId);

  const dest = anchors.destAttach;
  if (dest?.kind === 'atom') {
    atom(dest.atomId);
  } else if (dest?.kind === 'bond') {
    bond(dest.bondId);
  } else if (dest?.kind === 'new-bond') {
    atom(dest.atomId1);
    atom(dest.atomId2);
  }
}

/**
 * Anchors added by the mechanism-arrow feature. Passed as a trailing object
 * rather than yet more positional parameters, which are already at eight.
 */
export type MechanismAnchors = {
  along1?: number;
  along2?: number;
  bdAttach?: BondAttachment;
  destAttach?: ElectronDestination;
  autoRoute?: boolean;
};

type RxnArrowAddData = {
  id?: number;
  pos: Array<Vec2>;
  mode: RxnArrowMode;
  height?: number;
  height2?: number;
  along1?: number;
  along2?: number;
  lpAttach?: LonePairAttachment;
  raAttach?: RadicalAttachment;
  bdAttach?: BondAttachment;
  destAttach?: ElectronDestination;
  autoRoute?: boolean;
  arrowId?: number;
};

class RxnArrowAdd extends Base {
  data: RxnArrowAddData;

  constructor(
    pos: Array<Vec2> = [],
    mode: RxnArrowMode = RxnArrowMode.OpenAngle,
    id?: number,
    height?: number,
    lpAttach?: LonePairAttachment,
    raAttach?: RadicalAttachment,
    height2?: number,
    arrowId?: number,
    anchors?: MechanismAnchors,
  ) {
    super(OperationType.RXN_ARROW_ADD);
    this.data = {
      pos,
      mode,
      id,
      height,
      height2,
      lpAttach,
      raAttach,
      arrowId,
      along1: anchors?.along1,
      along2: anchors?.along2,
      bdAttach: anchors?.bdAttach,
      destAttach: anchors?.destAttach,
      autoRoute: anchors?.autoRoute,
    };
  }

  execute(restruct: any): void {
    const struct = restruct.molecule;
    const item = new RxnArrow({
      mode: this.data.mode,
      height: this.data.height,
      height2: this.data.height2,
      along1: this.data.along1,
      along2: this.data.along2,
      lpAttach: this.data.lpAttach,
      raAttach: this.data.raAttach,
      bdAttach: this.data.bdAttach,
      destAttach: this.data.destAttach,
      autoRoute: this.data.autoRoute,
      arrowId: this.data.arrowId,
    });

    if (this.data.id == null) {
      const index = struct.addRxnArrow(item);
      this.data.id = index;
      this.data.arrowId = item.arrowId;
    } else {
      struct.setRxnArrow(this.data.id, item);
    }

    const itemId = this.data.id!;

    restruct.rxnArrows.set(itemId, new ReRxnArrow(item));

    const positions = [...this.data.pos];

    struct.rxnArrowSetPos(
      itemId,
      positions.map((p) => new Vec2(p)),
    );

    Base.invalidateItem(restruct, 'rxnArrows', itemId, 1);
    invalidateAnchoredItems(this.data, (map, id) =>
      Base.invalidateItem(restruct, map, id, 1),
    );
  }

  invert(): Base {
    return new RxnArrowDelete(this.data.id!);
  }
}

interface RxnArrowDeleteData {
  id: number;
  pos?: Array<Vec2>;
  mode?: RxnArrowMode;
  height?: number;
  height2?: number;
  along1?: number;
  along2?: number;
  lpAttach?: LonePairAttachment;
  raAttach?: RadicalAttachment;
  bdAttach?: BondAttachment;
  destAttach?: ElectronDestination;
  autoRoute?: boolean;
  arrowId?: number;
}

class RxnArrowDelete extends Base {
  data: RxnArrowDeleteData;
  performed: boolean;

  constructor(id: number) {
    super(OperationType.RXN_ARROW_DELETE);
    this.data = { id, pos: [], mode: RxnArrowMode.OpenAngle };
    this.performed = false;
  }

  execute(restruct: Restruct): void {
    KetcherLogger.log('RxnArrowDelete.execute(), start', this.data);
    const struct = restruct.molecule;
    const item = struct.rxnArrows.get(this.data.id);
    if (!item) throw new Error(`rxnArrow not found with id: ${this.data.id}`);

    this.data.pos = item.pos;
    this.data.mode = item.mode;
    this.data.height = item.height;
    this.data.height2 = item.height2;
    this.data.along1 = item.along1;
    this.data.along2 = item.along2;
    this.data.lpAttach = item.lpAttach;
    this.data.raAttach = item.raAttach;
    this.data.bdAttach = item.bdAttach;
    this.data.destAttach = item.destAttach;
    this.data.autoRoute = item.autoRoute;
    this.data.arrowId = item.arrowId;
    this.performed = true;

    restruct.markItemRemoved();
    const reItem = restruct.rxnArrows.get(this.data.id);
    if (!reItem)
      throw new Error(`reRxnArrow not found with id: ${this.data.id}`);
    restruct.clearVisel(reItem.visel);
    restruct.rxnArrows.delete(this.data.id);

    struct.rxnArrows.delete(this.data.id);

    // Redraw the anchored atoms/bonds so they can drop the forced lone pair display
    invalidateAnchoredItems(this.data, (map, id) =>
      Base.invalidateItem(restruct, map, id, 1),
    );

    KetcherLogger.log('RxnArrowDelete.execute(), end');
  }

  invert(): Base {
    return new RxnArrowAdd(
      this.data.pos,
      this.data.mode,
      this.data.id,
      this.data.height,
      this.data.lpAttach,
      this.data.raAttach,
      this.data.height2,
      this.data.arrowId,
      {
        along1: this.data.along1,
        along2: this.data.along2,
        bdAttach: this.data.bdAttach,
        destAttach: this.data.destAttach,
        autoRoute: this.data.autoRoute,
      },
    );
  }
}

export { RxnArrowAdd, RxnArrowDelete };
export * from './RxnArrowMove';
export * from './RxnArrowRotate';
export * from './RxnArrowResize';
export * from './plus';
