import type { Struct, StructProperty } from 'ketcher-core';
import type { ParticipantRole } from './types';

export const PARTICIPANT_PROPERTY_KEYS = {
  step: 'mnx.mechanism.step',
  slot: 'mnx.mechanism.slot',
  role: 'mnx.mechanism.role',
  name: 'mnx.mechanism.name',
} as const;

export interface ParticipantMetadata {
  step: number;
  slot: number;
  role: ParticipantRole;
  name?: string;
}

const PARTICIPANT_ROLES = new Set<ParticipantRole>([
  'reactant',
  'reagent',
  'intermediate',
  'product',
]);

function setProperty(
  properties: StructProperty[] | undefined,
  key: string,
  value: string,
): StructProperty[] {
  const next = (properties ?? []).filter((property) => property.key !== key);
  next.push({ key, value });
  return next;
}

function propertyValue(
  properties: StructProperty[] | undefined,
  key: string,
): string | undefined {
  return properties?.find((property) => property.key === key)?.value;
}

export function applyParticipantMetadata(
  structure: Struct,
  metadata: ParticipantMetadata,
): Struct {
  structure.frags.forEach((fragment) => {
    if (!fragment) return;
    fragment.properties = applyParticipantProperties(
      fragment.properties,
      metadata,
    );
  });
  return structure;
}

export function applyParticipantProperties(
  source: StructProperty[] | undefined,
  metadata: ParticipantMetadata,
): StructProperty[] {
  let properties = source;
  properties = setProperty(
    properties,
    PARTICIPANT_PROPERTY_KEYS.step,
    String(metadata.step),
  );
  properties = setProperty(
    properties,
    PARTICIPANT_PROPERTY_KEYS.slot,
    String(metadata.slot),
  );
  properties = setProperty(
    properties,
    PARTICIPANT_PROPERTY_KEYS.role,
    metadata.role,
  );
  if (metadata.name) {
    properties = setProperty(
      properties,
      PARTICIPANT_PROPERTY_KEYS.name,
      metadata.name,
    );
  }
  return properties;
}

export function readParticipantMetadata(
  properties: StructProperty[] | undefined,
): ParticipantMetadata | null {
  const step = Number(
    propertyValue(properties, PARTICIPANT_PROPERTY_KEYS.step),
  );
  const slot = Number(
    propertyValue(properties, PARTICIPANT_PROPERTY_KEYS.slot),
  );
  const role = propertyValue(properties, PARTICIPANT_PROPERTY_KEYS.role) as
    | ParticipantRole
    | undefined;

  if (
    !Number.isInteger(step) ||
    step < 1 ||
    !Number.isInteger(slot) ||
    slot < 1 ||
    !role ||
    !PARTICIPANT_ROLES.has(role)
  ) {
    return null;
  }
  return {
    step,
    slot,
    role,
    name: propertyValue(properties, PARTICIPANT_PROPERTY_KEYS.name),
  };
}

export function highestMechanismStep(structure: Struct): number {
  let highest = 0;
  structure.frags.forEach((fragment) => {
    if (!fragment) return;
    const metadata = readParticipantMetadata(fragment.properties);
    if (metadata) highest = Math.max(highest, metadata.step);
  });
  return highest;
}

export function highestSlotForStep(structure: Struct, step: number): number {
  let highest = 0;
  structure.frags.forEach((fragment) => {
    if (!fragment) return;
    const metadata = readParticipantMetadata(fragment.properties);
    if (metadata?.step === step) highest = Math.max(highest, metadata.slot);
  });
  return highest;
}
