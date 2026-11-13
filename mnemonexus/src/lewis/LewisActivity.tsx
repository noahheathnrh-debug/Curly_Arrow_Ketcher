import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MechanismEditor, type MechanismEditorApi } from 'ketcher-react';
import type { StructServiceProvider } from 'ketcher-core';
import type { PracticeCriterion, PracticeLaunch } from '@mnemonexus/addon-sdk/practice';
import type { ExperienceHostProps } from '../hostContract';
import { fitToView, loadFitted } from '../fitToView';
import { bestForms, checkLewis, lewisKet, type LewisVerdict } from './check';
import { LEWIS_SPECIES, type LewisSpecies } from './species';
import lessonStyles from '../lessons/lessons.module.css';
import styles from './lewis.module.css';

/**
 * Draw & check (Molecules): a round of four Lewis structures, two simple and two that need charges placed with care
 * (four keeps a round within a five-minute Recall drill).
 * Each starts as a single-bonded skeleton; the learner changes bond orders and charges, and Check says what is still
 * wrong, atom by atom, with the atoms highlighted. A right answer with resonance forms can show the others.
 */
export const ROUND_LENGTH = 4;
const WRONG = '#c2402f';

const shuffle = <T,>(xs: readonly T[], random: () => number): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
export function lewisRound(random: () => number): LewisSpecies[] {
  const pick = (level: 1 | 2) => shuffle(LEWIS_SPECIES.filter((s) => s.level === level), random).slice(0, ROUND_LENGTH / 2);
  return [...pick(1), ...pick(2)];
}

type Outcome = 'right' | 'shown';
interface Props { host: ExperienceHostProps; practice?: PracticeLaunch; structServiceProvider: StructServiceProvider; exitLabel?: string }

export function LewisActivity({ host, practice, structServiceProvider, exitLabel }: Props) {
  const startedAt = useRef(Date.now());
  const tally = useRef({ best: 0, firstAll: false, rounds: 0, attempts: 0, hints: 0 });
  const [round, setRound] = useState(0);
  const list = useMemo(() => lewisRound(Math.random), [round]);
  const [at, setAt] = useState(0);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [verdict, setVerdict] = useState<LewisVerdict | null>(null);
  const [hinted, setHinted] = useState(false);
  const [formAt, setFormAt] = useState(0);
  const species = list[at];
  const forms = useMemo(() => bestForms(species), [species]);
  const api = useRef<MechanismEditorApi | null>(null);
  const shownKet = useRef(lewisKet(species));
  const firstKet = useRef(shownKet.current);

  const load = useCallback((ket: string) => {
    shownKet.current = ket;
    const ready = api.current;
    if (!ready) return;
    ready.highlight([]);
    void loadFitted(ready, ket);
  }, []);
  useEffect(() => { if (lewisKet(species) !== shownKet.current) load(lewisKet(species)); }, [species, load]);
  const onReady = (ready: MechanismEditorApi) => {
    api.current = ready;
    ready.ketcher.editor.setOptions(JSON.stringify({ showLonePairs: true }));
    if (shownKet.current !== firstKet.current) void loadFitted(ready, shownKet.current);
    else requestAnimationFrame(() => fitToView(ready));
  };

  const complete = useCallback((completed: boolean) => {
    const skill = practice && typeof practice.launch.skill === 'string' ? practice.launch.skill : undefined;
    const tag = skill ? { skill } : {};
    const criteria: PracticeCriterion[] = [
      { id: 'lewis.round', label: `At least ${ROUND_LENGTH - 1} of ${ROUND_LENGTH} structures right without being shown`, met: tally.current.best >= ROUND_LENGTH - 1, weight: 3, ...tag },
      { id: 'lewis.round-all', label: `All ${ROUND_LENGTH} right in the first round`, met: tally.current.firstAll, weight: 1, ...tag },
    ];
    host.onComplete({
      completed,
      elapsedSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      ...(practice ? { practice: { version: 1 as const, activityId: practice.activityId, valid: true, criteria, hintsUsed: tally.current.hints, attempts: tally.current.attempts } } : {}),
    });
  }, [host, practice]);

  const settle = (outcome: Outcome) => {
    if (outcomes[at]) return;
    const next = [...outcomes];
    next[at] = outcome;
    setOutcomes(next);
    if (next.filter(Boolean).length === list.length) {
      const right = next.filter((o) => o === 'right').length;
      tally.current = { ...tally.current, best: Math.max(tally.current.best, right), firstAll: tally.current.firstAll || (tally.current.rounds === 0 && right === list.length), rounds: tally.current.rounds + 1 };
    }
  };
  const check = () => {
    const ready = api.current;
    if (!ready) return;
    tally.current.attempts += 1;
    const result = checkLewis(ready.ketcher.editor.struct(), species, forms);
    setVerdict(result);
    ready.highlight('atoms' in result && result.atoms.length ? [{ atoms: result.atoms, bonds: [], color: WRONG }] : []);
    if (result.verdict === 'right') { settle('right'); setFormAt(0); }
  };
  const show = () => {
    load(lewisKet(species, forms[0]));
    setFormAt(0);
    setVerdict({ verdict: 'right', message: `Here is ${forms.length > 1 ? 'one good structure' : 'the structure'}. ${species.about}`, forms: forms.length });
    settle('shown');
  };
  const goTo = (index: number) => { setAt(index); setVerdict(null); setHinted(false); setFormAt(0); };
  const again = () => { setRound((r) => r + 1); setOutcomes([]); goTo(0); };

  const solved = !!outcomes[at];
  const finished = outcomes.filter(Boolean).length === list.length;
  const right = outcomes.filter((o) => o === 'right').length;
  const open = list.map((_, i) => i).filter((i) => !outcomes[i]);
  const nextOpen = open.find((i) => i > at) ?? open[0];

  return <div className={lessonStyles.player}>
    <header className={lessonStyles.bar}>
      <div className={lessonStyles.titles}>
        <span className={lessonStyles.unit}>Molecules</span>
        <h1>Draw &amp; check</h1>
      </div>
      <ol className={styles.progress} aria-label="Structures in this round">
        {list.map((s, i) => <li key={s.id} data-state={outcomes[i] ?? (i === at ? 'current' : undefined)}>
          <button type="button" onClick={() => goTo(i)} aria-current={i === at ? 'step' : undefined} title={s.name}>{i + 1}</button>
        </li>)}
      </ol>
      <button type="button" className={lessonStyles.quiet} onClick={() => complete(false)}>{exitLabel ?? 'Exit'}</button>
    </header>
    <div className={lessonStyles.body}>
      <div className={lessonStyles.split}>
        <section className={lessonStyles.panel} aria-live="polite">
          <span className={lessonStyles.counter}>Structure {at + 1} of {list.length}</span>
          <h2>{species.name} <span className={styles.formula}>{species.formula}</span></h2>
          {!solved && <>
            <p>Complete the Lewis structure. Change bond orders with the bond tools and charges with the charge tool; lone pairs fill in by themselves.</p>
            <p className={lessonStyles.muted}>Every atom needs an octet (hydrogen needs two), with as few charges as possible.</p>
          </>}
          {verdict && <div className={`${lessonStyles.message} ${verdict.verdict === 'right' ? lessonStyles.right : lessonStyles.wrong}`} role="status">
            <p>{verdict.message}</p>
            {'notes' in verdict && verdict.notes.length > 0 && <ul className={styles.notes}>{verdict.notes.map((note) => <li key={note}>{note}</li>)}</ul>}
            {'notes' in verdict && verdict.atoms.length > 0 && <p className={styles.highlighted}>The atoms concerned are highlighted.</p>}
          </div>}
          {verdict?.verdict === 'right' && forms.length > 1 && <p>
            This is one of {forms.length} resonance forms; the real {species.charge ? 'ion' : 'molecule'} is a blend of them.{' '}
            <button type="button" className={styles.link} onClick={() => { const next = (formAt + 1) % forms.length; setFormAt(next); load(lewisKet(species, forms[next])); }}>
              Show form {(formAt + 1) % forms.length + 1}
            </button>
          </p>}
          {hinted && !solved && <p className={lessonStyles.hint}>{species.hint}</p>}
          {finished && <p className={lessonStyles.says}>{right} of {list.length} right without being shown.</p>}
          <div className={lessonStyles.actions}>
            {!solved && <button type="button" className={lessonStyles.primary} onClick={check}>Check</button>}
            {!solved && !hinted && <button type="button" className={lessonStyles.quiet} onClick={() => { setHinted(true); tally.current.hints += 1; }}>Give me a hint</button>}
            {!solved && verdict && <button type="button" className={lessonStyles.quiet} onClick={show}>Show me</button>}
            {!solved && <button type="button" className={lessonStyles.quiet} onClick={() => { load(lewisKet(species)); setVerdict(null); }}>Start again</button>}
            {solved && nextOpen !== undefined && <button type="button" className={lessonStyles.primary} onClick={() => goTo(nextOpen)}>Next</button>}
            {finished && <>
              <button type="button" className={lessonStyles.primary} onClick={() => complete(true)}>Finish</button>
              <button type="button" className={lessonStyles.quiet} onClick={again}>Another round</button>
            </>}
          </div>
        </section>
        <main className={lessonStyles.canvas}>
          <MechanismEditor structServiceProvider={structServiceProvider} staticResourcesUrl="" ket={firstKet.current} capabilities="puzzle-construction" onReady={onReady} />
        </main>
      </div>
    </div>
  </div>;
}
