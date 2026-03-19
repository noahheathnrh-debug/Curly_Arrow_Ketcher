import { fromToggleExplicitH, ketcherProvider } from 'ketcher-core';
import { useCallback } from 'react';
import { useAppContext } from 'src/hooks';
import Editor from 'src/script/editor';
import { AtomContextMenuProps, ItemEventParams } from '../contextMenu.types';

type Params = ItemEventParams<AtomContextMenuProps>;

const useToggleImplicitH = () => {
  const { ketcherId } = useAppContext();

  const handler = useCallback(
    ({ props }: Params) => {
      const atomIds = props?.atomIds;
      if (!atomIds || atomIds.length === 0) return;

      const editor = ketcherProvider.getKetcher(ketcherId).editor as Editor;
      const restruct = editor.render.ctab;

      atomIds.forEach((atomId) => {
        const action = fromToggleExplicitH(restruct, atomId);
        if (action) editor.update(action);
      });
    },
    [ketcherId],
  );

  return handler;
};

export default useToggleImplicitH;
