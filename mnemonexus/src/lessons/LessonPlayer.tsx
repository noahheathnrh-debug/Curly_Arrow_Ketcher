import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MechanismEditor, type MechanismEditorApi } from 'ketcher-react';
import type { StructServiceProvider } from 'ketcher-core';
import type { PracticeCriterion, PracticeLaunch } from '@mnemonexus/addon-sdk/practice';
import type { ExperienceHostProps } from '../hostContract';
import { MechanismActivity } from '../MechanismActivity';
import type { BuiltLesson } from './kit';
import { checkPrediction, type Prediction } from './predict';
import styles from './lessons.module.css';
import { fitToView, loadFitted } from '../fitToView';
import { freshPuzzles } from '../practice/generate';

/**
 * A lesson in four stages, "watch and do":
 * 1. Watch: each arrow appears in turn with the reason for it, then the result.
 * 2. Your turn: the same steps as puzzles; an arrow that breaks an electron rule is refused as it is drawn.
 * 3. Predict: the learner edits the starting structure into the product, compared as a graph.
 * 4. Practise: new molecules for the same mechanism, from its practice template, each one checked by the same kit.
 */
type Stage = 'watch' | 'try' | 'predict' | 'practise';
const STAGES: { id: Stage; label: string }[] = [
  { id: 'watch', label: 'Watch' }, { id: 'try', label: 'Your turn' }, { id: 'predict', label: 'Predict' }, { id: 'practise', label: 'Practise' },
];

interface Props {
  lesson: BuiltLesson;
  structServiceProvider: StructServiceProvider;
  host: ExperienceHostProps;
  practice?: PracticeLaunch;
  exitLabel?: string;
}

export function LessonPlayer({ lesson, structServiceProvider, host, practice, exitLabel }: Props) {
  const [stage, setStage] = useState<Stage>('watch');
  const [done, setDone] = useState<Set<Stage>>(new Set());
  const startedAt = useRef(Date.now());
  const tried = useRef<{ solved: boolean; clean: boolean }>({ solved: false, clean: false });
  const predicted = useRef<{ right: boolean; first: boolean; attempts: number; shown: boolean }>({ right: false, first: false, attempts: 0, shown: false });
  const finish = (to: Stage) => { setDone((d) => new Set([...d, stage])); setStage(to); };
  const practised = useRef({ solved: false, clean: false });
  const practisePuzzles = useMemo(() => lesson.def.practise ? freshPuzzles(lesson.def.practise.template, lesson.def.practise.count ?? 3, Date.now()) : [],
    [lesson.def.practise]);

  const complete = useCallback((completed: boolean) => {
    const skill = practice && typeof practice.launch.skill === 'string' ? practice.launch.skill : undefined;
    const criteria: PracticeCriterion[] = [
      { id: `${lesson.def.id}.try`, label: 'Your turn: every arrow right', met: tried.current.solved, weight: 3, ...(skill ? { skill } : {}) },
      { id: `${lesson.def.id}.try-clean`, label: 'Your turn: no wrong arrow on the way', met: tried.current.solved && tried.current.clean, weight: 1, ...(skill ? { skill } : {}) },
      { id: `${lesson.def.id}.predict`, label: 'Predict: drew the product', met: predicted.current.right && !predicted.current.shown, weight: 2, ...(skill ? { skill } : {}) },
      { id: `${lesson.def.id}.predict-first`, label: 'Predict: right first time', met: predicted.current.first, weight: 1, ...(skill ? { skill } : {}) },
      ...(practisePuzzles.length ? [{ id: `${lesson.def.id}.practise`, label: 'Practise: new molecules, every arrow right', met: practised.current.solved, weight: 3, ...(skill ? { skill } : {}) }] : []),
    ];
    host.onComplete({
      completed,
      elapsedSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      completedStages: [...done],
      ...(practice ? { practice: { version: 1 as const, activityId: practice.activityId, valid: true, criteria, hintsUsed: 0, attempts: predicted.current.attempts } } : {}),
    });
  }, [host, lesson.def.id, practice, done, practisePuzzles.length]);

  return <div className={styles.player}>
    <header className={styles.bar}>
      <div className={styles.titles}>
        <span className={styles.unit}>{lesson.def.unit}</span>
        <h1>{lesson.def.title}</h1>
      </div>
      <nav className={styles.stages} aria-label="Lesson stages">
        {STAGES.map((s, i) => <button key={s.id} type="button" aria-current={stage === s.id ? 'step' : undefined}
          className={styles.stage} data-done={done.has(s.id) || undefined} onClick={() => setStage(s.id)}>
          <span className={styles.stageNumber}>{done.has(s.id) ? '✓' : i + 1}</span>{s.label}
        </button>)}
      </nav>
      <button type="button" className={styles.quiet} onClick={host.onExit}>{exitLabel ?? 'Exit'}</button>
    </header>
    <div className={styles.body}>
      {stage === 'watch' && <Watch lesson={lesson} structServiceProvider={structServiceProvider} onDone={() => finish('try')} />}
      {stage === 'try' && <MechanismActivity {...host} selectedPuzzles={lesson.puzzles} exitLabel="Back to Watch"
        structServiceProvider={structServiceProvider} staticResourcesUrl=""
        onExit={() => setStage('watch')}
        onComplete={(result) => {
          tried.current = { solved: !!result.completed, clean: !!result.completed && (result.practice?.criteria ?? []).every((c) => c.met) };
          if (result.completed) finish('predict');
        }} />}
      {stage === 'predict' && <Predict lesson={lesson} structServiceProvider={structServiceProvider}
        onResult={(p, attempt, shown) => {
          predicted.current.attempts = attempt;
          if (shown) predicted.current.shown = true;
          if (p.verdict === 'right') { predicted.current.right = true; if (attempt === 1) predicted.current.first = true; }
        }}
        onDone={() => finish('practise')} />}
      {stage === 'practise' && practisePuzzles.length > 0 && <MechanismActivity {...host} selectedPuzzles={practisePuzzles} exitLabel="Finish later"
        structServiceProvider={structServiceProvider} staticResourcesUrl=""
        onExit={() => complete(false)}
        onComplete={(result) => {
          practised.current = { solved: !!result.completed, clean: !!result.completed && (result.practice?.criteria ?? []).every((c) => c.met) };
          setDone((d) => new Set([...d, 'practise']));
          complete(!!result.completed);
        }} />}
      {stage === 'practise' && !practisePuzzles.length && <section className={styles.practise}>
        <h2>Practise</h2>
        <p>{lesson.def.summary}</p>
        <p className={styles.muted}>More puzzles for this mechanism are on the way: each one a new molecule, checked by the same rules.</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} onClick={() => complete(true)}>Finish the lesson</button>
          <button type="button" className={styles.quiet} onClick={() => setStage('watch')}>Watch again</button>
        </div>
      </section>}
    </div>
  </div>;
}

/** A document to show; `n` changes to load the same one again (Start again). */
interface Doc { ket: string; n: number }

/** Load a document into the editor once it is ready, and again whenever the document changes. */
function useDocument(doc: Doc) {
  const api = useRef<MechanismEditorApi | null>(null);
  const loaded = useRef<Doc | null>(null);
  useEffect(() => {
    const ready = api.current;
    if (ready && loaded.current !== doc) { loaded.current = doc; void loadFitted(ready, doc.ket); }
  }, [doc]);
  const onReady = (ready: MechanismEditorApi) => {
    api.current = ready;
    ready.ketcher.editor.setOptions(JSON.stringify({ showLonePairs: true }));
    if (loaded.current !== doc && (doc.n || doc.ket !== initial.current)) { loaded.current = doc; void loadFitted(ready, doc.ket); }
    else { loaded.current = doc; requestAnimationFrame(() => fitToView(ready)); }
  };
  const initial = useRef(doc.ket);
  return { api, onReady };
}

function Watch({ lesson, structServiceProvider, onDone }: { lesson: BuiltLesson; structServiceProvider: StructServiceProvider; onDone: () => void }) {
  const [at, setAt] = useState(0);
  const frame = lesson.frames[at];
  const last = at === lesson.frames.length - 1;
  const doc = useMemo(() => ({ ket: frame.ket, n: 0 }), [frame.ket]);
  const { onReady } = useDocument(doc);
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') setAt((i) => Math.min(lesson.frames.length - 1, i + 1));
      if (event.key === 'ArrowLeft') setAt((i) => Math.max(0, i - 1));
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [lesson.frames.length]);
  return <div className={styles.split}>
    <aside className={styles.panel}>
      <p className={styles.counter}>{at + 1} of {lesson.frames.length}</p>
      <h2>{frame.title}</h2>
      <p className={styles.says} aria-live="polite">{frame.says}</p>
      <div className={styles.actions}>
        {last ? <button type="button" className={styles.primary} onClick={onDone}>Your turn</button>
          : <button type="button" className={styles.primary} onClick={() => setAt(at + 1)}>{at === 0 ? 'Show the first arrow' : 'Next'}</button>}
        <button type="button" className={styles.quiet} disabled={at === 0} onClick={() => setAt(at - 1)}>Back</button>
      </div>
    </aside>
    <main className={styles.canvas}>
      <MechanismEditor structServiceProvider={structServiceProvider} staticResourcesUrl="" ket={lesson.frames[0].ket} capabilities="review" onReady={onReady} />
    </main>
  </div>;
}

function Predict({ lesson, structServiceProvider, onResult, onDone }: {
  lesson: BuiltLesson; structServiceProvider: StructServiceProvider;
  onResult: (p: Prediction, attempt: number, shown: boolean) => void; onDone: () => void;
}) {
  const [doc, setDoc] = useState<Doc>({ ket: lesson.predict.ket, n: 0 });
  const [result, setResult] = useState<Prediction | null>(null);
  const [hints, setHints] = useState(0);
  const attempts = useRef(0);
  const { api, onReady } = useDocument(doc);
  const check = () => {
    if (!api.current) return;
    attempts.current += 1;
    const p = checkPrediction(api.current.ketcher.editor.struct(), lesson.predict.expected);
    setResult(p);
    onResult(p, attempts.current, false);
  };
  return <div className={styles.split}>
    <aside className={styles.panel}>
      <h2>Predict</h2>
      <p>{lesson.predict.prompt}</p>
      <p className={styles.muted}>Change bonds with the bond tools, and charges with the charge tool. Where you put things does not matter, only what is bonded to what.</p>
      {result && <p className={`${styles.message} ${result.verdict === 'right' ? styles.right : styles.wrong}`} role="status">{result.message}</p>}
      {lesson.predict.hints.slice(0, hints).map((hint) => <p key={hint} className={styles.hint}>{hint}</p>)}
      <div className={styles.actions}>
        {result?.verdict === 'right' ? <button type="button" className={styles.primary} onClick={onDone}>Next: practise</button>
          : <button type="button" className={styles.primary} onClick={check}>Check</button>}
        {result?.verdict !== 'right' && hints < lesson.predict.hints.length && <button type="button" className={styles.quiet} onClick={() => setHints(hints + 1)}>Give me a hint</button>}
        {result && result.verdict !== 'right' && <button type="button" className={styles.quiet} onClick={() => {
          setDoc({ ket: lesson.predict.answerKet, n: doc.n + 1 });
          const shown: Prediction = { verdict: 'right', message: 'Here is the product. Compare it with what you drew, then go on.' };
          setResult(shown);
          onResult({ verdict: 'wrong', message: '', missing: [], unexpected: [] }, attempts.current, true);
        }}>Show me</button>}
        <button type="button" className={styles.quiet} onClick={() => { setDoc({ ket: lesson.predict.ket, n: doc.n + 1 }); setResult(null); }}>Start again</button>
      </div>
    </aside>
    <main className={styles.canvas}>
      <MechanismEditor structServiceProvider={structServiceProvider} staticResourcesUrl="" ket={lesson.predict.ket} capabilities="puzzle-construction" onReady={onReady} />
    </main>
  </div>;
}
