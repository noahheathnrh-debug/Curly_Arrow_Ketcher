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
  type BottomToolbarCallProps,
  type BottomToolbarProps,
  BottomToolbar,
} from './BottomToolbar';

import type { ComponentType } from 'react';
import type { Dispatch } from 'redux';
import { connect } from 'react-redux';
import { onAction } from '../../../state';
import action from '../../../action';
import {
  arrangeActiveMechanismStep,
  duplicateActiveMechanismStep,
  getMechanismStepSummary,
  navigateMechanismStep,
} from '../../../state/mechanismSteps';

type StateProps = Omit<BottomToolbarProps, 'className'>;
type OwnProps = Pick<BottomToolbarProps, 'className'>;
const disableableButtons = [];

const mapStateToProps = (state): StateProps => ({
  active: state.actionState?.activeTool,
  status: state.actionState ?? {},
  opened: state.toolbar.opened,
  indigoVerification: state.requestsStatuses.indigoVerification,
  disableableButtons,
  mechanismControlsEnabled: Boolean(state.toolbar.mechanismControlsEnabled),
  stepSummary: getMechanismStepSummary(state.editor),
});

const mapDispatchToProps = (dispatch: Dispatch): BottomToolbarCallProps => ({
  onAction: (action) => dispatch(onAction(action)),
  onOpen: (menuName, isSelected) =>
    dispatch({
      type: 'OPENED',
      data: { menuName, isSelected },
    }),
  onPreviousStep: () => dispatch(navigateMechanismStep(-1) as never),
  onNextStep: () => dispatch(navigateMechanismStep(1) as never),
  onArrangeStep: () => dispatch(arrangeActiveMechanismStep() as never),
  onDuplicateStep: () => dispatch(duplicateActiveMechanismStep() as never),
  onAddChemical: () => dispatch(onAction(action['chemical-composer'].action)),
});

const BottomToolbarContainer: ComponentType<OwnProps> = connect(
  mapStateToProps,
  mapDispatchToProps,
)(BottomToolbar);

export { BottomToolbarContainer };
