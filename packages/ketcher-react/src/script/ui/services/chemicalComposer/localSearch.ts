import { SGroup, type SdfItem, type Struct } from 'ketcher-core';
import type { ChemicalCandidate, ChemicalSource } from './types';

/**
 * Ketcher's functional-group and salts/solvents libraries intentionally store
 * many complete structures inside contracted SUP groups. That is useful for
 * abbreviation tools, but the composer promises editable atom-and-bond
 * structures. Remove the presentation wrapper from a clone while retaining
 * every underlying atom and bond.
 */
function expandForChemicalComposer(source: Struct): Struct {
  const structure = source.clone();
  const superatomIds: number[] = [];

  structure.sgroups.forEach((sgroup, id) => {
    if (sgroup.type === SGroup.TYPES.SUP) superatomIds.push(id);
  });
  superatomIds.forEach((id) => structure.sGroupDelete(id));
  structure.functionalGroups.clear();

  return structure;
}

function searchableText(item: SdfItem): string {
  return [
    item.struct.name,
    item.props.name,
    item.props.abbreviation,
    item.props.group,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function candidateName(item: SdfItem): string {
  return String(
    item.props.name ||
      item.props.abbreviation ||
      item.struct.name ||
      'Unnamed structure',
  );
}

function toCandidate(
  item: SdfItem,
  source: ChemicalSource,
  index: number,
): ChemicalCandidate {
  const name = candidateName(item);
  return {
    id: `${source}-${name}-${index}`,
    name,
    group: item.props.group ? String(item.props.group) : undefined,
    description: item.props.abbreviation
      ? String(item.props.abbreviation)
      : undefined,
    structure: expandForChemicalComposer(item.struct),
    source,
    representation: source === 'functional-group' ? 'fragment' : 'molecule',
  };
}

export function searchLocalChemicals(
  query: string,
  libraries: {
    templates: SdfItem[];
    functionalGroups: SdfItem[];
    saltsAndSolvents: SdfItem[];
  },
  limit = 12,
): ChemicalCandidate[] {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const sources: Array<[SdfItem[], ChemicalSource]> = [
    [libraries.templates, 'template'],
    [libraries.functionalGroups, 'functional-group'],
    [libraries.saltsAndSolvents, 'salt-or-solvent'],
  ];

  return sources
    .flatMap(([items, source]) =>
      items.map((item, index) => ({ item, source, index })),
    )
    .filter(({ item }) => searchableText(item).includes(normalizedQuery))
    .slice(0, limit)
    .map(({ item, source, index }) => toCandidate(item, source, index));
}
