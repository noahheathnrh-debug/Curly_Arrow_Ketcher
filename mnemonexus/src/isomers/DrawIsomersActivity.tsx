import { useCallback, useMemo, useRef, useState } from 'react';
import { MechanismEditor, type MechanismEditorApi } from 'ketcher-react';
import type { StructServiceProvider } from 'ketcher-core';
import type { PracticeCriterion, PracticeLaunch } from '@mnemonexus/addon-sdk/practice';
import type { ExperienceHostProps } from '../hostContract';
import { loadFitted } from '../fitToView';
import { subscripts } from './cip';
import { checkDrawn, isomersOf, type DrawVerdict } from './drawCheck';
import { EMPTY_KET, rowKet } from './layouts';
import { DRAW_TASKS, type DrawTask } from './species';
import lessonStyles from '../lessons/lessons.module.css';
import lewisStyles from '../lewis/lewis.module.css';
import styles from './isomers.module.css';

/**
 * Draw the isomers (Molecules → Isomers): two formulas a round, a small one then a larger one. The learner draws one
 * isomer at a time and adds it; the checker says whether it is new, one already found drawn another way, or not an
 * isomer of the formula. "Show the rest" draws the missing ones.
 */
const shuffle = <T,>(xs: readonly T[], random: () => number): T[] => {
  const out = [...xs];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
};
export function drawRound(random: () => number): DrawTask[] {
  return [1, 2].map((level) => shuffle(DRAW_TASKS.filter((t) => t.level === level), random)[0]);
}

type Outcome = 'right' | 'shown';
interface Props { host: ExperienceHostProps; practice?: PracticeLaunch; structServiceProvider: StructServiceProvider; exitLabel?: string }

export function DrawIsomersActivity({ host, practice, structServiceProvider, exitLabel }: Props) {
  const startedAt = useRef(Date.now());
  const tally = useRef({ complete: false, share: 0, attempts: 0 });
  const [round, setRound] = useState(0);
  const tasks = useMemo(() => drawRound(Math.random), [round]);
  const isomers = useMemo(() => tasks.map(isomersOf), [tasks]);
  const [at, setAt] = useState(0);
  const [found, setFound] = useState<number[][]>([[], []]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [verdict, setVerdict] = useState<DrawVerdict | null>(null);
  const task = tasks[at], list = isomers[at], have = found[at];
  const api = useRef<MechanismEditorApi | null>(null);

  const load = useCallback((ket: string) => { const ready = api.current; if (ready) void loadFitted(ready, ket); }, []);
  const onReady = (ready: MechanismEditorApi) => {
    api.current = ready;
    ready.ketcher.editor.setOptions(JSON.stringify({ showLonePairs: false }));
  };

  const complete = useCallback((completed: boolean) => {
    const skill = practice && typeof practice.launch.skill === 'string' ? practice.launch.skill : undefined;
    const tag = skill ? { skill } : {};
    const criteria: PracticeCriterion[] = [
      { id: 'isomers.draw.round', label: 'Every isomer of both formulas found without being shown', met: tally.current.complete, weight: 3, ...tag },
      { id: 'isomers.draw.most', label: 'At least four in five of the isomers found', met: tally.current.share >= 0.8, weight: 1, ...tag },
    ];
    host.onComplete({
      completed,
      elapsedSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      ...(practice ? { practice: { version: 1 as const, activityId: practice.activityId, valid: true, criteria, hintsUsed: 0, attempts: tally.current.attempts } } : {}),
    });
  }, [host, practice]);

  const settle = (outcome: Outcome, nextFound: number[][]) => {
    if (outcomes[at]) return;
    const next = [...outcomes];
    next[at] = outcome;
    setOutcomes(next);
    if (next.filter(Boolean).length === tasks.length) {
      const total = isomers.reduce((s, l) => s + l.length, 0), got = nextFound.reduce((s, f) => s + f.length, 0);
      // Only the first round counts towards the result: a second round is practice on new formulas.
      if (round === 0) tally.current = { ...tally.current, complete: next.every((o) => o === 'right'), share: got / total };
    }
  };
  const add = () => {
    const ready = api.current;
    if (!ready || outcomes[at]) return;
    tally.current.attempts += 1;
    const result = checkDrawn(ready.ketcher.editor.struct() as never, list, have);
    setVerdict(result);
    if (result.kind !== 'new') return;
    const nextFound = found.map((f, i) => (i === at ? [...f, result.index] : f));
    setFound(nextFound);
    load(EMPTY_KET);
    if (nextFound[at].length === list.length) settle('right', nextFound);
  };
  const showRest = () => {
    const missing = list.map((_, i) => i).filter((i) => !have.includes(i));
    load(rowKet(missing.map((i) => list[i].smiles), missing.length > 4 ? Math.ceil(missing.length / 2) : 4));
    setVerdict(null);
    settle('shown', found);
  };
  const goTo = (index: number) => { setAt(index); setVerdict(null); load(EMPTY_KET); };
  const again = () => { setRound((r) => r + 1); setFound([[], []]); setOutcomes([]); goTo(0); };

  const done = !!outcomes[at];
  const finished = outcomes.filter(Boolean).length === tasks.length;
  const missing = list.map((_, i) => i).filter((i) => !have.includes(i));

  return <div className={lessonStyles.player}>
    <header className={lessonStyles.bar}>
      <div className={lessonStyles.titles}>
        <span className={lessonStyles.unit}>Molecules · Isomers</span>
        <h1>Draw the isomers</h1>
      </div>
      <ol className={lewisStyles.progress} aria-label="Formulas in this round">
        {tasks.map((t, i) => <li key={`${round}-${t.id}`} data-state={outcomes[i] ?? (i === at ? 'current' : undefined)}>
          <button type="button" onClick={() => goTo(i)} aria-current={i === at ? 'step' : undefined} title={t.formula}>{i + 1}</button>
        </li>)}
      </ol>
      <button type="button" className={lessonStyles.quiet} onClick={() => complete(false)}>{exitLabel ?? 'Exit'}</button>
    </header>
    <div className={lessonStyles.body}>
      <div className={lessonStyles.split}>
        <section className={lessonStyles.panel} aria-live="polite">
          <span className={lessonStyles.counter}>Formula {at + 1} of {tasks.length}</span>
          <h2>Every isomer of {task.formula}</h2>
          <p>There are {list.length}. {task.about}</p>
          {!done && <p className={lessonStyles.muted}>Draw one, then add it. Hydrogens on carbon can be left out; the checker counts them.</p>}
          <p className={styles.tally}><strong>{have.length} of {list.length}</strong> found</p>
          {have.length > 0 && <ol className={styles.found}>{have.map((i) => <li key={i}>{subscripts(list[i].name)}</li>)}</ol>}
          {verdict && <VerdictBox verdict={verdict} names={list.map((x) => subscripts(x.name))} />}
          {outcomes[at] === 'shown' && missing.length > 0 && <div className={`${lessonStyles.message} ${lessonStyles.wrong}`} role="status">
            <p><strong>The {missing.length === 1 ? 'one' : missing.length} still to find {missing.length === 1 ? 'is' : 'are'} drawn on the canvas:</strong></p>
            <ul className={lewisStyles.notes}>{missing.map((i) => <li key={i}>{subscripts(list[i].name)}</li>)}</ul>
          </div>}
          {outcomes[at] === 'right' && <div className={`${lessonStyles.message} ${lessonStyles.right}`} role="status"><p><strong>All {list.length} found.</strong></p></div>}
          <div className={lessonStyles.actions}>
            {!done && <button type="button" className={lessonStyles.primary} onClick={add}>Add this one</button>}
            {!done && <button type="button" className={lessonStyles.quiet} onClick={() => { load(EMPTY_KET); setVerdict(null); }}>Clear</button>}
            {!done && <button type="button" className={lessonStyles.quiet} onClick={showRest}>Show the rest</button>}
            {done && !finished && <button type="button" className={lessonStyles.primary} onClick={() => goTo(tasks.findIndex((_, i) => !outcomes[i]))}>Next formula</button>}
            {finished && <>
              <button type="button" className={lessonStyles.primary} onClick={() => complete(true)}>Finish</button>
              <button type="button" className={lessonStyles.quiet} onClick={again}>Another round</button>
            </>}
          </div>
        </section>
        <main className={lessonStyles.canvas}>
          <MechanismEditor structServiceProvider={structServiceProvider} staticResourcesUrl="" ket={EMPTY_KET} capabilities="puzzle-construction" onReady={onReady} />
        </main>
      </div>
    </div>
  </div>;
}

function VerdictBox({ verdict, names }: { verdict: DrawVerdict; names: string[] }) {
  const [right, text] = ((): [boolean, string] => {
    switch (verdict.kind) {
      case 'new': return [true, `New: ${names[verdict.index]}. The canvas is clear for the next one.`];
      case 'again': return [false, `You have that one already: it is ${names[verdict.index]}, drawn another way. Bending a chain or turning it round does not make a new isomer.`];
      case 'formula': return [false, `That is ${subscripts(verdict.drawn)}, not ${subscripts(verdict.wanted)}. Count the carbons and the other atoms again.`];
      case 'several': return [false, 'Draw one molecule at a time: there is more than one on the canvas.'];
      case 'empty': return [false, 'Draw an isomer first.'];
      case 'unreadable': return [false, verdict.message];
    }
  })();
  return <div className={`${lessonStyles.message} ${right ? lessonStyles.right : lessonStyles.wrong}`} role="status"><p>{text}</p></div>;
}
