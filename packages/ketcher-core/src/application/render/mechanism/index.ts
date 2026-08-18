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
 * Obstacle-aware routing for mechanism (curly and fishhook) arrows.
 *
 * The pipeline is deliberately one-directional:
 *
 *   chemical meaning -> endpoint anchors -> candidate curves -> scoring -> shape
 *
 * Chemistry decides the anchors; the router only ever chooses a shape. Nothing
 * here reads a pointer position or writes to the model, and nothing depends on
 * Raphael or the DOM, so the whole thing is exercisable in a unit test.
 */

export * from './types';
export * from './constants';
export * from './geometry';
export * from './metrics';
export * from './renderMetrics';
export * from './obstacles';
export * from './anchors';
export * from './route';
