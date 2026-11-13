/**
 * The molecules of the Spectra tab, written as Kekulé SMILES (Indigo lays them out ahead of time, into
 * `src/isomers/layouts.json`). Molecules that share a formula form the "Which molecule?" sets: the same molecular ion,
 * told apart by their NMR and IR.
 */
export interface SpectraMolecule { smiles: string; name: string; level: 1 | 2 }

const m = (smiles: string, name: string, level: 1 | 2 = 1): SpectraMolecule => ({ smiles, name, level });

export const SPECTRA_MOLECULES: readonly SpectraMolecule[] = [
  // Alcohols and ethers
  m('CO', 'methanol'), m('CCO', 'ethanol'), m('COC', 'methoxymethane'),
  m('CCCO', 'propan-1-ol'), m('CC(C)O', 'propan-2-ol'), m('CCOC', 'methoxyethane'),
  m('CCCCO', 'butan-1-ol', 2), m('CCC(C)O', 'butan-2-ol', 2), m('CC(C)(C)O', '2-methylpropan-2-ol'), m('CC(C)CO', '2-methylpropan-1-ol', 2), m('CCOCC', 'ethoxyethane'),
  // Aldehydes and ketones
  m('CC=O', 'ethanal'), m('CCC=O', 'propanal'), m('CC(C)=O', 'propanone'), m('C=CCO', 'prop-2-en-1-ol', 2),
  m('CCCC=O', 'butanal', 2), m('CCC(C)=O', 'butanone'), m('CC(C)C=O', '2-methylpropanal', 2),
  m('CCC(=O)CC', 'pentan-3-one'), m('CCCC(C)=O', 'pentan-2-one', 2), m('CC(C)C(C)=O', '3-methylbutan-2-one', 2),
  // Acids and esters
  m('CC(=O)O', 'ethanoic acid'), m('COC=O', 'methyl methanoate', 2),
  m('CCC(=O)O', 'propanoic acid'), m('COC(C)=O', 'methyl ethanoate'), m('CCOC=O', 'ethyl methanoate', 2),
  m('CCCC(=O)O', 'butanoic acid', 2), m('CCOC(C)=O', 'ethyl ethanoate'), m('CCC(=O)OC', 'methyl propanoate'), m('CC(C)C(=O)O', '2-methylpropanoic acid', 2),
  // Halogenoalkanes
  m('CCl', 'chloromethane'), m('CCCl', 'chloroethane'), m('CCBr', 'bromoethane'),
  m('CCCCl', '1-chloropropane'), m('CC(C)Cl', '2-chloropropane'), m('CCCBr', '1-bromopropane'), m('CC(C)Br', '2-bromopropane'),
  m('ClCCCl', '1,2-dichloroethane'), m('CC(Cl)Cl', '1,1-dichloroethane', 2),
  m('CCCCBr', '1-bromobutane', 2), m('CCC(C)Br', '2-bromobutane', 2), m('CC(C)(C)Br', '2-bromo-2-methylpropane'), m('CC(C)CBr', '1-bromo-2-methylpropane', 2),
  // Amines and nitriles
  m('CCN', 'ethylamine'), m('CNC', 'dimethylamine', 2), m('CCCN', 'propylamine', 2), m('CN(C)C', 'trimethylamine', 2),
  m('CC#N', 'ethanenitrile'), m('CCC#N', 'propanenitrile'),
  // Alkenes and alkanes
  m('C=C', 'ethene'), m('C=CC', 'propene'), m('C=CCC', 'but-1-ene', 2), m('CC=CC', 'but-2-ene'), m('C=C(C)C', '2-methylpropene'),
  m('C1CCCCC1', 'cyclohexane'), m('CCCCC', 'pentane'), m('CCC(C)C', '2-methylbutane'), m('CC(C)(C)C', '2,2-dimethylpropane'),
  m('CCCCCC', 'hexane', 2), m('CCCC(C)C', '2-methylpentane', 2), m('CCC(C)CC', '3-methylpentane', 2), m('CCC(C)(C)C', '2,2-dimethylbutane', 2), m('CC(C)C(C)C', '2,3-dimethylbutane', 2),
  // Arenes
  m('C1=CC=CC=C1', 'benzene'), m('CC1=CC=CC=C1', 'methylbenzene'), m('CCC1=CC=CC=C1', 'ethylbenzene', 2),
  m('CC1=CC=CC=C1C', '1,2-dimethylbenzene', 2), m('CC1=CC=CC(C)=C1', '1,3-dimethylbenzene', 2), m('CC1=CC=C(C)C=C1', '1,4-dimethylbenzene', 2),
  m('O=CC1=CC=CC=C1', 'benzaldehyde', 2), m('CC(=O)C1=CC=CC=C1', 'phenylethanone', 2),
];
