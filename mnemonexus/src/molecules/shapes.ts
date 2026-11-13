import type { StructureSpec } from '../engine/molecule';

/**
 * The textbook VSEPR set, one molecule per arrangement (and a few that are commonly confused), built by the engine
 * with expanded octets allowed. The centre atom is always `X`; its charge, if any, sits on it.
 */
export interface ShapeExample { id: string; name: string; formula: string; spec: StructureSpec; note?: string }

const centred = (central: string, ligands: [string, number, number?][], charge = 0, h = 0): StructureSpec => ({
  atoms: [{ id: 'X', el: central, charge, h }, ...ligands.map(([el, , ligandH], i) => ({ id: `L${i + 1}`, el, ...(ligandH ? { h: ligandH } : {}) }))],
  bonds: ligands.map(([, order], i) => ({ a: 'X', b: `L${i + 1}`, order })),
});
const repeat = (el: string, n: number, order = 1): [string, number][] => Array.from({ length: n }, () => [el, order]);

export const SHAPE_EXAMPLES: readonly ShapeExample[] = [
  { id: 'becl2', name: 'Beryllium chloride', formula: 'BeCl₂', spec: centred('Be', repeat('Cl', 2)), note: 'Beryllium has only four electrons around it: two domains, as far apart as they can be.' },
  { id: 'co2', name: 'Carbon dioxide', formula: 'CO₂', spec: centred('C', repeat('O', 2, 2)), note: 'A double bond counts as one domain, so carbon has two.' },
  { id: 'bf3', name: 'Boron trifluoride', formula: 'BF₃', spec: centred('B', repeat('F', 3)) },
  { id: 'so2', name: 'Sulfur dioxide', formula: 'SO₂', spec: centred('S', repeat('O', 2, 2)), note: 'Three domains, one of them a lone pair: bent, not linear.' },
  { id: 'ch4', name: 'Methane', formula: 'CH₄', spec: { atoms: [{ id: 'X', el: 'C', h: 4 }], bonds: [] } },
  { id: 'nh3', name: 'Ammonia', formula: 'NH₃', spec: { atoms: [{ id: 'X', el: 'N', h: 3 }], bonds: [] }, note: 'The lone pair repels the bonds more than they repel each other, squeezing the angle below 109.5°.' },
  { id: 'nh4', name: 'Ammonium ion', formula: 'NH₄⁺', spec: { atoms: [{ id: 'X', el: 'N', h: 4, charge: 1 }], bonds: [] }, note: 'The same atoms as ammonia plus one proton: the lone pair becomes a bond, and the shape becomes tetrahedral.' },
  { id: 'h2o', name: 'Water', formula: 'H₂O', spec: { atoms: [{ id: 'X', el: 'O', h: 2 }], bonds: [] }, note: 'Two lone pairs squeeze the angle more than one does.' },
  { id: 'h3o', name: 'Oxonium ion', formula: 'H₃O⁺', spec: { atoms: [{ id: 'X', el: 'O', h: 3, charge: 1 }], bonds: [] } },
  { id: 'pcl5', name: 'Phosphorus pentachloride', formula: 'PCl₅', spec: centred('P', repeat('Cl', 5)) },
  { id: 'sf4', name: 'Sulfur tetrafluoride', formula: 'SF₄', spec: centred('S', repeat('F', 4)), note: 'The lone pair takes an equatorial position, where it has more room.' },
  { id: 'clf3', name: 'Chlorine trifluoride', formula: 'ClF₃', spec: centred('Cl', repeat('F', 3)) },
  { id: 'xef2', name: 'Xenon difluoride', formula: 'XeF₂', spec: centred('Xe', repeat('F', 2)), note: 'Three lone pairs fill the equator; the two fluorines sit opposite each other.' },
  { id: 'sf6', name: 'Sulfur hexafluoride', formula: 'SF₆', spec: centred('S', repeat('F', 6)) },
  { id: 'brf5', name: 'Bromine pentafluoride', formula: 'BrF₅', spec: centred('Br', repeat('F', 5)) },
  { id: 'xef4', name: 'Xenon tetrafluoride', formula: 'XeF₄', spec: centred('Xe', repeat('F', 4)), note: 'The two lone pairs sit opposite each other, leaving the fluorines in a square.' },
];
