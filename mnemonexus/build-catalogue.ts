import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { validatePracticeCatalogue, type PracticeActivity, type PracticeCatalogue } from '@mnemonexus/addon-sdk/practice';
import { buildLevels, type ImportedExercise } from './src/catalogue';
// @ts-expect-error a plain .mjs helper
import { packImportedCorpusPath, packIncludesPrivate } from './privateContent.mjs';
import { enzymeCatalogueActivities, enzymeSkills } from './src/enzymes/catalogue';
import { LESSONS } from './src/lessons';
import { typeset } from './src/lessons/typeset';
import { TEMPLATES } from './src/practice/templates';

/**
 * The practice catalogue (practice-v1): every playable mechanism, with the words a lecture would use for it, so
 * MnemoNexus can offer the right one beside the right material. Skills are what recall schedules; the puzzles of one
 * skill are variants of each other, so a repeat is a new mechanism rather than a remembered one.
 *
 * Terms include the biochemistry names for the same electron movements: general acid catalysis is a proton
 * transfer and an oxyanion hole stabilises a tetrahedral intermediate, whichever lecture says so.
 */
const SKILLS = {
  'proton-transfer': { label: 'Proton transfer', terms: ['proton transfer', 'acid base', 'acid-base', 'deprotonation', 'protonation', 'general acid', 'general base', 'general acid base catalysis', 'proton shuttle', 'acid catalysis', 'base catalysis'] },
  'nucleophilic-attack': { label: 'Nucleophilic attack', terms: ['nucleophilic attack', 'nucleophile', 'electrophile', 'covalent catalysis', 'nucleophilic catalysis', 'catalytic triad', 'catalytic nucleophile', 'serine protease'] },
  'carbonyl-addition': { label: 'Addition to a carbonyl', terms: ['carbonyl addition', 'nucleophilic addition', 'tetrahedral intermediate', 'oxyanion', 'oxyanion hole', 'hemiacetal', 'imine', 'schiff base', 'aldol', 'carbonyl carbon'] },
  substitution: { label: 'Nucleophilic substitution', terms: ['nucleophilic substitution', 'SN2', 'SN1', 'acyl substitution', 'acyl enzyme', 'hydrolysis', 'peptide bond hydrolysis', 'phosphoryl transfer', 'bimolecular nucleophilic substitution'] },
  elimination: { label: 'Elimination', terms: ['elimination', 'E1', 'E2', 'dehydration', 'beta elimination'] },
  'alkene-addition': { label: 'Addition across a double bond', terms: ['addition across a double bond', 'electrophilic addition', 'alkene addition', 'hydration'] },
  'leaving-group': { label: 'Leaving groups and carbocations', terms: ['leaving group', 'carbocation', 'carbocations', 'carbenium'] },
  'hydride-transfer': { label: 'Hydride movement', terms: ['hydride shift', 'hydride transfer', 'hydride migration', 'NADH', 'NAD+', 'NADPH'] },
  resonance: { label: 'Resonance and electron flow', terms: ['resonance', 'delocalisation', 'delocalization', 'allylic resonance', 'curly arrow', 'curly arrows', 'electron pushing'] },
  'aromatic-substitution': { label: 'Aromatic substitution', terms: ['aromatic substitution', 'electrophilic aromatic substitution', 'nucleophilic aromatic substitution', 'SEAr', 'SNAr', 'arenium ion', 'Wheland intermediate', 'sigma complex', 'Meisenheimer complex', 'nitration', 'Friedel-Crafts', 'Friedel–Crafts'] },
  radicals: { label: 'Radical reactions', terms: ['radical', 'radicals', 'free radical', 'radical substitution', 'radical halogenation', 'radical chain reaction', 'homolysis', 'homolytic fission', 'fishhook arrow', 'fishhook arrows'] },
  'conjugate-addition': { label: 'Conjugate addition', terms: ['conjugate addition', '1,4-addition', 'Michael addition', 'Michael reaction', 'Michael acceptor', 'enone', 'alpha,beta-unsaturated', 'α,β-unsaturated'] },
  rearrangement: { label: 'Rearrangements', terms: ['rearrangement', 'rearrangements', '1,2-shift', 'alkyl shift', 'methyl shift', 'carbocation rearrangement', 'Wagner-Meerwein', 'pinacol rearrangement', 'Baeyer-Villiger', 'Beckmann rearrangement', 'migratory aptitude'] },
  pericyclic: { label: 'Pericyclic reactions', terms: ['pericyclic', 'Diels-Alder', 'Diels–Alder', 'cycloaddition', '[4+2] cycloaddition', 'dienophile', 'sigmatropic', 'sigmatropic rearrangement', 'electrocyclic', 'Cope rearrangement'] },
  'mechanism-choice': { label: 'Choosing a mechanism', terms: ['reaction mechanism', 'reaction mechanisms', 'which mechanism', 'type of reaction', 'reaction type', 'classifying reactions', 'organic reactions'] },
  lewis: { label: 'Lewis structures', terms: ['Lewis structure', 'Lewis structures', 'Lewis diagram', 'dot and cross', 'dot-and-cross', 'formal charge', 'formal charges', 'octet rule', 'lone pair', 'lone pairs', 'resonance structure', 'resonance forms', 'dative bond', 'coordinate bond'] },
  stereo: { label: 'R/S and E/Z', terms: ['stereoisomer', 'stereoisomers', 'stereochemistry', 'stereocentre', 'stereocenter', 'chiral centre', 'chiral center', 'chirality', 'R/S', 'CIP rules', 'Cahn-Ingold-Prelog', 'Cahn–Ingold–Prelog', 'E/Z', 'E/Z isomerism', 'cis-trans isomerism', 'geometric isomerism', 'priority rules'] },
  isomerism: { label: 'Types of isomerism', terms: ['isomer', 'isomers', 'isomerism', 'structural isomer', 'structural isomers', 'chain isomer', 'position isomer', 'functional group isomer', 'optical isomer', 'optical isomerism', 'enantiomer', 'enantiomers', 'diastereomer', 'diastereomers', 'meso compound', 'racemic mixture'] },
  spectroscopy: { label: 'Spectroscopy: NMR, IR and mass', terms: ['spectroscopy', 'NMR', 'NMR spectroscopy', 'proton NMR', '1H NMR', '¹H NMR', 'carbon-13 NMR', '13C NMR', '¹³C NMR', 'chemical shift', 'chemical environment', 'spin-spin splitting', 'splitting pattern', 'n+1 rule', 'integration', 'TMS', 'infrared spectroscopy', 'IR spectroscopy', 'IR spectrum', 'fingerprint region', 'wavenumber', 'mass spectrometry', 'mass spectrum', 'molecular ion', 'M+1 peak', 'M+2 peak', 'fragmentation', 'base peak', 'structure determination', 'combined techniques'] },
  vsepr: { label: 'Shapes of molecules', terms: ['VSEPR', 'shapes of molecules', 'molecular shape', 'molecular geometry', 'bond angle', 'bond angles', 'electron domains', 'electron pairs', 'lone pair repulsion', 'tetrahedral', 'trigonal planar', 'trigonal bipyramidal', 'octahedral'] },
} as const;
type Skill = keyof typeof SKILLS;

/** The corpus's mechanistic tags; the rest name solvents. */
const TAG_SKILL: Record<string, Skill> = {
  'proton transfer': 'proton-transfer', protonation: 'proton-transfer', 'nucleophilic attack': 'nucleophilic-attack',
  'nucleophilic addition to a carbonyl': 'carbonyl-addition', 'carbonyl polarisation': 'carbonyl-addition', 'nucleophilic substitution': 'substitution',
  elimination: 'elimination', 'addition across a double bond': 'alkene-addition', 'leaving group departure': 'leaving-group', 'electron reorganisation': 'resonance',
};
const GUIDED: Record<string, { skill: Skill; title: string }> = {
  'proton-transfer': { skill: 'proton-transfer', title: 'Proton transfer' }, 'sn2-backside': { skill: 'substitution', title: 'SN2 backside attack' },
  'carbonyl-addition': { skill: 'carbonyl-addition', title: 'Carbonyl addition' }, 'carbocation-attack': { skill: 'leaving-group', title: 'Carbocation attack' },
  'hydride-shift': { skill: 'hydride-transfer', title: 'Hydride shift' }, 'allyl-resonance': { skill: 'resonance', title: 'Allylic resonance' },
};
const LEVEL = { introductory: 1, intermediate: 2, advanced: 3 } as const;
const MINUTES_PER_STEP = 1.5;

// The recovered corpus is private content (see .gitignore): a public clone builds without the imported levels.
const imported = (packImportedCorpusPath ? JSON.parse(await readFile(packImportedCorpusPath, 'utf8')) : []) as ImportedExercise[];

// Only levels the add-on can play from first step to last.
const playable = buildLevels([], imported);
const groups = new Map<number, ImportedExercise[]>();
for (const exercise of imported) groups.set(exercise.source.puzzle, [...(groups.get(exercise.source.puzzle) ?? []), exercise]);

const activity = (id: string, title: string, skill: Skill, level: 1 | 2 | 3, steps: number, launch: Record<string, unknown>): PracticeActivity => {
  const minutes = Math.max(2, Math.round(steps * MINUTES_PER_STEP));
  return { id, title, summary: `Draw the curly arrows for ${steps === 1 ? 'this step' : `these ${steps} steps`} on locked structures.`, minutes, level,
    terms: [...SKILLS[skill].terms], skills: [skill], surfaces: minutes <= 5 ? ['study', 'recall'] : ['study', 'planner'], family: skill, launch: { ...launch, skill } };
};

const activities: PracticeActivity[] = Object.entries(GUIDED).map(([id, { skill, title }]) => activity(id, title, skill, 1, 1, { kind: 'guided', puzzle: id }));
for (const level of playable) {
  if (!level.id.startsWith('ocra-level-')) continue;
  const exercises = groups.get(Number(level.id.slice('ocra-level-'.length))) ?? [];
  const counts = new Map<Skill, number>();
  for (const tag of exercises.flatMap((exercise) => exercise.tags)) {
    const skill = TAG_SKILL[tag.toLowerCase()];
    if (skill) counts.set(skill, (counts.get(skill) ?? 0) + 1);
  }
  const skill = [...counts].sort(([, a], [, b]) => b - a)[0]?.[0];
  if (!skill) continue;
  const hardest = Math.max(...exercises.map((exercise) => LEVEL[exercise.difficulty])) as 1 | 2 | 3;
  activities.push(activity(level.id, level.title, skill, hardest, exercises.length, { kind: 'level', level: level.id }));
}

// Lessons (Reactions & mechanisms → Learn): watch, draw, predict. Longer than a puzzle, so offered for study, not recall.
// Text is typeset (H3O+ → H₃O+) as the lesson player shows it, and a long summary ends at its last whole sentence.
const clip = (text: string, max = 280) => text.length <= max ? text : text.slice(0, max).replace(/[^.]*$/, '').trim() || `${text.slice(0, max - 1)}…`;
for (const lesson of LESSONS) {
  const skill = lesson.skill as Skill;
  if (!SKILLS[skill]) throw new Error(`${lesson.id}: unknown skill ${lesson.skill}`);
  const arrows = lesson.steps.reduce((n, step) => n + step.arrows.length, 0);
  activities.push({
    id: lesson.id, title: typeset(lesson.title), summary: clip(typeset(lesson.summary)), minutes: Math.max(4, Math.round(3 + arrows * 1.2)), level: lesson.level,
    terms: [...SKILLS[skill].terms], skills: [skill], surfaces: ['study', 'planner'], family: skill, launch: { kind: 'lesson', lesson: lesson.id, skill },
  });
}

// Endless practice: three new molecules per run from a template, so Recall can repeat a skill without repeating a puzzle.
for (const template of TEMPLATES) {
  const skill = template.skill as Skill;
  if (!SKILLS[skill]) throw new Error(`${template.id}: unknown skill ${template.skill}`);
  activities.push({
    id: `generated-${template.id}`, title: `${template.title}: three new molecules`, minutes: 4, level: 1,
    summary: `Three new ${template.phrase} puzzles, on molecules picked fresh each time from ${template.variants} combinations.`,
    terms: [...SKILLS[skill].terms], skills: [skill], surfaces: ['study', 'recall'], family: skill,
    launch: { kind: 'generated', template: template.id, count: 3, skill },
  });
}

// Molecules → Shapes in 3D: explore the textbook set, then a five-question quiz on new picks each time.
activities.push({
  id: 'shapes-3d', title: 'Shapes in 3D', minutes: 5, level: 1,
  summary: 'Turn the textbook VSEPR shapes in 3D, lone pairs and all, then name the shape of five molecules from their electron domains.',
  terms: [...SKILLS.vsepr.terms], skills: ['vsepr'], surfaces: ['study', 'recall'], family: 'vsepr', launch: { kind: 'shapes', skill: 'vsepr' },
});

// Molecules → Draw & check: complete four Lewis structures from their skeletons, checked atom by atom.
activities.push({
  id: 'lewis-structures', title: 'Draw & check: Lewis structures', minutes: 5, level: 1,
  summary: 'Complete four Lewis structures from their skeletons, changing bond orders and charges until every atom has its octet with as few charges as possible; each check says which atoms are still wrong.',
  terms: [...SKILLS.lewis.terms], skills: ['lewis'], surfaces: ['study', 'recall'], family: 'lewis', launch: { kind: 'lewis', skill: 'lewis' },
});

// Molecules → Isomers: name stereocentres and double bonds (R/S, E/Z), and say how pairs of molecules are related.
activities.push({
  id: 'isomers-stereo', title: 'R or S, E or Z', minutes: 5, level: 2,
  summary: 'Name the stereocentres (R or S) and double bonds (E or Z) in five molecules; each answer ranks the groups by the Cahn–Ingold–Prelog rules and shows why.',
  terms: [...SKILLS.stereo.terms], skills: ['stereo'], surfaces: ['study', 'recall'], family: 'stereo', launch: { kind: 'isomers', mode: 'stereo', skill: 'stereo' },
});
activities.push({
  id: 'isomers-pairs', title: 'What kind of isomers?', minutes: 5, level: 1,
  summary: 'Five pairs of molecules: the same molecule, structural isomers, E/Z isomers, enantiomers, diastereomers or not isomers at all.',
  terms: [...SKILLS.isomerism.terms], skills: ['isomerism'], surfaces: ['study', 'recall'], family: 'isomerism', launch: { kind: 'isomers', mode: 'pairs', skill: 'isomerism' },
});
activities.push({
  id: 'isomers-draw', title: 'Draw the isomers', minutes: 5, level: 1,
  summary: 'Draw every structural isomer of two formulas, one at a time; the checker spots one already found drawn another way.',
  terms: [...SKILLS.isomerism.terms], skills: ['isomerism'], surfaces: ['study', 'recall'], family: 'isomerism', launch: { kind: 'isomers', mode: 'draw', skill: 'isomerism' },
});

// Molecules → Spectra: NMR, IR and mass spectra predicted from the structure (src/spectra/predict.ts).
activities.push({
  id: 'spectra-peaks', title: 'How many peaks?', minutes: 5, level: 1,
  summary: 'Five molecules: how many peaks in the ¹H or ¹³C NMR spectrum? Each answer colours the environments on the drawing and shows the spectrum.',
  terms: [...SKILLS.spectroscopy.terms], skills: ['spectroscopy'], surfaces: ['study', 'recall'], family: 'spectroscopy', launch: { kind: 'spectra', mode: 'peaks', skill: 'spectroscopy' },
});
activities.push({
  id: 'spectra-which', title: 'Which molecule?', minutes: 5, level: 2,
  summary: 'Five unknowns, each with its ¹H and ¹³C NMR, infrared and mass spectra: pick it from isomers of the same formula.',
  terms: [...SKILLS.spectroscopy.terms], skills: ['spectroscopy'], surfaces: ['study', 'recall'], family: 'spectroscopy', launch: { kind: 'spectra', mode: 'which', skill: 'spectroscopy' },
});
activities.push({
  id: 'spectra-solve', title: 'Draw the unknown', minutes: 5, level: 2,
  summary: 'Two unknowns from their spectra and formula: draw a molecule that fits. A wrong drawing is told which spectrum it would not match, with its own spectra to compare.',
  terms: [...SKILLS.spectroscopy.terms], skills: ['spectroscopy'], surfaces: ['study', 'recall'], family: 'spectroscopy', launch: { kind: 'spectra', mode: 'solve', skill: 'spectroscopy' },
});

// Reactions & mechanisms → Which one?: walk the key to any mechanism, then a quiz of five reactions told in words.
activities.push({
  id: 'which-mechanism', title: 'Which mechanism?', minutes: 5, level: 2,
  summary: 'Find a reaction’s mechanism with a key of plain questions (what it starts from, what it uses, what changes), then name the mechanism of five reactions told in words.',
  terms: [...SKILLS['mechanism-choice'].terms], skills: ['mechanism-choice'], surfaces: ['study', 'recall'], family: 'mechanism-choice', launch: { kind: 'key', skill: 'mechanism-choice' },
});

// The enzyme mechanisms (0.6.0) come from src/enzymes: their terms, families and times are set where they are authored.
// They are lecture-derived, so only the owner's build lists them (bun resolves @private-content through tsconfig paths,
// so the catalogue must decide here rather than through the import).
if (packIncludesPrivate) activities.push(...enzymeCatalogueActivities());

const catalogue: PracticeCatalogue = { version: 1, skills: { ...Object.fromEntries(Object.entries(SKILLS).map(([id, skill]) => [id, { label: skill.label }])), ...(packIncludesPrivate ? enzymeSkills() : {}) }, activities };
validatePracticeCatalogue(catalogue);
await mkdir(new URL('./pack-build/', import.meta.url), { recursive: true });
await writeFile(new URL('./pack-build/practice-catalogue.json', import.meta.url), JSON.stringify(catalogue));
console.log(`practice catalogue: ${activities.length} activities over ${Object.keys(catalogue.skills).length} skills`);
