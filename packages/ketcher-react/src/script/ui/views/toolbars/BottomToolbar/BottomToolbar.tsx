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

import type { FC, PropsWithChildren } from 'react';
import {
  type ToolbarGroupItemCallProps,
  type ToolbarGroupItemProps,
  ToolbarGroupItem,
} from '../ToolbarGroupItem';

import { TemplatesList } from './TemplatesList';
import classes from './BottomToolbar.module.less';
import clsx from 'clsx';
import { MechanismStepBar } from './MechanismStepBar';
import type { MechanismStepSummary } from '../../../state/mechanismSteps';

const Group: FC<{ className?: string } & PropsWithChildren> = ({
  children,
  className,
}) => <div className={clsx(classes.group, className)}>{children}</div>;

interface BottomToolbarProps
  extends Omit<ToolbarGroupItemProps, 'id' | 'options'> {
  className?: string;
  active?: {
    opts: any;
    tool: string;
  };
  mechanismControlsEnabled: boolean;
  stepSummary: MechanismStepSummary;
}

interface BottomToolbarCallProps extends ToolbarGroupItemCallProps {
  onPreviousStep: () => void;
  onNextStep: () => void;
  onArrangeStep: () => void;
  onDuplicateStep: () => void;
  onAddChemical: () => void;
}

type Props = BottomToolbarProps & BottomToolbarCallProps;

const BottomToolbar = (props: Props) => {
  const {
    className,
    mechanismControlsEnabled,
    stepSummary,
    onPreviousStep,
    onNextStep,
    onArrangeStep,
    onDuplicateStep,
    onAddChemical,
    ...rest
  } = props;

  return (
    <div data-testid="bottom-toolbar" className={clsx(classes.root, className)}>
      <Group>
        <TemplatesList {...rest} />
        <ToolbarGroupItem id="chemical-composer" {...rest} />
        <ToolbarGroupItem id="template-lib" {...rest} />
      </Group>
      {mechanismControlsEnabled && (
        <MechanismStepBar
          summary={stepSummary}
          onPrevious={onPreviousStep}
          onNext={onNextStep}
          onArrange={onArrangeStep}
          onDuplicate={onDuplicateStep}
          onAddChemical={onAddChemical}
        />
      )}
    </div>
  );
};

export type { BottomToolbarProps, BottomToolbarCallProps };
export { BottomToolbar };
