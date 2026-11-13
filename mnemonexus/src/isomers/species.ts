/**
 * Isomers (Molecules): the molecules asked about. Each is a SMILES (Kekulé form, so no aromatic bonds), laid out once by
 * Indigo into `layouts.json` (`bun run tools/isomers/layout.ts`), with Indigo's own R/S and E/Z labels kept beside
 * it. Names carry no R/S or E/Z, so a name can never contradict the drawing. The answers are worked out from the
 * drawing by `cip.ts` and `relation.ts`; the tests hold them to Indigo's labels.
 */

export type StereoKind = 'rs' | 'ez';
export interface StereoItem {
  id: string;
  name: string;
  smiles: string;
  kind: StereoKind;
  /** 1: one centre or double bond; 2: groups that only differ further out; 3: two centres or two double bonds. */
  level: 1 | 2 | 3;
}

const rs = (id: string, name: string, smiles: string, level: 1 | 2 | 3): StereoItem => ({ id, name, smiles, kind: 'rs', level });
const ez = (id: string, name: string, smiles: string, level: 1 | 2 | 3): StereoItem => ({ id, name, smiles, kind: 'ez', level });

export const STEREO_ITEMS: readonly StereoItem[] = [
  rs('bcf-methane', 'Bromochlorofluoromethane', 'F[C@H](Cl)Br', 1),
  rs('chlorofluoroethane', '1-chloro-1-fluoroethane', 'C[C@H](F)Cl', 1),
  rs('butan-2-ol', 'Butan-2-ol', 'C[C@H](O)CC', 1),
  rs('bromobutane', '2-bromobutane', 'C[C@@H](Br)CC', 1),
  rs('chlorobutane', '2-chlorobutane', 'CC[C@@H](C)Cl', 1),
  rs('lactic-acid', 'Lactic acid (2-hydroxypropanoic acid)', 'C[C@@H](O)C(=O)O', 1),
  rs('alanine', 'Alanine', 'C[C@H](N)C(=O)O', 1),
  rs('glyceraldehyde', 'Glyceraldehyde', 'O=C[C@H](O)CO', 2),
  rs('methylhexane', '3-methylhexane', 'CCC[C@@H](C)CC', 2),
  rs('methylbutanol', '2-methylbutan-1-ol', 'C[C@@H](CC)CO', 2),
  rs('methylpentene', '3-methylpent-1-ene', 'C=C[C@H](C)CC', 2),
  rs('bromomethylbutane', '1-bromo-2-methylbutane', 'CC[C@H](C)CBr', 2),
  rs('methylbutanal', '2-methylbutanal', 'CC[C@H](C)C=O', 2),
  rs('ibuprofen', 'Ibuprofen', 'CC(C)CC1=CC=C(C=C1)[C@H](C)C(=O)O', 2),
  rs('bromochlorobutane', '2-bromo-3-chlorobutane', 'C[C@@H](Br)[C@H](C)Cl', 3),
  rs('threonine', 'Threonine', 'C[C@@H](O)[C@H](N)C(=O)O', 3),
  rs('dibromopentane', '2,3-dibromopentane', 'CC[C@@H](Br)[C@H](C)Br', 3),
  rs('butanediol', 'Butane-2,3-diol', 'C[C@@H](O)[C@@H](C)O', 3),
  ez('but-2-ene-e', 'But-2-ene', 'C/C=C/C', 1),
  ez('but-2-ene-z', 'But-2-ene', 'C/C=C\\C', 1),
  ez('pent-2-ene', 'Pent-2-ene', 'CC/C=C\\C', 1),
  ez('dichloroethene', '1,2-dichloroethene', 'Cl/C=C\\Cl', 1),
  ez('propene', 'Propene', 'C=CC', 1),
  ez('methylbutene', '2-methylbut-2-ene', 'CC=C(C)C', 1),
  ez('bromobutene', '2-bromobut-2-ene', 'C/C=C(/C)Br', 2),
  ez('methylpentene-2', '3-methylpent-2-ene', 'CC/C(C)=C/C', 2),
  ez('crotonic-acid', 'But-2-enoic acid', 'C/C=C/C(=O)O', 2),
  ez('cinnamic-acid', 'Cinnamic acid (3-phenylpropenoic acid)', 'OC(=O)/C=C/C1=CC=CC=C1', 2),
  ez('chloromethylbutene', '1-chloro-2-methylbut-1-ene', 'CC/C(C)=C/Cl', 2),
  ez('bromochloropropene', '1-bromo-1-chloropropene', 'C/C=C(\\Cl)Br', 2),
  ez('hexadiene', 'Hexa-2,4-diene', 'C/C=C/C=C\\C', 3),
];

export type Relation = 'same' | 'structural' | 'ez' | 'enantiomers' | 'diastereomers' | 'not-isomers';
export const RELATION_LABELS: Readonly<Record<Relation, string>> = {
  same: 'The same molecule',
  structural: 'Structural isomers',
  ez: 'E/Z isomers',
  enantiomers: 'Enantiomers (optical isomers)',
  diastereomers: 'Diastereomers',
  'not-isomers': 'Not isomers',
};

export interface IsomerPair {
  id: string;
  /** What the two are, without giving the answer away. */
  title: string;
  a: string;
  b: string;
  /** The relation the pair was written to show; the tests hold it to the relation worked out from the drawings. */
  meant: Relation;
  level: 1 | 2;
}

const pair = (id: string, title: string, a: string, b: string, meant: Relation, level: 1 | 2 = 1): IsomerPair => ({ id, title, a, b, meant, level });

export const PAIRS: readonly IsomerPair[] = [
  pair('butanols', 'Two alcohols, C₄H₁₀O', 'CCCCO', 'CCC(C)O', 'structural'),
  pair('ethanol-ether', 'Two compounds, C₂H₆O', 'CCO', 'COC', 'structural'),
  pair('propanal-propanone', 'Two carbonyl compounds, C₃H₆O', 'CCC=O', 'CC(C)=O', 'structural'),
  pair('pentanes', 'Two alkanes, C₅H₁₂', 'CCCCC', 'CCC(C)C', 'structural'),
  pair('chloropropanes', 'Two chloroalkanes, C₃H₇Cl', 'CCCCl', 'CC(C)Cl', 'structural'),
  pair('butenes', 'Two alkenes, C₄H₈', 'C=CCC', 'C/C=C/C', 'structural'),
  pair('butane-butene', 'Butane and but-1-ene', 'CCCC', 'C=CCC', 'not-isomers'),
  pair('but-2-enes', 'Two but-2-enes', 'C/C=C/C', 'C/C=C\\C', 'ez'),
  pair('dichloroethenes', 'Two 1,2-dichloroethenes', 'Cl/C=C/Cl', 'Cl/C=C\\Cl', 'ez'),
  pair('butan-2-ols', 'Two butan-2-ols', 'C[C@H](O)CC', 'C[C@@H](O)CC', 'enantiomers'),
  pair('alanines', 'Two alanines', 'C[C@H](N)C(=O)O', 'C[C@@H](N)C(=O)O', 'enantiomers'),
  pair('butan-2-ol-redrawn', 'Two butan-2-ols', 'C[C@H](O)CC', 'CC[C@H](C)O', 'same'),
  pair('lactic-redrawn', 'Two lactic acids', 'C[C@@H](O)C(=O)O', 'OC(=O)[C@@H](C)O', 'same', 2),
  pair('dibromobutanes-mirror', 'Two 2,3-dibromobutanes', 'C[C@@H](Br)[C@@H](C)Br', 'C[C@H](Br)[C@H](C)Br', 'enantiomers', 2),
  pair('dibromobutanes-dia', 'Two 2,3-dibromobutanes', 'C[C@@H](Br)[C@@H](C)Br', 'C[C@@H](Br)[C@H](C)Br', 'diastereomers', 2),
  pair('threonines', 'Threonine and allothreonine', 'C[C@@H](O)[C@H](N)C(=O)O', 'C[C@H](O)[C@H](N)C(=O)O', 'diastereomers', 2),
  pair('meso-diols', 'Two butane-2,3-diols', 'C[C@@H](O)[C@H](C)O', 'C[C@H](O)[C@@H](C)O', 'same', 2),
  pair('bromochlorobutanes', 'Two 2-bromo-3-chlorobutanes', 'C[C@@H](Br)[C@H](C)Cl', 'C[C@H](Br)[C@@H](C)Cl', 'enantiomers', 2),
];

/** "Draw the isomers": every structural isomer of a saturated formula. The totals come from `enumerate.ts`. */
export interface DrawTask {
  id: string;
  /** As shown, with subscripts. */
  formula: string;
  heavy: Readonly<Record<string, number>>;
  /** What kinds of compound to expect, without giving the count of each away. */
  about: string;
  /** 1: four isomers or fewer; 2: five or more. */
  level: 1 | 2;
}

export const DRAW_TASKS: readonly DrawTask[] = [
  { id: 'c2h6o', formula: 'C₂H₆O', heavy: { C: 2, O: 1 }, about: 'An alcohol and an ether.', level: 1 },
  { id: 'c4h10', formula: 'C₄H₁₀', heavy: { C: 4 }, about: 'Alkanes: straight and branched chains.', level: 1 },
  { id: 'c5h12', formula: 'C₅H₁₂', heavy: { C: 5 }, about: 'Alkanes: straight and branched chains.', level: 1 },
  { id: 'c3h8o', formula: 'C₃H₈O', heavy: { C: 3, O: 1 }, about: 'Alcohols and an ether.', level: 1 },
  { id: 'c3h7br', formula: 'C₃H₇Br', heavy: { C: 3, Br: 1 }, about: 'Bromoalkanes.', level: 1 },
  { id: 'c4h9cl', formula: 'C₄H₉Cl', heavy: { C: 4, Cl: 1 }, about: 'Chloroalkanes, on straight and branched chains.', level: 1 },
  { id: 'c3h6cl2', formula: 'C₃H₆Cl₂', heavy: { C: 3, Cl: 2 }, about: 'Dichloroalkanes: both chlorines can share a carbon.', level: 1 },
  { id: 'c6h14', formula: 'C₆H₁₄', heavy: { C: 6 }, about: 'Alkanes: straight and branched chains.', level: 2 },
  { id: 'c4h10o', formula: 'C₄H₁₀O', heavy: { C: 4, O: 1 }, about: 'Alcohols and ethers.', level: 2 },
  { id: 'c5h11br', formula: 'C₅H₁₁Br', heavy: { C: 5, Br: 1 }, about: 'Bromoalkanes, on straight and branched chains.', level: 2 },
];
