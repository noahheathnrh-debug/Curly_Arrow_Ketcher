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

import { lazy, type ComponentType } from 'react';

const lazyComponent = (
  loader: () => Promise<unknown>,
  exportName = 'default',
) =>
  lazy(async () => {
    const module = (await loader()) as Record<
      string,
      ComponentType<Record<string, unknown>>
    >;

    return { default: module[exportName] };
  });

export default {
  open: lazyComponent(() => import('../views/modal/components/document/Open')),
  analyse: lazyComponent(
    () => import('../views/modal/components/process/Analyse'),
  ),
  recognize: lazyComponent(
    () => import('../views/modal/components/process/Recognize'),
  ),
  'period-table': lazyComponent(
    () => import('../views/modal/components/PeriodTable'),
  ),
  'extended-table': lazyComponent(
    () => import('../views/modal/components/ExtendedTable'),
  ),
  rgroup: lazyComponent(() => import('./toolbox/rgroup/rgroup')),
  attach: lazyComponent(() => import('./template/template-attach')),
  templates: lazyComponent(() => import('./template/TemplateDialog')),
  about: lazyComponent(() => import('../views/modal/components/meta/About')),
  miew: lazyComponent(() => import('../views/modal/components/process/Miew')),
  atomProps: lazyComponent(
    () => import('../views/modal/components/toolbox/Atom'),
  ),
  attachmentPoints: lazyComponent(
    () => import('../views/modal/components/toolbox/Attach'),
  ),
  automap: lazyComponent(
    () => import('../views/modal/components/toolbox/Automap'),
  ),
  bondProps: lazyComponent(
    () => import('../views/modal/components/toolbox/Bond'),
  ),
  check: lazyComponent(() => import('../views/modal/components/process/Check')),
  enhancedStereo: lazyComponent(
    () => import('./toolbox/enhancedStereo/enhancedStereo'),
  ),
  labelEdit: lazyComponent(() => import('./toolbox/labeledit')),
  rgroupLogic: lazyComponent(
    () => import('../views/modal/components/toolbox/RgroupLogic'),
  ),
  removeFG: lazyComponent(
    () => import('../views/modal/components/toolbox/FG/RemoveFG'),
    'RemoveFG',
  ),
  save: lazyComponent(() => import('../views/modal/components/document/Save')),
  settings: lazyComponent(
    () => import('../views/modal/components/meta/Settings'),
  ),
  sgroup: lazyComponent(() => import('./toolbox/sgroup')),
  text: lazyComponent(() => import('../views/modal/components/Text')),
  confirm: lazyComponent(
    () => import('../views/modal/components/Confirm'),
    'Confirm',
  ),
  'info-modal': lazyComponent(
    () => import('../views/modal/components/InfoModal'),
  ),
  'chemical-composer': lazyComponent(() => import('./ChemicalComposer')),
} as any;
