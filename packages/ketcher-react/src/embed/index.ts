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

/**
 * The surface an embedding application is meant to use.
 *
 * The package as a whole exports a great deal more, most of it internal. What is
 * re-exported here is the part intended to stay stable for embedders — so a host
 * importing only from this module is importing the supported contract.
 */
export * from './MechanismEditor';
export * from './createApi';
export * from './watchArrows';
export * from './types';
