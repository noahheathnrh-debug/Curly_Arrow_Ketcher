import type { ChemicalCandidate } from './types';
import { rankChemicalCandidates } from './ranking';

function candidate(
  name: string,
  source: ChemicalCandidate['source'],
  representation: ChemicalCandidate['representation'],
  description?: string,
): ChemicalCandidate {
  return {
    id: `${source}-${name}`,
    name,
    source,
    representation,
    description,
    structure: 'CCO',
  };
}

describe('chemical result ranking', () => {
  it('puts exact expanded molecules ahead of fragments', () => {
    const ranked = rankChemicalCandidates('ethanol', [
      candidate('ethanol group', 'functional-group', 'fragment', 'ethanol'),
      candidate('Ethanol', 'pubchem', 'molecule'),
    ]);

    expect(ranked.map(({ representation }) => representation)).toEqual([
      'molecule',
      'fragment',
    ]);
  });

  it('recognizes an exact abbreviation as an exact local match', () => {
    const ranked = rankChemicalCandidates('2-propanol', [
      candidate('Isopropanol', 'pubchem', 'molecule'),
      candidate('isopropanol', 'salt-or-solvent', 'molecule', '2-propanol'),
    ]);

    expect(ranked[0].source).toBe('salt-or-solvent');
  });
});
