import type { Rng, Template } from './templates';
import { Builder, CARBOCATIONS, E2_BASES, E2_SUBSTRATES, HALIDE, HALIDE_IONS, HALOGENS, SOLVENTS, type Hal } from './species';

/**
 * Substitution and elimination beyond SN2: E2, and the two steps that follow an SN1 or E1 ionisation (the carbocation
 * captured by a nucleophile, or losing a proton to a weak base). Each is one step, drawn from where it starts.
 */
const pick = <T>(rng: Rng, xs: readonly T[]): T => xs[Math.floor(rng() * xs.length)];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const nonZero = (charges: Record<string, number>) => Object.fromEntries(Object.entries(charges).filter(([, c]) => c));

const e2Sets = E2_SUBSTRATES.flatMap((s) => HALOGENS.flatMap((x) => E2_BASES.map((base) => ({ s, x, base }))));
export const e2: Template = {
  id: 'e2',
  title: 'E2 elimination',
  phrase: 'E2',
  skill: 'elimination',
  variants: e2Sets.length,
  make(rng) {
    const { s, x, base } = pick(rng, e2Sets);
    const b = new Builder();
    // The leaving group points up and the proton down, anti to each other, as E2 needs; the base waits below the proton.
    const ca = b.atom('C', 0, 0);
    const leaving = b.grow(ca, x, 90);
    const cb = b.grow(ca, 'C', 330);
    const h = b.grow(cb, 'H', 270);
    if (s.alpha >= 1) b.grow(ca, 'C', 210);
    if (s.alpha >= 2) b.grow(ca, 'C', 150);
    if (s.beta) b.chain(cb, s.beta, 0);
    const B = base.build(b, 0.866, -2.7, 270);
    const charges = { ...B.charges, [B.at]: base.charge + 1, [leaving]: -1 };
    const name = s.name(x as Hal);
    return {
      id: 'practice-e2', title: `${cap(base.name)} and ${name}`, unit: 'Substitution and elimination', skill: 'elimination', level: 2,
      summary: `${cap(base.name)} removes a proton as ${HALIDE[x]} leaves, in one step, making an alkene.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'E2', prompt: `Show ${base.name} removing the proton shown from ${name}, in one step (E2).`,
        arrows: [
          { from: B.at, to: `${B.at}-${h}`, says: 'The base uses a lone pair to take the proton on the carbon next to the one holding the halogen.' },
          { from: `${cb}-${h}`, to: `${cb}-${ca}`, says: 'The electrons of the C–H bond swing in between the two carbons, making the π bond of the alkene.' },
          { from: `${ca}-${leaving}`, to: leaving, says: 'At the same time the carbon–halogen bond breaks and the halide leaves with both electrons.' },
        ],
        hints: ['Three arrows, all at once: the base, the C–H bond, and the leaving group.', 'The C–H electrons do not go to the base: they make the new C=C bond.', 'The halogen leaves as a halide ion.'],
        explanation: `${cap(s.alkene)}, ${HALIDE[x]} and the base's conjugate acid. The proton and the leaving group were anti to each other, which lets the C–H and C–${x} orbitals line up as the π bond forms. Where there is a choice, the proton shown is the one that gives the more substituted alkene (Zaitsev), the major product.`,
      }],
      expect: { bonds: [`${B.at}-${h}`, `${ca}-${cb}:2`], absent: [`${cb}-${h}`, `${ca}-${leaving}`], charges: nonZero(charges) },
    };
  },
};

/** A planar carbocation at the origin, its three groups at 90°, 210° and 330°, each one carbon or two. */
function carbocation(b: Builder, groups: readonly number[]) {
  const c = b.atom('C', 0, 0, { charge: 1 });
  const first = [90, 210, 330].map((angle, i) => {
    const g = b.grow(c, 'C', angle);
    if (groups[i] >= 2) b.grow(g, 'C', angle + 30);
    return g;
  });
  return { c, first };
}

const captureSets = CARBOCATIONS.flatMap((cation) => [...HALIDE_IONS, ...SOLVENTS].map((n) => ({ cation, n })));
export const sn1Capture: Template = {
  id: 'sn1-capture',
  title: 'SN1: a carbocation is captured',
  phrase: 'carbocation capture',
  skill: 'leaving-group',
  variants: captureSets.length,
  make(rng) {
    const { cation, n } = pick(rng, captureSets);
    const b = new Builder();
    const { c } = carbocation(b, cation.groups);
    const N = n.build(b, 0, -1.9, 270);
    const charges = { ...N.charges, [N.at]: n.charge + 1 };
    return {
      id: 'practice-sn1-capture', title: `${cap(n.name)} and ${cation.name.replace(/^the /, '')}`, unit: 'Substitution and elimination', skill: 'leaving-group', level: 2,
      summary: `The second step of an SN1: ${n.name} bonds to ${cation.name}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Capture', prompt: `Show ${n.name} bonding to ${cation.name}.`,
        arrows: [{ from: N.at, to: `${N.at}-${c}`, says: 'A lone pair on the nucleophile fills the empty p orbital of the positive carbon.' }],
        hints: ['One arrow: from a lone pair to the positive carbon.', 'The carbocation is flat, so it can be attacked from either face.'],
        explanation: n.charge
          ? `A neutral alkyl halide: the halide's charge cancels the carbocation's. With a halide this is the first step of SN1 run backwards, which is why ionisation is reversible.`
          : `An oxonium ion: oxygen now has three bonds and carries the positive charge. A second solvent molecule takes its proton next, to give the ${n.name === 'water' ? 'alcohol' : 'ether'}.`,
      }],
      expect: { bonds: [`${N.at}-${c}`], charges: nonZero(charges) },
    };
  },
};

/**
 * Tertiary cations for E1 only: a secondary cation does not form as an intermediate in water or an alcohol (hostile
 * review, 2026-11-11). The proton drawn comes from the CH2 of an ethyl group when there is one, so the alkene is the
 * more substituted (Zaitsev) one; the tert-butyl cation has only methyls.
 */
const e1Sets = CARBOCATIONS.flatMap((cation) => SOLVENTS.map((base) => ({ cation, base })));
export const e1: Template = {
  id: 'e1',
  title: 'E1: a carbocation loses a proton',
  phrase: 'E1',
  skill: 'elimination',
  variants: e1Sets.length,
  make(rng) {
    const { cation, base } = pick(rng, e1Sets);
    // The group that loses the proton points up: an ethyl when there is one (its CH2 gives the Zaitsev alkene).
    const [up, ...rest] = [...cation.groups].sort((x, y) => y - x);
    const b = new Builder();
    const c = b.atom('C', 0, 0, { charge: 1 });
    const beta = b.grow(c, 'C', 90);
    if (up >= 2) b.grow(beta, 'C', 30);
    const h = b.grow(beta, 'H', 150);
    rest.forEach((n, i) => { const angle = i ? 330 : 210; const g = b.grow(c, 'C', angle); if (n >= 2) b.grow(g, 'C', angle + 30); });
    const B = base.build(b, -1.905, 2.1, 150);
    const name = cation.name.replace(/^the /, '');
    return {
      id: 'practice-e1', title: `${cap(base.name)} and ${name}`, unit: 'Substitution and elimination', skill: 'elimination', level: 2,
      summary: `The second step of an E1: ${base.name} takes a proton from ${cation.name}, making ${cation.alkene}.`, atoms: b.atoms, bonds: b.bonds,
      steps: [{
        name: 'Loss of a proton', prompt: `Show ${base.name} removing the proton shown from ${cation.name}, to make an alkene.`,
        arrows: [
          { from: B.at, to: `${B.at}-${h}`, says: `${cap(base.name)} is a weak base, but strong enough here: a lone pair takes the proton.` },
          { from: `${beta}-${h}`, to: `${beta}-${c}`, says: 'The C–H electrons move in to the positive carbon, making the C=C π bond and cancelling the charge.' },
        ],
        hints: ['Two arrows: the base takes the proton, and the C–H bond becomes the π bond.', 'The proton comes from the carbon next to the positive one.'],
        explanation: `${cap(cation.alkene)} and the protonated solvent: the positive charge has moved from carbon to the oxygen of the base. ${up >= 2 ? 'The proton came from a CH2, giving the more substituted alkene (Zaitsev), the major product.' : 'Every neighbouring carbon is a methyl, so there is only one alkene.'}`,
      }],
      expect: { bonds: [`${B.at}-${h}`, `${c}-${beta}:2`], absent: [`${beta}-${h}`], charges: { [B.at]: base.charge + 1 } },
    };
  },
};

export const SUBSTITUTION_TEMPLATES: readonly Template[] = [e2, sn1Capture, e1];
