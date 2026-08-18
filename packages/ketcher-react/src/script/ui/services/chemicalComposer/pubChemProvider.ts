import type { ChemicalCandidate } from './types';

const PUBCHEM_BASE_URL = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound';

interface PubChemProperty {
  CID: number;
  Title?: string;
  MolecularFormula?: string;
  Charge?: number;
  SMILES?: string;
  ConnectivitySMILES?: string;
}

interface PubChemResponse {
  PropertyTable?: {
    Properties?: PubChemProperty[];
  };
}

export class ChemicalLookupError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ChemicalLookupError';
  }
}

export async function searchPubChemByName(
  query: string,
  signal?: AbortSignal,
): Promise<ChemicalCandidate[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const propertyUrl = `${PUBCHEM_BASE_URL}/name/${encodeURIComponent(
    normalizedQuery,
  )}/property/Title,MolecularFormula,Charge,ConnectivitySMILES,SMILES/JSON`;
  const response = await fetch(propertyUrl, { signal });

  if (response.status === 404) return [];
  if (!response.ok) {
    throw new ChemicalLookupError(
      `PubChem lookup failed (${response.status}). Try a structure notation or a local template.`,
    );
  }

  const payload = (await response.json()) as PubChemResponse;
  const properties = payload.PropertyTable?.Properties ?? [];

  return properties.flatMap((property) => {
    const structure = property.SMILES ?? property.ConnectivitySMILES;
    if (!structure) return [];

    return [
      {
        id: `pubchem-${property.CID}`,
        name: property.Title || normalizedQuery,
        formula: property.MolecularFormula,
        charge: property.Charge,
        structure,
        source: 'pubchem' as const,
        representation: 'molecule' as const,
        description: `PubChem CID ${property.CID}`,
        previewUrl: `${PUBCHEM_BASE_URL}/cid/${property.CID}/PNG?image_size=240x180`,
      },
    ];
  });
}

export function looksLikeStructureNotation(query: string): boolean {
  const value = query.trim();
  if (
    value.startsWith('InChI=') ||
    value.startsWith('{') ||
    value.includes('M  END')
  ) {
    return true;
  }
  if (!value || /\s/.test(value)) return false;

  // Square-bracket atoms are unambiguous SMILES syntax and may contain any
  // element symbol, isotope, chirality or charge notation.
  if (/\[[^\]]+\]/.test(value)) return true;

  // Keep this deliberately conservative. A false positive bypasses the name
  // service and may cause Ketcher to interpret a name as canvas text. In
  // particular, a digit alone is not a SMILES signal: names such as
  // "2-propanol" and "1,2-dichloroethane" contain locants.
  const commonOrganicSmiles = /^(?:B|C|N|O|P|S|F|I|Cl|Br|b|c|n|o|p|s)+$/;
  const smilesCharacters =
    /^(?:Br|Cl|[-BCNOPSFIHbcnops0-9()[\]{}=#+@\\/%.*:])+$/;
  const notationCharacters = [
    '[',
    ']',
    '(',
    ')',
    '=',
    '#',
    '@',
    '\\',
    '/',
    '.',
    '+',
    '-',
  ];
  const ringLabels = value.replace(/\[[^\]]*\]/g, '').match(/%\d{2}|\d/g);
  const hasPairedRingClosure =
    ringLabels?.some((label, index) => ringLabels.indexOf(label) !== index) ??
    false;

  return (
    commonOrganicSmiles.test(value) ||
    (smilesCharacters.test(value) &&
      (hasPairedRingClosure ||
        notationCharacters.some((character) => value.includes(character))))
  );
}

export function createDirectNotationCandidate(
  query: string,
): ChemicalCandidate | null {
  const structure = query.trim();
  if (!looksLikeStructureNotation(structure)) return null;
  return {
    id: `direct-${structure}`,
    name: structure,
    description: 'Structure notation',
    structure,
    source: 'direct',
    representation: 'notation',
  };
}
