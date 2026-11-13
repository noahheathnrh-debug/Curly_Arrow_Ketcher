import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { MechanismEditor, type MechanismEditorApi } from 'ketcher-react';
import type { StructServiceProvider } from 'ketcher-core';
import type { PracticeCriterion, PracticeLaunch } from '@mnemonexus/addon-sdk/practice';
import type { ExperienceHostProps } from '../hostContract';
import { fitToView, loadFitted } from '../fitToView';
import { doubleBonds, moleculeFromKet, stereocentres, subscripts, type Centre, type DoubleBond, type StereoMolecule } from './cip';
import { explainRelation, relate, type RelationResult } from './relation';
import { isomerKet, pairKet } from './layouts';
import { PAIRS, RELATION_LABELS, STEREO_ITEMS, type IsomerPair, type Relation, type StereoItem } from './species';
import lessonStyles from '../lessons/lessons.module.css';
import lewisStyles from '../lewis/lewis.module.css';
import styles from './isomers.module.css';

/**
 * Isomers (Molecules), two activities on Indigo-laid-out drawings:
 * - **R or S, E or Z:** five molecules; each stereocentre or C=C is highlighted in turn and named. The answer shows the
 *   groups ranked 1 to 4 (coloured on the drawing) and why each outranks the next.
 * - **What kind of isomers?:** five pairs; say how the two are related. The relation is worked out from the drawings.
 * One answer per question, so a round is a fair five-minute Recall drill.
 */
export const ROUND_LENGTH = 5;
const RANK_COLOURS = ['#c2402f', '#d9822b', '#2f8f4e', '#8e5bd0'];
const ASK = '#3a6ff0';

export type IsomersMode = 'stereo' | 'pairs';
const RELATION_PHRASES: Readonly<Record<Relation, string>> = {
  same: 'they are the same molecule', structural: 'they are structural isomers', ez: 'they are E/Z isomers',
  enantiomers: 'they are enantiomers', diastereomers: 'they are diastereomers', 'not-isomers': 'they are not isomers',
};

const shuffle = <T,>(xs: readonly T[], random: () => number): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};

/** Two R/S and two E/Z at levels 1–2, then one with two centres or two double bonds. */
export function stereoRound(random: () => number): StereoItem[] {
  const easy = (kind: StereoItem['kind']) => shuffle(STEREO_ITEMS.filter((s) => s.kind === kind && s.level < 3), random).slice(0, 2);
  // Never the same molecule twice in a round (the two but-2-enes share a name).
  const candidates = [...shuffle([...easy('rs'), ...easy('ez')], random), ...shuffle(STEREO_ITEMS.filter((s) => s.level < 3), random)];
  const unique = candidates.filter((s, i) => candidates.findIndex((t) => t.name === s.name) === i);
  const hard = shuffle(STEREO_ITEMS.filter((s) => s.level === 3), random)[0];
  return unique.slice(0, ROUND_LENGTH - 1).concat(hard);
}
export function pairsRound(random: () => number): IsomerPair[] {
  const pick = (level: 1 | 2, n: number) => shuffle(PAIRS.filter((p) => p.level === level), random).slice(0, n);
  return shuffle([...pick(1, 3), ...pick(2, 2)], random);
}

type Spec = Parameters<MechanismEditorApi['highlight']>[0][number];
type Target = { kind: 'centre'; centre: Centre } | { kind: 'bond'; bond: DoubleBond };
interface Question { title: string; ket: string; targets: Target[]; pair?: RelationResult }

function questionsFor(mode: IsomersMode, round: number): Question[] {
  if (mode === 'pairs') {
    return pairsRound(Math.random).map((p) => ({
      title: p.title, ket: pairKet(p.a, p.b), targets: [],
      pair: relate(moleculeFromKet(isomerKet(p.a)), moleculeFromKet(isomerKet(p.b))),
    }));
  }
  void round;
  return stereoRound(Math.random).map((item) => {
    const ket = isomerKet(item.smiles), m: StereoMolecule = moleculeFromKet(ket);
    const targets: Target[] = item.kind === 'rs' ? stereocentres(m).map((centre) => ({ kind: 'centre', centre })) : doubleBonds(m).map((bond) => ({ kind: 'bond', bond }));
    return { title: item.name, ket, targets };
  });
}

const answerOf = (target: Target) => (target.kind === 'centre' ? target.centre.label : target.bond.label ?? 'none');
const bondIndexIn = (ket: string, bond: DoubleBond) => {
  const m = moleculeFromKet(ket);
  return m.bonds.findIndex((b) => (b.a === bond.a && b.b === bond.b) || (b.a === bond.b && b.b === bond.a));
};

type Outcome = 'right' | 'wrong';
interface Props { host: ExperienceHostProps; practice?: PracticeLaunch; structServiceProvider: StructServiceProvider; mode: IsomersMode; exitLabel?: string }

export function IsomersActivity({ host, practice, structServiceProvider, mode, exitLabel }: Props) {
  const startedAt = useRef(Date.now());
  const tally = useRef({ best: 0, firstAll: false, rounds: 0, attempts: 0 });
  const [round, setRound] = useState(0);
  const list = useMemo(() => questionsFor(mode, round), [mode, round]);
  const [at, setAt] = useState(0);
  /** Per question, the answer given to each target (or, for a pair, the one relation chosen). */
  const [answers, setAnswers] = useState<string[][]>([]);
  const question = list[at];
  const given = answers[at] ?? [];
  const asking = mode === 'pairs' ? (given.length ? -1 : 0) : question.targets.findIndex((_, i) => given[i] === undefined);
  const shownTarget = asking >= 0 ? asking : Math.max(0, given.length - 1);
  const [looking, setLooking] = useState<number | null>(null);
  const focus = looking ?? shownTarget;

  const api = useRef<MechanismEditorApi | null>(null);
  const shownKet = useRef(question.ket);
  const firstKet = useRef(shownKet.current);

  const paint = useCallback(() => {
    const ready = api.current;
    if (!ready || mode === 'pairs') { ready?.highlight([]); return; }
    const target = question.targets[focus];
    if (!target) { ready.highlight([]); return; }
    const answered = given[focus] !== undefined;
    if (target.kind === 'centre') {
      const ranked: Spec[] = target.centre.groups.flatMap((g, i) => (g.atom === null ? [] : [{ atoms: [g.atom], color: RANK_COLOURS[i], outline: true }]));
      ready.highlight(answered ? [...ranked, { atoms: [target.centre.atom], color: ASK, outline: true }] : [{ atoms: [target.centre.atom], color: ASK }]);
    } else {
      const bond = bondIndexIn(question.ket, target.bond);
      const highs = target.bond.high.flatMap((g) => (g && g.atom !== null ? [g.atom] : []));
      ready.highlight(answered ? [{ bonds: [bond], color: ASK, outline: true }, { atoms: highs, color: RANK_COLOURS[0], outline: true }] : [{ bonds: [bond], atoms: [target.bond.a, target.bond.b], color: ASK }]);
    }
  }, [mode, question, focus, given]);

  const load = useCallback((ket: string) => {
    shownKet.current = ket;
    const ready = api.current;
    if (!ready) return;
    ready.highlight([]);
    void loadFitted(ready, ket).then(paint);
  }, [paint]);
  useEffect(() => { if (question.ket !== shownKet.current) load(question.ket); else paint(); }, [question, load, paint]);
  const onReady = (ready: MechanismEditorApi) => {
    api.current = ready;
    // Skeletal formulas, as stereochemistry is drawn: lone pairs would only crowd the groups being ranked.
    ready.ketcher.editor.setOptions(JSON.stringify({ showLonePairs: false }));
    if (shownKet.current !== firstKet.current) void loadFitted(ready, shownKet.current).then(paint);
    else requestAnimationFrame(() => { void fitToView(ready).then(paint); });
  };

  const outcomeOf = (index: number): Outcome | undefined => {
    const q = list[index], a = answers[index];
    if (!a) return undefined;
    if (mode === 'pairs') return a.length ? (a[0] === q.pair!.relation ? 'right' : 'wrong') : undefined;
    if (a.filter((x) => x !== undefined).length < q.targets.length) return undefined;
    return q.targets.every((t, i) => a[i] === answerOf(t)) ? 'right' : 'wrong';
  };
  const outcomes = list.map((_, i) => outcomeOf(i));
  const finished = outcomes.every(Boolean);
  const right = outcomes.filter((o) => o === 'right').length;

  const complete = useCallback((completed: boolean) => {
    const skill = practice && typeof practice.launch.skill === 'string' ? practice.launch.skill : undefined;
    const tag = skill ? { skill } : {};
    const what = mode === 'pairs' ? 'pairs' : 'molecules';
    const criteria: PracticeCriterion[] = [
      { id: `isomers.${mode}.round`, label: `At least ${ROUND_LENGTH - 1} of ${ROUND_LENGTH} ${what} right`, met: tally.current.best >= ROUND_LENGTH - 1, weight: 3, ...tag },
      { id: `isomers.${mode}.round-all`, label: `All ${ROUND_LENGTH} right in the first round`, met: tally.current.firstAll, weight: 1, ...tag },
    ];
    host.onComplete({
      completed,
      elapsedSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      ...(practice ? { practice: { version: 1 as const, activityId: practice.activityId, valid: true, criteria, hintsUsed: 0, attempts: tally.current.attempts } } : {}),
    });
  }, [host, practice, mode]);

  const answer = (value: string) => {
    if (asking < 0) return;
    tally.current.attempts += 1;
    const next = answers.map((a) => [...a]);
    next[at] = [...given];
    next[at][asking] = value;
    setAnswers(next);
    // Stay on the part just answered, so its explanation can be read before the next part is asked.
    setLooking(mode === 'stereo' ? asking : null);
    const done = list.every((q, i) => {
      const a = next[i];
      return a && (mode === 'pairs' ? a.length > 0 : a.filter((x) => x !== undefined).length === q.targets.length);
    });
    if (done) {
      const score = list.filter((q, i) => (mode === 'pairs' ? next[i][0] === q.pair!.relation : q.targets.every((t, j) => next[i][j] === answerOf(t)))).length;
      tally.current = { ...tally.current, best: Math.max(tally.current.best, score), firstAll: tally.current.firstAll || (tally.current.rounds === 0 && score === list.length), rounds: tally.current.rounds + 1 };
    }
  };
  const goTo = (index: number) => { setAt(index); setLooking(null); };
  const again = () => { setRound((r) => r + 1); setAnswers([]); goTo(0); };
  const open = list.map((_, i) => i).filter((i) => !outcomes[i]);
  const nextOpen = open.find((i) => i > at) ?? open[0];
  const questionDone = !!outcomes[at];

  const target = question.targets[focus];
  const options = mode === 'pairs' ? (Object.keys(RELATION_LABELS) as Relation[]).map((id) => ({ id, label: RELATION_LABELS[id] }))
    : target?.kind === 'centre' ? [{ id: 'R', label: 'R' }, { id: 'S', label: 'S' }]
    : [{ id: 'E', label: 'E' }, { id: 'Z', label: 'Z' }, { id: 'none', label: 'Neither' }];

  return <div className={lessonStyles.player}>
    <header className={lessonStyles.bar}>
      <div className={lessonStyles.titles}>
        <span className={lessonStyles.unit}>Molecules · Isomers</span>
        <h1>{mode === 'pairs' ? 'What kind of isomers?' : 'R or S, E or Z'}</h1>
      </div>
      <ol className={lewisStyles.progress} aria-label="Questions in this round">
        {list.map((q, i) => <li key={`${round}-${i}`} data-state={outcomes[i] === 'wrong' ? 'shown' : outcomes[i] ?? (i === at ? 'current' : undefined)}>
          <button type="button" onClick={() => goTo(i)} aria-current={i === at ? 'step' : undefined} title={q.title}>{i + 1}</button>
        </li>)}
      </ol>
      <button type="button" className={lessonStyles.quiet} onClick={() => complete(false)}>{exitLabel ?? 'Exit'}</button>
    </header>
    <div className={lessonStyles.body}>
      <div className={lessonStyles.split}>
        <section className={lessonStyles.panel} aria-live="polite">
          <span className={lessonStyles.counter}>{mode === 'pairs' ? 'Pair' : 'Molecule'} {at + 1} of {list.length}</span>
          <h2>{question.title}</h2>
          {mode === 'stereo' && question.targets.length > 1 && <div className={styles.targets} role="group" aria-label="Parts to name">
            {question.targets.map((t, i) => <button key={i} type="button" className={styles.target} aria-pressed={focus === i} data-done={given[i] !== undefined ? (given[i] === answerOf(t) ? 'right' : 'wrong') : undefined}
              onClick={() => setLooking(given[i] !== undefined ? i : null)} disabled={given[i] === undefined && i !== asking}>
              {t.kind === 'centre' ? 'Centre' : 'C=C'} {i + 1}{given[i] !== undefined ? `: ${given[i] === 'none' ? '–' : given[i]}` : ''}
            </button>)}
          </div>}
          {asking >= 0 && focus === asking && <>
            <p>{mode === 'pairs' ? 'How are these two related?'
              : target?.kind === 'centre' ? 'Is the highlighted stereocentre R or S?'
              : 'Is the highlighted double bond E or Z, or neither?'}</p>
            <p className={lessonStyles.muted}>{mode === 'pairs' ? 'Compare the formulas first, then how the atoms are joined, then their arrangement in space.'
              : target?.kind === 'centre' ? 'Rank the four groups by atomic number, point the lowest away from you, and follow 1 → 2 → 3.'
              : 'Find the higher-priority group on each carbon of the C=C: same side is Z, opposite sides E.'}</p>
            <div className={styles.choices} role="group" aria-label="Your answer">
              {options.map((o) => <button key={o.id} type="button" className={lessonStyles.quiet} onClick={() => answer(o.id)}>{o.label}</button>)}
            </div>
          </>}
          {mode === 'pairs' && given.length > 0 && question.pair && <Verdict right={given[0] === question.pair.relation}
            lead={given[0] === question.pair.relation ? `Right: ${RELATION_PHRASES[question.pair.relation]}.` : `Not quite: ${RELATION_PHRASES[question.pair.relation]}.`}>
            <p>{explainRelation(question.pair)}</p>
          </Verdict>}
          {mode === 'stereo' && target && given[focus] !== undefined && <TargetVerdict target={target} given={given[focus]} />}
          {finished && <p className={lessonStyles.says}>{right} of {list.length} right.</p>}
          <div className={lessonStyles.actions}>
            {mode === 'stereo' && asking >= 0 && focus !== asking && <button type="button" className={lessonStyles.primary} onClick={() => setLooking(null)}>
              Next: {question.targets[asking].kind === 'centre' ? 'centre' : 'C=C'} {asking + 1}
            </button>}
            {questionDone && nextOpen !== undefined && <button type="button" className={lessonStyles.primary} onClick={() => goTo(nextOpen)}>Next</button>}
            {finished && <>
              <button type="button" className={lessonStyles.primary} onClick={() => complete(true)}>Finish</button>
              <button type="button" className={lessonStyles.quiet} onClick={again}>Another round</button>
            </>}
          </div>
        </section>
        <main className={`${lessonStyles.canvas} ${styles.viewOnly}`}>
          <MechanismEditor structServiceProvider={structServiceProvider} staticResourcesUrl="" ket={firstKet.current} capabilities="review" onReady={onReady} />
        </main>
      </div>
    </div>
  </div>;
}

function Verdict({ right, lead, children }: { right: boolean; lead: string; children: ReactNode }) {
  return <div className={`${lessonStyles.message} ${right ? lessonStyles.right : lessonStyles.wrong}`} role="status">
    <p><strong>{lead}</strong></p>
    {children}
  </div>;
}

function TargetVerdict({ target, given }: { target: Target; given: string }) {
  const correct = answerOf(target);
  const right = given === correct;
  if (target.kind === 'centre') {
    const { centre } = target;
    const turn = centre.label === 'R' ? 'clockwise' : 'anticlockwise';
    return <Verdict right={right} lead={right ? `Right: ${correct}.` : `Not quite: this centre is ${correct}.`}>
      <ol className={styles.ranks}>
        {centre.groups.map((g, i) => <li key={i}><span className={styles.dot} style={{ background: RANK_COLOURS[i] }} aria-hidden />{subscripts(g.name)}{g.atom === null ? <span className={styles.aside}> (not drawn)</span> : null}</li>)}
      </ol>
      <ul className={lewisStyles.notes}>{centre.reasons.map((r) => <li key={r}>{subscripts(r)}</li>)}</ul>
      <p>With group 4 pointing away from you, 1 → 2 → 3 turns {turn}, so the centre is {centre.label}.
        {centre.fourth === 'towards' ? ' Here group 4 points towards you, so the turn you see on the page is the reverse.' : ''}
        {centre.fourth === 'plane' ? ' Here group 4 lies in the page: look along the bond from the side opposite it.' : ''}</p>
    </Verdict>;
  }
  const { bond } = target;
  if (!bond.label) {
    return <Verdict right={right} lead={right ? 'Right: neither.' : 'Not quite: there is no E or Z here.'}>
      <ul className={lewisStyles.notes}>{bond.reasons.filter((r) => r.includes('cannot be told apart')).map((r) => <li key={r}>{subscripts(r)}</li>)}</ul>
      <p>When one carbon of the C=C carries two identical groups, swapping them gives the same molecule, so there are no E/Z isomers.</p>
    </Verdict>;
  }
  return <Verdict right={right} lead={right ? `Right: ${correct}.` : `Not quite: this double bond is ${correct}.`}>
    <p>Higher priority on each carbon (coloured): {bond.high.map((g) => subscripts(g?.name ?? '')).join(' and ')}.</p>
    <ul className={lewisStyles.notes}>{[...new Set(bond.reasons)].map((r) => <li key={r}>{subscripts(r)}</li>)}{bond.reasons[0] === bond.reasons[1] ? <li>The same on both carbons.</li> : null}</ul>
    <p>They are on {bond.label === 'Z' ? 'the same side: Z (zusammen, together)' : 'opposite sides: E (entgegen, opposite)'}.</p>
  </Verdict>;
}
