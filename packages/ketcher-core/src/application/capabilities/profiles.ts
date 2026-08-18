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

import type {
  Capability,
  CapabilityProfileName,
  CapabilityRecord,
  CapabilitySpec,
} from './types';

export const ALL_CAPABILITIES: Capability[] = [
  'editAtoms',
  'editBonds',
  'moveStructures',
  'drawMechanismArrows',
  'editExplicitHydrogens',
  'showLonePairs',
  'panAndZoom',
  'importFiles',
  'exportFiles',
];

function record(granted: Capability[]): CapabilityRecord {
  return ALL_CAPABILITIES.reduce((acc, capability) => {
    acc[capability] = granted.includes(capability);
    return acc;
  }, {} as CapabilityRecord);
}

const EVERYTHING = record(ALL_CAPABILITIES);

/**
 * `full` is the default, so an embedder that says nothing gets today's editor
 * unchanged. Every restriction is something a host asked for.
 */
export const CAPABILITY_PROFILES: Record<
  CapabilityProfileName,
  CapabilityRecord
> = {
  full: EVERYTHING,

  // A presentation narrowing, not a lock: mechanism drawing needs the full
  // chemistry toolset, it just does not need reaction arrows, R-groups and the
  // rest cluttering the toolbar. Which controls are shown is decided elsewhere.
  mechanism: EVERYTHING,

  // The learner is given a structure and asked what the electrons do. The
  // chemistry is frozen so the answer stays comparable to the expected one;
  // everything needed to *read* the structure stays available.
  'puzzle-arrow-only': record([
    'drawMechanismArrows',
    'editExplicitHydrogens',
    'showLonePairs',
    'panAndZoom',
  ]),

  // The learner builds or edits a structure instead — draw the product, fix the
  // charge. No arrows, because the question is not about electron flow.
  'puzzle-construction': record([
    'editAtoms',
    'editBonds',
    'moveStructures',
    'editExplicitHydrogens',
    'showLonePairs',
    'panAndZoom',
  ]),

  // Playback of a finished mechanism. Nothing may change; exporting is allowed
  // so a learner can keep a copy of the worked answer.
  review: record(['showLonePairs', 'panAndZoom', 'exportFiles']),

  author: EVERYTHING,
};

export function isCapabilityProfileName(
  value: unknown,
): value is CapabilityProfileName {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(CAPABILITY_PROFILES, value)
  );
}

/**
 * Turn whatever the host supplied into a complete record.
 *
 * A bare partial record is read as an override of `full`, so `{editAtoms:
 * false}` means "everything except editing atoms" rather than "nothing but".
 * Withholding one capability should not silently withhold the other eight.
 */
export function resolveCapabilities(spec?: CapabilitySpec): CapabilityRecord {
  if (spec === undefined) return { ...CAPABILITY_PROFILES.full };

  if (isCapabilityProfileName(spec)) {
    return { ...CAPABILITY_PROFILES[spec] };
  }

  if ('profile' in spec && isCapabilityProfileName(spec.profile)) {
    return {
      ...CAPABILITY_PROFILES[spec.profile],
      ...(spec.overrides ?? {}),
    };
  }

  return {
    ...CAPABILITY_PROFILES.full,
    ...(spec as Partial<CapabilityRecord>),
  };
}
