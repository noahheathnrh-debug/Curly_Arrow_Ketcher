import type { ChemicalCandidate } from './types';

const REPRESENTATION_PRIORITY = {
  molecule: 0,
  notation: 1,
  fragment: 2,
} as const;

const SOURCE_PRIORITY = {
  'salt-or-solvent': 0,
  template: 1,
  pubchem: 2,
  direct: 3,
  'functional-group': 4,
} as const;

function normalized(value: string | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function matchScore(query: string, candidate: ChemicalCandidate): number {
  const values = [candidate.name, candidate.description, candidate.formula].map(
    normalized,
  );
  if (values.includes(query)) return 0;
  if (values.some((value) => value.startsWith(query))) return 1;
  if (values.some((value) => value.includes(query))) return 2;
  return 3;
}

export function rankChemicalCandidates(
  query: string,
  candidates: ChemicalCandidate[],
): ChemicalCandidate[] {
  const normalizedQuery = normalized(query);
  return [...candidates].sort((left, right) => {
    return (
      matchScore(normalizedQuery, left) - matchScore(normalizedQuery, right) ||
      REPRESENTATION_PRIORITY[left.representation] -
        REPRESENTATION_PRIORITY[right.representation] ||
      SOURCE_PRIORITY[left.source] - SOURCE_PRIORITY[right.source] ||
      left.name.localeCompare(right.name)
    );
  });
}
