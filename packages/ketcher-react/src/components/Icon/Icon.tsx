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
import type { IIconProps } from './types';
import { getIconByName } from './utils/getIconByName';
import { ensureIconSprite } from './iconSprite';

const Icon = ({
  name,
  className,
  title,
  onClick,
  onMouseOver,
  onMouseOut,
  onDoubleClick,
  dataTestId,
}: IIconProps) => {
  const icon = getIconByName(name);
  const iconReference = `#${icon.symbolId}`;

  ensureIconSprite();

  return (
    <svg
      className={className}
      width={icon.width}
      height={icon.height}
      viewBox={icon.viewBox}
      onClick={onClick}
      data-testid={dataTestId}
      // TODO wrap icon into a button and use mouse events there
      onMouseOver={onMouseOver}
      onMouseOut={onMouseOut}
      onDoubleClick={onDoubleClick}
    >
      {title && <title>{title}</title>}
      <use href={iconReference} xlinkHref={iconReference} />
    </svg>
  );
};

export default Icon;
