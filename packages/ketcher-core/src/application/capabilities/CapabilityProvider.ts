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
import {
  CAPABILITY_PROFILES,
  isCapabilityProfileName,
  resolveCapabilities,
} from './profiles';

type Listener = (capabilities: CapabilityRecord) => void;

interface Entry {
  capabilities: CapabilityRecord;
  profile?: CapabilityProfileName;
  listeners: Set<Listener>;
}

/**
 * Holds each editor instance's capabilities.
 *
 * Lives in `ketcher-core`, keyed by editor id, for one reason: the places that
 * have to honour a restriction are spread across both packages and do not share
 * a store. The React toolbars read it through redux, but tool activation and
 * the structural-mutation path are plain classes with no store handle, and they
 * are precisely the paths a hidden button does not cover.
 *
 * Deliberately not part of render options: capabilities are not a drawing
 * concern, and render options are rebuilt wholesale when settings change.
 */
class CapabilityProvider {
  private entries = new Map<string, Entry>();

  private entry(ketcherId: string): Entry {
    let entry = this.entries.get(ketcherId);
    if (!entry) {
      // Absent means unrestricted: an embedder that never mentions capabilities
      // gets the ordinary editor.
      entry = {
        capabilities: { ...CAPABILITY_PROFILES.full },
        profile: 'full',
        listeners: new Set(),
      };
      this.entries.set(ketcherId, entry);
    }
    return entry;
  }

  get(ketcherId: string): CapabilityRecord {
    return this.entry(ketcherId).capabilities;
  }

  can(ketcherId: string, capability: Capability): boolean {
    return this.entry(ketcherId).capabilities[capability];
  }

  /** The profile name, when the host named one rather than listing capabilities. */
  getProfile(ketcherId: string): CapabilityProfileName | undefined {
    return this.entry(ketcherId).profile;
  }

  set(ketcherId: string, spec: CapabilitySpec): void {
    const entry = this.entry(ketcherId);
    entry.capabilities = resolveCapabilities(spec);
    entry.profile = isCapabilityProfileName(spec)
      ? spec
      : typeof spec === 'object' && 'profile' in spec
      ? spec.profile
      : undefined;

    entry.listeners.forEach((listener) => listener(entry.capabilities));
  }

  subscribe(ketcherId: string, listener: Listener): () => void {
    const entry = this.entry(ketcherId);
    entry.listeners.add(listener);
    return () => entry.listeners.delete(listener);
  }

  remove(ketcherId: string): void {
    this.entries.delete(ketcherId);
  }
}

export const capabilityProvider = new CapabilityProvider();
