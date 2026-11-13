/**
 * Which one? A key to reaction mechanisms: plain-word yes/no questions about a reaction (what it starts from, what it
 * uses, what changes) that end at the mechanism. Grown from the app's Trees & keys `mechanisms` key (2026-11-12) to the
 * mechanisms the lessons teach. Each leaf names the lessons that teach it.
 */
export interface KeyLeaf { kind: 'leaf'; id: string; name: string; about: string; lessons: readonly string[] }
export interface KeyQuestion { kind: 'ask'; id: string; label: string; yes: string; no: string; ifYes: KeyNode; ifNo: KeyNode }
export type KeyNode = KeyLeaf | KeyQuestion

const ask = (id: string, label: string, yes: string, no: string, ifYes: KeyNode, ifNo: KeyNode): KeyQuestion =>
  ({ kind: 'ask', id, label, yes, no, ifYes, ifNo });
const leaf = (id: string, name: string, about: string, ...lessons: string[]): KeyLeaf => ({ kind: 'leaf', id, name, about, lessons });

const SUBSTITUTION_ELIMINATION = ask('hot-base', 'Hot base?', 'uses a strong base in hot ethanol, giving an alkene', 'gives a substitution product, or is heated with no strong base',
  leaf('e2', 'E2', 'A strong base takes a proton as the leaving group goes, in one step.', 'lesson-e2'),
  ask('tertiary', 'Tertiary?', 'starts from a tertiary haloalkane or alcohol', 'starts from a primary or secondary haloalkane, or a primary alcohol',
    ask('heated', 'Heated?', 'is heated, often with acid, giving an alkene', 'is not heated, giving a substitution product',
      leaf('e1', 'E1', 'The leaving group goes first, leaving a carbocation, which then loses a proton.', 'lesson-e1'),
      leaf('sn1', 'SN1', 'The leaving group goes first, leaving a carbocation, which a nucleophile then captures.', 'lesson-sn1')),
    leaf('sn2', 'SN2', 'The nucleophile attacks from the back as the leaving group goes, in one step.', 'lesson-sn2', 'lesson-ammonia-halogenoalkane')));

const ALKENES = ask('peroxyacid-alkene', 'Peroxyacid?', 'uses a peroxyacid such as mCPBA, putting an oxygen across the C=C as an epoxide', 'uses borane, an acid or a halogen',
  leaf('epoxidation', 'Epoxidation', 'The alkene takes an oxygen from the peroxyacid in one concerted step, giving an epoxide and a carboxylic acid.', 'lesson-epoxidation'),
  ask('borane', 'Borane?', 'uses borane, then hydrogen peroxide and base, putting OH on the less substituted carbon', 'uses an acid or a halogen',
  leaf('hydroboration', 'Hydroboration–oxidation', 'Boron and hydrogen add across the C=C together; oxidation then puts OH where the boron was.', 'lesson-hydroboration'),
  ask('halogen-adds', 'Halogen added?', 'adds Br₂ or Cl₂', 'adds HBr, or water with an acid catalyst',
    ask('in-water', 'In water?', 'is run in water, so a halogen and an OH add', 'is run in an inert solvent, so two halogen atoms add',
      leaf('halohydrin', 'Halohydrin formation', 'A halonium ion forms, and water, the solvent, opens it from the back.', 'lesson-halohydrin'),
      leaf('bromination', 'Halogen addition', 'A halonium ion forms, and the halide ion opens it from the back.', 'lesson-bromination')),
    leaf('electrophilic-addition', 'Electrophilic addition', 'The C=C takes a proton, giving the more stable carbocation, which a nucleophile captures.', 'lesson-hbr-addition', 'lesson-alkene-hydration', 'lesson-diene-hbr'))));

const NO_CARBONYL = ask('benzene', 'Benzene ring?', 'replaces a group on a benzene ring, which stays aromatic', 'happens away from any aromatic ring',
  ask('electrophile', 'Electrophile?', 'uses an electrophile, such as NO₂⁺, an acylium ion or a diazonium ion, to replace an H', 'uses a nucleophile to replace a halogen, helped by nitro groups on the ring',
    leaf('electrophilic-aromatic', 'Electrophilic aromatic substitution', 'The ring attacks the electrophile, then loses a proton to become aromatic again.', 'lesson-nitration', 'lesson-benzene-chlorination', 'lesson-friedel-crafts-alkylation', 'lesson-friedel-crafts-acylation', 'lesson-phenol-bromination', 'lesson-azo-coupling'),
    leaf('snar', 'SNAr', 'The nucleophile adds to the ring, then the halide leaves: addition then elimination.', 'lesson-snar')),
  ask('alkene', 'C=C?', 'adds across a C=C double bond', 'happens at single bonds only',
    ALKENES,
    ask('epoxide', 'Epoxide?', 'opens an epoxide, a three-membered ring with an oxygen', 'replaces or removes a group on a haloalkane or alcohol',
      ask('epoxide-in-acid', 'In acid?', 'is run in acid, so the nucleophile goes to the more substituted carbon', 'uses a strong nucleophile, which goes to the less hindered carbon',
        leaf('epoxide-acid', 'Epoxide opening in acid', 'The protonated epoxide is opened at the carbon that best carries a positive charge.', 'lesson-epoxide-acid'),
        leaf('epoxide-base', 'Epoxide opening by a nucleophile', 'An SN2 at the less hindered carbon; the ring strain makes the alkoxide a fair leaving group.', 'lesson-epoxide-base')),
      SUBSTITUTION_ELIMINATION)));

const ACYL = ask('twice', 'Adds twice?', 'adds a Grignard reagent or LiAlH₄ twice, giving an alcohol', 'replaces the leaving group once',
  leaf('ester-double-addition', 'Double addition to an ester', 'The first equivalent substitutes for the OR group, and the ketone or aldehyde formed takes a second.', 'lesson-grignard-ester'),
  ask('protonated-first', 'C=O protonated first?', 'runs in acid, which protonates the C=O first: a carboxylic acid and an alcohol with an acid catalyst, or an ester or amide heated with aqueous acid', 'starts from an acyl chloride or anhydride, or uses a base such as hydroxide, or ammonia or an amine',
    leaf('acyl-in-acid', 'Acyl substitution in acid', 'The C=O is protonated, water or an alcohol adds, protons move, and the leaving group goes as a neutral molecule. Fischer esterification is the best-known case.', 'lesson-fischer-esterification', 'lesson-amide-hydrolysis'),
    leaf('addition-elimination', 'Addition–elimination', 'The nucleophile adds to the C=O, then the tetrahedral intermediate collapses and the leaving group goes.', 'lesson-acyl-chloride-alcohol', 'lesson-acyl-chloride-amine', 'lesson-anhydride-alcohol', 'lesson-ester-hydrolysis')));

const ALDEHYDE_KETONE = ask('ylide', 'Ylide?', 'turns the C=O into a C=C with a phosphorus ylide', 'makes no C=C',
  leaf('wittig', 'Wittig reaction', 'The ylide adds to the C=O, giving a four-membered ring that breaks into the alkene and Ph₃P=O.', 'lesson-wittig'),
  ask('water-out', 'C=O oxygen lost?', 'ends with the C=O oxygen lost as water', 'keeps the oxygen, as an alcohol, an alkoxide or a carboxylate',
    ask('amine', 'Amine?', 'uses a primary or secondary amine, giving a C=N (an imine) or an amino group on a C=C (an enamine)', 'uses an alcohol with acid, giving an acetal',
      leaf('imine', 'Imine or enamine formation', 'The amine adds to the C=O, then water is lost, with acid helping both steps. A secondary amine has no N–H left to lose from the iminium ion, so if the carbonyl compound has an α-hydrogen, a proton is lost from that carbon instead, giving an enamine.', 'lesson-imine', 'lesson-enamine'),
      leaf('acetal', 'Acetal formation', 'A hemiacetal loses water to a cation, which a second alcohol captures.', 'lesson-acetal')),
    leaf('nucleophilic-addition', 'Nucleophilic addition', 'A nucleophile, such as hydride, a Grignard reagent, cyanide or an alcohol (stopping at the hemiacetal), adds to the C=O carbon; carbon dioxide takes a Grignard reagent the same way.', 'lesson-cyanohydrin', 'lesson-hydride-reduction', 'lesson-grignard', 'lesson-hemiacetal', 'lesson-grignard-co2', 'lesson-cannizzaro')));

const ALPHA = ask('alpha-halogen', 'Halogen on the α-carbon?', 'puts a halogen (Br₂, Cl₂ or I₂) on the α-carbon', 'joins the α-carbon to another carbon, or makes a C=C there',
  leaf('alpha-halogenation', 'α-Halogenation', 'In acid, the enol forms, and its C=C attacks the halogen.', 'lesson-alpha-bromination'),
  ask('haloalkane', 'Haloalkane?', 'joins the α-carbon to an alkyl group from a haloalkane, in an SN2 step', 'joins the enolate to a carbonyl compound or to a C=C joined to one, or loses water afterwards',
    leaf('enolate-alkylation', 'Enolate alkylation', 'A base strong enough for the carbonyl compound (LDA for a ketone, ethoxide for a diester) makes the enolate, which attacks the haloalkane through carbon in an SN2 step.', 'lesson-enolate-alkylation'),
    ask('michael-acceptor', 'Far end of a C=C?', 'adds an enolate to the far carbon of a C=C joined to a C=O', 'joins an enolate to the C=O of an ester, aldehyde or ketone, or loses water afterwards',
      leaf('michael', 'Michael reaction', 'A stabilised enolate adds to the far carbon of a C=C joined to a C=O, and the new enolate then takes a proton.', 'lesson-michael'),
      ask('ester-partner', 'Ester partner?', 'joins an enolate to an ester, which then loses its alkoxide', 'joins an enolate to an aldehyde or ketone, or loses water afterwards',
        leaf('claisen-condensation', 'Claisen condensation', 'An ester enolate adds to a second ester, which then loses its alkoxide: a β-keto ester.', 'lesson-claisen'),
        ask('water-lost-alpha', 'Loses water?', 'loses water from a β-hydroxy carbonyl in base, giving a C=C next to the C=O', 'adds an enolate to an aldehyde or ketone, giving a β-hydroxy carbonyl',
          leaf('e1cb', 'E1cB', 'Base takes the α-proton, and the enolate then pushes out the OH: elimination through the conjugate base.', 'lesson-e1cb'),
          leaf('aldol', 'Aldol reaction', 'An enolate adds to the C=O of a second aldehyde or ketone.', 'lesson-aldol'))))));

const CARBONYL = ask('alpha', 'Next to the C=O?', 'starts by taking a proton off the carbon next to the C=O (the α-carbon): its enol or enolate then does the reacting', 'has a nucleophile attack the C=O or C≡N carbon, or the far end of a C=C joined to a C=O, with no α-proton taken off first',
  ALPHA,
  ask('conjugate', 'Far end of a C=C?', 'adds a nucleophile to the far carbon of a C=C joined to the C=O (an α,β-unsaturated carbonyl)', 'adds to the C=O or C≡N carbon itself',
    leaf('conjugate-addition', 'Conjugate addition', 'The nucleophile adds to the β-carbon, and the C=O takes the charge as an enolate.', 'lesson-thiol-conjugate-addition'),
    ask('leaving', 'Leaving group?', 'starts from an acyl chloride, ester, acid or amide: the C=O carbon carries a leaving group', 'starts from an aldehyde, a ketone, carbon dioxide or a nitrile: no leaving group there',
      ACYL,
      ask('nitrile', 'C≡N?', 'adds to the carbon of a nitrile’s C≡N', 'adds to the C=O of an aldehyde, a ketone or carbon dioxide',
        leaf('nitrile-hydrolysis', 'Nitrile hydrolysis', 'Hydroxide (or water, in acid) adds to the C≡N carbon; proton transfers give the amide, which is then hydrolysed in turn.', 'lesson-nitrile-hydrolysis'),
        ALDEHYDE_KETONE))));

export const MECHANISM_KEY: KeyNode = ask('moves', 'A group moves?', 'rearranges a molecule: a carbon, oxygen or nitrogen group, or a hydrogen with its bonding pair (a hydride, not just a proton), moves from one atom to another in it', 'moves no group within a molecule: groups are added, lost or swapped, molecules join, or only protons move',
  ask('heat-only', 'Heat alone?', 'needs only heat, as an allyl vinyl ether or a hexa-1,5-diene does', 'needs an acid or a reagent',
    leaf('claisen-rearrangement', 'Claisen or Cope rearrangement', 'A [3,3]-sigmatropic shift: six electrons move round a ring of six atoms in one step. The Claisen has an oxygen in the chain; the Cope has only carbons.', 'lesson-claisen-rearrangement', 'lesson-cope-rearrangement'),
    ask('peroxyacid', 'Peroxyacid?', 'turns a ketone into an ester with a peroxyacid', 'starts from an oxime, a diol, or an alcohol or haloalkane that forms a carbocation',
      leaf('baeyer-villiger', 'Baeyer–Villiger oxidation', 'The peroxyacid adds to the C=O; a group then moves from carbon to oxygen as a carboxylate leaves.', 'lesson-baeyer-villiger'),
      ask('oxime', 'Oxime?', 'turns an oxime into an amide', 'starts from a diol, or from an alcohol or haloalkane that forms a carbocation',
        leaf('beckmann', 'Beckmann rearrangement', 'Water leaves from nitrogen as the group anti to it moves across; water then adds.', 'lesson-beckmann'),
        ask('diol', 'Diol?', 'turns a 1,2-diol into a ketone or aldehyde', 'swaps an OH or halogen for another group, or loses it to make an alkene, with a hydrogen or alkyl group moving on the way',
          leaf('pinacol', 'Pinacol rearrangement', 'Water leaves, giving a carbocation; a group moves across to it, and the oxygen next door becomes a C=O.', 'lesson-pinacol'),
          leaf('carbocation-shift', 'Carbocation rearrangement', 'A carbocation forms, and a hydride or alkyl group moves to it from the next carbon, giving a more stable cation, which then reacts.', 'lesson-hydride-shift'))))),
  ask('protons', 'Only protons?', 'only moves protons: apart from bonds to hydrogen, every atom keeps its neighbours', 'gives some atom other than hydrogen a new neighbour, or takes one away',
    ask('enol', 'Enol?', 'turns an aldehyde or ketone into its enol (C=C–OH)', 'only passes a proton from an acid to a base; nothing else about the molecules changes',
      leaf('enolisation', 'Enolisation', 'In acid the C=O oxygen takes a proton, then the α-carbon loses one.', 'lesson-enolisation'),
      leaf('proton-transfer', 'Proton transfer', 'A lone pair on the base takes the proton; the bond to the acid breaks.', 'lesson-proton-transfer')),
    ask('new-ring', 'A ring in one step?', 'joins a diene and an alkene into a six-membered ring in one step', 'makes no new ring that way',
      leaf('diels-alder', 'Diels–Alder reaction', 'A [4+2] cycloaddition: three arrows round a ring, all at once.', 'lesson-diels-alder'),
      ask('co2', 'CO₂ lost?', 'loses CO₂ on warming, from a β-keto acid or a malonic acid', 'loses no CO₂',
        leaf('decarboxylation', 'Decarboxylation', 'Six electrons move round a ring of six atoms: CO₂ leaves, giving an enol.', 'lesson-decarboxylation'),
        ask('radicals', 'Radicals?', 'is a chain reaction, started by UV light or by a peroxide as a radical initiator', 'is not a chain reaction: any peroxide is just a reagent, as with H₂O₂ and NaOH',
          ask('uv', 'UV light?', 'replaces an H on an alkane with a halogen, in UV light', 'adds HBr to an alkene with peroxides present',
            leaf('radical-substitution', 'Radical substitution', 'A chain: a halogen atom takes an H, and the alkyl radical takes a halogen atom.', 'lesson-radical-chlorination'),
            leaf('radical-addition', 'Radical addition', 'A chain: a bromine atom adds to the C=C at the end that leaves the more stable radical.', 'lesson-radical-hbr-addition')),
          ask('carbonyl', 'C=O or C≡N?', 'happens at the carbon of a C=O or C≡N group (making a nitrile from cyanide does not count), at the carbon next to a C=O, or at the far end of a C=C joined to one', 'happens away from any C=O or C≡N carbon, and from any C=C joined to a C=O',
            CARBONYL, NO_CARBONYL))))));

export function leaves(node: KeyNode = MECHANISM_KEY): KeyLeaf[] {
  return node.kind === 'leaf' ? [node] : [...leaves(node.ifYes), ...leaves(node.ifNo)];
}
export function questions(node: KeyNode = MECHANISM_KEY): KeyQuestion[] {
  return node.kind === 'leaf' ? [] : [node, ...questions(node.ifYes), ...questions(node.ifNo)];
}

/** The questions on the way to a leaf, each with the answer that leads there. */
export interface PathStep { question: KeyQuestion; answer: boolean }
export function pathTo(id: string, node: KeyNode = MECHANISM_KEY): PathStep[] | undefined {
  if (node.kind === 'leaf') return node.id === id ? [] : undefined;
  const yes = pathTo(id, node.ifYes);
  if (yes) return [{ question: node, answer: true }, ...yes];
  const no = pathTo(id, node.ifNo);
  return no ? [{ question: node, answer: false }, ...no] : undefined;
}

/** Follows answers from the top: the node they reach. */
export function follow(answers: readonly boolean[], node: KeyNode = MECHANISM_KEY): KeyNode {
  let at = node;
  for (const answer of answers) {
    if (at.kind === 'leaf') break;
    at = answer ? at.ifYes : at.ifNo;
  }
  return at;
}
