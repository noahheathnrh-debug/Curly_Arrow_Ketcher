import type { Struct } from 'ketcher-core';

export type PlacementDensity = 'compact' | 'standard' | 'comfortable';

export type ParticipantRole =
  | 'reactant'
  | 'reagent'
  | 'intermediate'
  | 'product';

export type ChemicalRepresentation = 'molecule' | 'fragment' | 'notation';

export type ChemicalSource =
  | 'direct'
  | 'pubchem'
  | 'template'
  | 'functional-group'
  | 'salt-or-solvent';

export interface ChemicalCandidate {
  id: string;
  name: string;
  structure: string | Struct;
  source: ChemicalSource;
  representation: ChemicalRepresentation;
  formula?: string;
  charge?: number;
  group?: string;
  previewUrl?: string;
  description?: string;
}

export interface TrayChemical extends ChemicalCandidate {
  trayId: string;
  role: ParticipantRole;
}

export interface ChemicalPlacementInput {
  structure: string | Struct;
  name?: string;
  role: ParticipantRole;
}

export interface SavedMechanismSet {
  id: string;
  name: string;
  density: PlacementDensity;
  participants: Array<
    Omit<TrayChemical, 'structure' | 'trayId'> & { structure: string }
  >;
  createdAt: string;
}
