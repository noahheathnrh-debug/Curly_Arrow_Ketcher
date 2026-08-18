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

import { type RefObject, useRef } from 'react';
import { CREATE_MONOMER_TOOL_NAME, IMAGE_KEY } from 'ketcher-core';
import {
  type ToolbarGroupItemCallProps,
  type ToolbarGroupItemProps,
  ToolbarGroupItem,
} from '../ToolbarGroupItem';
import type { ToolbarItem, ToolbarItemVariant } from '../toolbar.types';
import {
  arrowsOptions,
  bondCommon,
  bondQuery,
  bondSpecial,
  bondStereo,
  mappingOptions,
  rGroupOptions,
  selectOptions,
  shapeOptions,
} from './leftToolbarOptions';

import { ArrowScroll } from '../ArrowScroll';
import { Bond } from './Bond';
import { RGroup } from './RGroup';
import { Shape } from './Shape';
import classes from './LeftToolbar.module.less';
import clsx from 'clsx';
import { useInView } from 'react-intersection-observer';
import { useResizeObserver } from '../../../../../hooks';
import { MECHANISM_LEFT_TOOL_IDS } from '../../../state/mechanismControls';

interface LeftToolbarProps
  extends Omit<ToolbarGroupItemProps, 'id' | 'options'> {
  className?: string;
  mechanismControlsEnabled: boolean;
}

type LeftToolbarCallProps = ToolbarGroupItemCallProps;

type Props = LeftToolbarProps & LeftToolbarCallProps;

type ItemProps = {
  id: ToolbarItemVariant;
  options?: ToolbarItem[];
  dataTestId?: string;
};

interface GroupProps {
  items?: ItemProps[];
  className?: string;
  height?: number;
  rest: Omit<Props, 'className' | 'mechanismControlsEnabled'>;
}

const Group = ({ items, className, height, rest }: GroupProps) => {
  const { status } = rest;
  const visibleItems =
    items?.reduce<ItemProps[]>(
      (acc, item) =>
        status[item.id]?.hidden ||
        item.options?.every((option) => status[option.id]?.hidden)
          ? acc
          : acc.concat(item),
      [],
    ) ?? [];

  return visibleItems.length ? (
    <div className={clsx(classes.group, className)}>
      {visibleItems.map((item) => {
        switch (item.id) {
          case 'bond-common':
            return <Bond {...rest} height={height} key={item.id} />;
          case 'rgroup':
            return <RGroup {...rest} key={item.id} />;
          case 'shapes':
            return <Shape {...rest} key={item.id} />;
          case 'bonds':
            return (
              <ToolbarGroupItem
                id={item.id}
                options={item.options}
                key={item.id}
                dataTestId="bonds"
                {...rest}
              />
            );
          default:
            return (
              <ToolbarGroupItem
                id={item.id}
                options={item.options}
                key={item.id}
                {...rest}
              />
            );
        }
      })}
    </div>
  ) : null;
};

const LeftToolbar = (props: Props) => {
  const { className, mechanismControlsEnabled, ...rest } = props;
  const { ref, height } = useResizeObserver<HTMLDivElement>();
  const scrollRef = useRef(null) as RefObject<HTMLDivElement | null>;
  const [startRef, startInView] = useInView({ threshold: 1 });
  const [endRef, endInView] = useInView({ threshold: 1 });
  const sizeRef = useRef(null) as RefObject<HTMLDivElement | null>;

  const scrollUp = () => {
    if (!scrollRef.current || !sizeRef.current) {
      return;
    }

    scrollRef.current.scrollTop -= sizeRef.current.offsetHeight;
  };

  const scrollDown = () => {
    if (!scrollRef.current || !sizeRef.current) {
      return;
    }

    scrollRef.current.scrollTop += sizeRef.current.offsetHeight;
  };

  const primaryItems: ItemProps[] = [
    { id: 'hand' },
    { id: 'select', options: selectOptions },
    { id: 'erase' },
  ];
  const structureItems: ItemProps[] = [
    {
      id: 'bonds',
      options: [...bondCommon, ...bondQuery, ...bondSpecial, ...bondStereo],
    },
    { id: 'chain' },
    { id: 'enhanced-stereo' },
    {
      id: 'charge',
      options: [
        { id: 'charge-plus' },
        { id: 'charge-minus' },
        { id: 'radical' },
      ],
    },
    { id: 'lone-pair' },
    { id: 'curly-arrow' },
  ];
  const reactionItems: ItemProps[] = [
    { id: 'reaction-plus' },
    { id: 'arrows', options: arrowsOptions },
    {
      id: 'reaction-mapping-tools',
      options: mappingOptions,
    },
  ];
  const focusedItems = [...primaryItems, ...structureItems, ...reactionItems]
    .filter((item) => MECHANISM_LEFT_TOOL_IDS.has(item.id))
    .map((item) =>
      item.id === 'bonds'
        ? {
            ...item,
            options: [
              ...bondCommon,
              ...bondStereo,
              { id: 'bond-aromatic' as const },
              { id: 'bond-dative' as const },
            ],
          }
        : item,
    );

  return (
    <div
      data-testid="left-toolbar"
      className={clsx(classes.root, className)}
      ref={ref}
    >
      <div
        className={classes.buttons}
        ref={scrollRef}
        data-testid="left-toolbar-buttons"
      >
        {mechanismControlsEnabled ? (
          <div className={classes.listener} ref={startRef}>
            <Group
              className={classes.groupItem}
              items={focusedItems}
              height={height}
              rest={rest}
            />
          </div>
        ) : (
          <>
            <div className={classes.listener} ref={startRef}>
              <Group
                className={classes.groupItem}
                items={primaryItems}
                height={height}
                rest={rest}
              />
            </div>

            <Group
              className={classes.groupItem}
              items={structureItems}
              height={height}
              rest={rest}
            />
            <div className={classes.listener} ref={sizeRef}>
              <Group
                className={classes.groupItem}
                items={[
                  { id: 'sgroup' },
                  { id: 'rgroup', options: rGroupOptions },
                  { id: CREATE_MONOMER_TOOL_NAME },
                ]}
                height={height}
                rest={rest}
              />
            </div>

            <Group
              className={classes.groupItem}
              items={reactionItems}
              height={height}
              rest={rest}
            />

            <div ref={endRef}>
              <Group
                className={classes.groupItem}
                items={[
                  { id: 'shapes', options: shapeOptions },
                  { id: 'text' },
                  { id: IMAGE_KEY },
                ]}
                height={height}
                rest={rest}
              />
            </div>
          </>
        )}
      </div>
      {height && (scrollRef?.current?.scrollHeight || 0) > height && (
        <ArrowScroll
          startInView={startInView}
          endInView={endInView}
          scrollForward={scrollDown}
          scrollBack={scrollUp}
        />
      )}
    </div>
  );
};

export type { LeftToolbarProps, LeftToolbarCallProps };
export { LeftToolbar };
