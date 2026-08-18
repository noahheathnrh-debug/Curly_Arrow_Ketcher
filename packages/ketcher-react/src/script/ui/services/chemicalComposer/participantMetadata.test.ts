import { Atom, KetSerializer, Struct, Vec2 } from 'ketcher-core';
import {
  applyParticipantMetadata,
  highestMechanismStep,
  highestSlotForStep,
  readParticipantMetadata,
} from './participantMetadata';

function molecule(): Struct {
  const structure = new Struct();
  structure.atoms.add(new Atom({ label: 'C', pp: new Vec2(0, 0) }));
  structure.markFragments();
  return structure;
}

describe('mechanism participant metadata', () => {
  it('stores and reads step, slot, role, and name', () => {
    const structure = molecule();
    applyParticipantMetadata(structure, {
      step: 2,
      slot: 3,
      role: 'intermediate',
      name: 'carbocation',
    });

    const fragment = structure.frags.get(0);
    expect(readParticipantMetadata(fragment?.properties)).toEqual({
      step: 2,
      slot: 3,
      role: 'intermediate',
      name: 'carbocation',
    });
    expect(highestMechanismStep(structure)).toBe(2);
    expect(highestSlotForStep(structure, 2)).toBe(3);
  });

  it('survives a KET round trip', () => {
    const serializer = new KetSerializer();
    const structure = molecule();
    applyParticipantMetadata(structure, {
      step: 4,
      slot: 1,
      role: 'product',
      name: 'alcohol',
    });

    const restored = serializer.deserialize(serializer.serialize(structure));
    expect(readParticipantMetadata(restored.frags.get(0)?.properties)).toEqual({
      step: 4,
      slot: 1,
      role: 'product',
      name: 'alcohol',
    });
  });

  it('rejects incomplete or nonstandard participant metadata', () => {
    expect(
      readParticipantMetadata([
        { key: 'mnx.mechanism.step', value: '0' },
        { key: 'mnx.mechanism.slot', value: '1' },
        { key: 'mnx.mechanism.role', value: 'reactant' },
      ]),
    ).toBeNull();
    expect(
      readParticipantMetadata([
        { key: 'mnx.mechanism.step', value: '1' },
        { key: 'mnx.mechanism.slot', value: '1' },
        { key: 'mnx.mechanism.role', value: 'spectator' },
      ]),
    ).toBeNull();
  });
});
